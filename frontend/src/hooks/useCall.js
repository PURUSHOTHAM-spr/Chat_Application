import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";
import { ICE_SERVERS, MAX_VIDEO_KBPS } from "../constants";

/**
 * WebRTC Call Controller v3 — Production-grade implementation.
 *
 * Key techniques:
 * 1. Uses event.streams[0] in ontrack with addTrack fallback
 * 2. ICE candidate buffering until remoteDescription is set
 * 3. Stores SDP offer during ringing for immediate use in acceptCall
 * 4. Stream version counter forces React re-renders on new tracks
 * 5. Proper cleanup prevents memory leaks and duplicate listeners
 * 6. TURN server support for cross-network connectivity
 */

const DEFAULT_ICE = {
  iceServers: ICE_SERVERS,
};

const createController = () => {
  const getSock = () => getSocket();
  let socketAttached = false;

  // ── Core refs ──
  const pcRef = { current: null };
  const localStreamRef = { current: null };
  const remoteStreamRef = { current: null };

  // ── ICE candidate buffer ──
  let pendingCandidates = [];

  // ── Call state ──
  let status = "idle";
  let isMuted = false;
  let cameraOff = false;
  let callMeta = null;
  let remotePeerId = null;
  let callType = "audio";
  let callStartTime = null;
  let callDuration = 0;
  let durationInterval = null;
  let callerInfo = null;
  let streamVersion = 0;
  let iceRestartCount = 0;
  const MAX_ICE_RESTARTS = 2;

  const listeners = new Set();

  const emitChange = () => {
    const snapshot = {
      status, isMuted, cameraOff, callMeta,
      localStreamRef, remoteStreamRef,
      remotePeerId, callType, callDuration, callerInfo,
      streamVersion,
    };
    for (const fn of listeners) fn(snapshot);
  };

  // ── Duration timer ──
  const startDurationTimer = () => {
    if (durationInterval) return;
    callStartTime = Date.now();
    callDuration = 0;
    durationInterval = setInterval(() => {
      callDuration = Math.floor((Date.now() - callStartTime) / 1000);
      emitChange();
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationInterval) { clearInterval(durationInterval); durationInterval = null; }
    callStartTime = null;
    callDuration = 0;
  };

  // ── Flush buffered ICE candidates ──
  const flushPendingCandidates = async () => {
    if (!pcRef.current?.remoteDescription) return;
    const toFlush = [...pendingCandidates];
    pendingCandidates = [];
    for (const c of toFlush) {
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); }
      catch (e) { console.warn("Flush ICE failed:", e); }
    }
  };

  // ── Cleanup ──
  const cleanupPeer = () => {
    stopDurationTimer();
    status = "ended";
    try { pcRef.current?.close(); } catch (_) {}
    pcRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    remotePeerId = null;
    callMeta = null;
    callerInfo = null;
    isMuted = false;
    cameraOff = false;
    pendingCandidates = [];
    iceRestartCount = 0;
    emitChange();
    setTimeout(() => { if (status === "ended") { status = "idle"; emitChange(); } }, 2000);
  };

  // ── Get user media ──
  const prepareLocalMedia = async (wantVideo) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: wantVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
      });
      localStreamRef.current = stream;
      streamVersion++;
      emitChange();
      return stream;
    } catch (err) {
      console.error("getUserMedia failed:", err);
      throw new Error(err.name === "NotAllowedError"
        ? "Camera/microphone permission denied. Please allow access."
        : "Could not access camera/microphone");
    }
  };

  // ── Apply video bitrate cap ──
  const applyBitrateCap = async () => {
    if (!MAX_VIDEO_KBPS || !pcRef.current) return;
    try {
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender?.getParameters) {
        const params = sender.getParameters();
        params.encodings = params.encodings?.length ? params.encodings : [{}];
        params.encodings[0].maxBitrate = MAX_VIDEO_KBPS * 1000;
        await sender.setParameters(params);
      }
    } catch (e) { console.warn("Bitrate cap failed:", e); }
  };

  // ── Create RTCPeerConnection ──
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(DEFAULT_ICE);

    // ─── ontrack: THE critical handler for receiving remote media ───
    // Strategy: Use event.streams[0] if available (most reliable, preserves
    // the original stream ID from the sender). Fallback to manually adding
    // the track to our own MediaStream.
    pc.ontrack = (event) => {
      console.log("📹 ontrack fired:", event.track.kind, "streams:", event.streams.length);

      let stream;
      if (event.streams && event.streams.length > 0) {
        // Best case: browser provides the remote stream directly
        stream = event.streams[0];
      } else {
        // Fallback: create/reuse our own stream and add the track
        stream = remoteStreamRef.current || new MediaStream();
        if (!stream.getTracks().find((t) => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }
      }

      remoteStreamRef.current = stream;
      streamVersion++;
      emitChange();
    };

    pc.onicecandidate = (evt) => {
      if (evt.candidate && remotePeerId) {
        getSock()?.emit("call:ice-candidate", { to: remotePeerId, candidate: evt.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      console.log("🧊 ICE state:", s);
      if ((s === "connected" || s === "completed") && status !== "connected") {
        status = "connected";
        startDurationTimer();
        emitChange();
      } else if (s === "failed") {
        iceRestartCount++;
        if (iceRestartCount <= MAX_ICE_RESTARTS) {
          console.log(`🔄 ICE restart attempt ${iceRestartCount}/${MAX_ICE_RESTARTS}`);
          try { pc.restartIce(); } catch (_) {}
        } else {
          console.error("❌ ICE failed after max retries — ending call");
          cleanupPeer();
        }
      } else if (s === "closed" && (status === "connected" || status === "connecting")) {
        cleanupPeer();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("🔗 Connection state:", pc.connectionState);
    };

    pcRef.current = pc;
    return pc;
  };

  // ── Socket handlers (attached once) ──
  const attachSocketHandlers = () => {
    if (socketAttached) return;
    const socket = getSock();
    if (!socket) return;

    ["call:offer", "call:answer", "call:ice-candidate", "call:ring",
     "call:hangup", "call:missed", "call:reject"].forEach((e) => socket.off(e));

    socket.on("call:offer", ({ from, offer, meta }) => {
      if (status === "connected" || status === "connecting") {
        socket.emit("call:hangup", { to: from, reason: "busy" });
        return;
      }
      callMeta = { from, offer, meta };
      callType = meta?.type || "audio";
      remotePeerId = from;
      status = "ringing";
      emitChange();
    });

    socket.on("call:answer", async ({ from, answer }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingCandidates();
        if (status !== "connected") { status = "connected"; startDurationTimer(); emitChange(); }
      } catch (e) { console.error("setRemoteDescription(answer) failed:", e); }
    });

    socket.on("call:ice-candidate", async ({ from, candidate }) => {
      if (!candidate) return;
      if (!pcRef.current?.remoteDescription) {
        pendingCandidates.push(candidate);
        return;
      }
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.warn("addIceCandidate failed:", e); }
    });

    socket.on("call:ring", () => {});
    socket.on("call:hangup", () => cleanupPeer());
    socket.on("call:reject", () => cleanupPeer());
    socket.on("call:missed", ({ from, meta }) => console.log("Missed call:", from));

    socketAttached = true;
  };

  // ── Start call (CALLER) ──
  const startCall = async ({ toUserId, type = "video", userInfo = null }) => {
    if (status !== "idle" && status !== "ended") throw new Error("Already in a call");

    attachSocketHandlers();
    const socket = getSock();
    if (!socket) throw new Error("Socket not connected");

    callType = type;
    remotePeerId = toUserId;
    callerInfo = userInfo;
    status = "connecting";
    isMuted = false;
    cameraOff = false;
    pendingCandidates = [];
    emitChange();

    const pc = createPeerConnection();
    const localStream = await prepareLocalMedia(type === "video");
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    if (type === "video") await applyBitrateCap();

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: type === "video",
    });
    await pc.setLocalDescription(offer);

    socket.emit("call:ring", { to: toUserId, callId: "call_" + Date.now(), meta: { type } });
    socket.emit("call:offer", { to: toUserId, offer: pc.localDescription, meta: { type } });

    return { localStream: localStreamRef.current, remoteStream: remoteStreamRef.current };
  };

  // ── Accept call (CALLEE) ──
  const acceptCall = async ({ fromUserId, type = "video" }) => {
    attachSocketHandlers();
    const socket = getSock();
    if (!socket) throw new Error("Socket not connected");

    const storedOffer = callMeta?.offer;
    if (!storedOffer) throw new Error("No offer available");

    callType = type;
    remotePeerId = fromUserId;
    status = "connecting";
    isMuted = false;
    cameraOff = false;
    pendingCandidates = [];
    emitChange();

    const pc = createPeerConnection();
    const localStream = await prepareLocalMedia(type === "video");
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // Set remote description FIRST so ontrack can fire for the caller's tracks
    await pc.setRemoteDescription(new RTCSessionDescription(storedOffer));
    await flushPendingCandidates();

    if (type === "video") await applyBitrateCap();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("call:answer", { to: fromUserId, answer: pc.localDescription });

    status = "connected";
    startDurationTimer();
    emitChange();

    return { localStream: localStreamRef.current, remoteStream: remoteStreamRef.current };
  };

  const rejectCall = ({ toUserId } = {}) => {
    const target = toUserId || remotePeerId || callMeta?.from;
    const s = getSock();
    if (target && s) {
      s.emit("call:reject", { to: target, reason: "rejected" });
      s.emit("call:hangup", { to: target, reason: "rejected" });
    }
    cleanupPeer();
  };

  const endCall = () => {
    const target = remotePeerId || callMeta?.from;
    const s = getSock();
    if (target && s) s.emit("call:hangup", { to: target, reason: "ended" });
    cleanupPeer();
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    isMuted = !isMuted;
    emitChange();
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    cameraOff = !cameraOff;
    emitChange();
  };

  return {
    getState: () => ({
      status, isMuted, cameraOff, callMeta,
      localStreamRef, remoteStreamRef,
      remotePeerId, callType, callDuration, callerInfo, streamVersion,
    }),
    startCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera,
    subscribe: (fn) => {
      listeners.add(fn);
      fn({
        status, isMuted, cameraOff, callMeta,
        localStreamRef, remoteStreamRef,
        remotePeerId, callType, callDuration, callerInfo, streamVersion,
      });
      return () => listeners.delete(fn);
    },
  };
};

const controller = createController();

export default function useCall() {
  const [state, setState] = useState(controller.getState());
  useEffect(() => {
    const unsub = controller.subscribe((s) => setState({ ...s }));
    return () => unsub();
  }, []);

  return {
    startCall: controller.startCall,
    acceptCall: controller.acceptCall,
    rejectCall: controller.rejectCall,
    endCall: controller.endCall,
    toggleMute: controller.toggleMute,
    toggleCamera: controller.toggleCamera,
    ...state,
  };
}
