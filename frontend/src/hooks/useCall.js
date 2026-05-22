import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";
import { ICE_SERVERS, MAX_VIDEO_KBPS, fetchIceServers } from "../constants";

/**
 * WebRTC Call Controller v3 — Production-grade implementation.
 *
 * Key techniques:
 * 1. Uses event.streams[0] in ontrack with addTrack fallback
 * 2. ICE candidate buffering until remoteDescription is set
 * 3. Stores SDP offer during ringing for immediate use in acceptCall
 * 4. Stream version counter forces React re-renders on new tracks
 * 5. Proper cleanup prevents memory leaks and duplicate listeners
 * 6. Dynamic TURN server credentials for cross-network connectivity
 */

const createController = () => {
  const getSock = () => getSocket();
  let socketAttached = null;

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
  let isCaller = false;
  let isRestartingIce = false;

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
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    remotePeerId = null;
    callMeta = null;
    callerInfo = null;
    isMuted = false;
    cameraOff = false;
    pendingCandidates = [];
    iceRestartCount = 0;
    isCaller = false;
    isRestartingIce = false;
    emitChange();
    setTimeout(() => { if (status === "ended") { status = "idle"; emitChange(); } }, 2000);
  };

  // ── Get user media ──
  const prepareLocalMedia = async (wantVideo) => {
    try {
      const constraints = {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: wantVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
      };
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        if (wantVideo) {
          console.warn("Retrying getUserMedia with simplified video constraints...", firstErr);
          const backupConstraints = {
            audio: true,
            video: true,
          };
          stream = await navigator.mediaDevices.getUserMedia(backupConstraints);
        } else {
          throw firstErr;
        }
      }
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

  // ── Trigger ICE restart ──
  const triggerIceRestart = async () => {
    if (!pcRef.current || isRestartingIce) return;
    const pc = pcRef.current;
    
    isRestartingIce = true;
    iceRestartCount++;
    if (iceRestartCount > MAX_ICE_RESTARTS) {
      console.error("❌ Connection failed after max ICE restarts — ending call");
      isRestartingIce = false;
      cleanupPeer();
      return;
    }

    console.log(`🔄 Initiating ICE restart attempt ${iceRestartCount}/${MAX_ICE_RESTARTS}...`);
    try {
      pc.restartIce();
      if (isCaller) {
        console.log("🔄 We are the caller. Generating and sending new offer with iceRestart: true...");
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        getSock()?.emit("call:offer", {
          to: remotePeerId,
          offer: pc.localDescription,
          meta: { type: callType, isRestart: true }
        });
      } else {
        console.log("🔄 We are the callee. Waiting for caller to send new offer...");
      }
      
      // Debounce resetting the restarting flag to avoid redundant restarts in rapid succession
      setTimeout(() => {
        isRestartingIce = false;
      }, 4000);
    } catch (err) {
      console.error("❌ ICE restart initiation failed:", err);
      isRestartingIce = false;
      cleanupPeer();
    }
  };

  // ── Create RTCPeerConnection ──
  const createPeerConnection = async () => {
    // Fetch dynamic TURN credentials for cross-network connectivity
    const iceServers = await fetchIceServers();
    console.log("🔧 Creating PeerConnection with", iceServers.length, "ICE servers");
    const pc = new RTCPeerConnection({ iceServers });

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
      if (evt.candidate) {
        const candidateStr = evt.candidate.candidate || "";
        let type = "unknown";
        if (candidateStr.includes("typ host")) type = "host";
        else if (candidateStr.includes("typ srflx")) type = "srflx";
        else if (candidateStr.includes("typ relay")) type = "relay";
        else if (candidateStr.includes("typ prflx")) type = "prflx";

        console.log(`📤 Outgoing ICE Candidate (${type}):`, candidateStr);
        if (remotePeerId) {
          getSock()?.emit("call:ice-candidate", { to: remotePeerId, candidate: evt.candidate });
        }
      } else {
        console.log("📤 ICE candidate gathering complete");
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
        triggerIceRestart();
      } else if (s === "closed" && (status === "connected" || status === "connecting")) {
        cleanupPeer();
      }
    };

    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      console.log("🔗 Connection state:", cs);
      if (cs === "failed") {
        triggerIceRestart();
      } else if (cs === "closed") {
        cleanupPeer();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // ── Socket handlers (attached once per socket instance) ──
  const attachSocketHandlers = () => {
    const socket = getSock();
    if (!socket) return;
    if (socketAttached === socket) return;

    // Clean up older socket instance listeners if we are swapping
    if (socketAttached) {
      try {
        ["call:offer", "call:answer", "call:ice-candidate", "call:ring",
         "call:hangup", "call:missed", "call:reject"].forEach((e) => socketAttached.off(e));
      } catch (err) {
        console.warn("Error cleaning up old socket listeners:", err);
      }
    }

    console.log("🔌 Attaching call handlers to socket:", socket.id);

    socket.on("call:offer", async ({ from, offer, meta }) => {
      console.log(`📞 OFFER RECEIVED from ${from} (type: ${meta?.type || "unknown"}, isRestart: ${!!meta?.isRestart})`);
      
      // If we are already connected to this user and this is a renegotiation or ICE restart offer
      if ((status === "connected" || status === "connecting") && remotePeerId === from) {
        console.log(`🔄 Renegotiation/ICE restart offer received from current peer ${from}`);
        if (!pcRef.current) return;
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          await flushPendingCandidates();
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socket.emit("call:answer", { to: from, answer: pcRef.current.localDescription });
          console.log("✅ Renegotiation/ICE restart answer sent");
        } catch (e) {
          console.error("Renegotiation failed:", e);
        }
        return;
      }

      if (status === "connected" || status === "connecting") {
        console.log(`📞 Rejecting offer — already in call (status: ${status})`);
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
      console.log(`✅ ANSWER RECEIVED from ${from}`);
      if (!pcRef.current) { console.warn("⚠️ No peer connection when answer arrived"); return; }
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("✅ Remote description set from answer");
        await flushPendingCandidates();
        if (status !== "connected") { status = "connected"; startDurationTimer(); emitChange(); }
      } catch (e) { console.error("setRemoteDescription(answer) failed:", e); }
    });

    socket.on("call:ice-candidate", async ({ from, candidate }) => {
      if (!candidate) return;
      const candidateStr = candidate.candidate || "";
      let type = "unknown";
      if (candidateStr.includes("typ host")) type = "host";
      else if (candidateStr.includes("typ srflx")) type = "srflx";
      else if (candidateStr.includes("typ relay")) type = "relay";
      else if (candidateStr.includes("typ prflx")) type = "prflx";

      console.log(`📥 Incoming ICE Candidate (${type}) from ${from}`);

      if (!pcRef.current?.remoteDescription) {
        console.log(`🧊 Buffering ICE candidate (${type}) (no remote description yet)`);
        pendingCandidates.push(candidate);
        return;
      }
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`✅ Added ICE candidate (${type})`);
      } catch (e) {
        console.warn(`❌ Failed to add ICE candidate (${type}):`, e);
      }
    });

    socket.on("call:ring", () => {});
    socket.on("call:hangup", () => cleanupPeer());
    socket.on("call:reject", () => cleanupPeer());
    socket.on("call:missed", ({ from, meta }) => console.log("Missed call:", from));

    socketAttached = socket;
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
    isCaller = true;
    emitChange();

    const pc = await createPeerConnection();
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
    isCaller = false;
    emitChange();

    const pc = await createPeerConnection();
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
    attachSocketHandlers,
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
    controller.attachSocketHandlers();

    const interval = setInterval(() => {
      controller.attachSocketHandlers();
    }, 2000);

    const unsub = controller.subscribe((s) => setState({ ...s }));
    return () => {
      unsub();
      clearInterval(interval);
    };
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
