import { useEffect, useState, useCallback } from "react";
import { getSocket } from "../lib/socket";
import { ICE_SERVERS, MAX_VIDEO_KBPS } from "../constants";

/**
 * WebRTC Call Controller — singleton that manages the entire call lifecycle.
 *
 * Fixes applied:
 * 1. Stores the SDP offer during the ringing phase so acceptCall can use it
 *    directly instead of waiting for a re-emitted offer that never comes.
 * 2. Tracks remotePeerId so endCall/hangup always notifies the correct peer.
 * 3. Consolidates ICE candidate handling inside attachSocketHandlers to prevent
 *    duplicate listeners from startCall/acceptCall.
 * 4. Adds call duration timer, call type tracking, and caller info for the UI.
 * 5. Handles reconnect scenarios and prevents memory leaks.
 */

const DEFAULT_ICE = { iceServers: ICE_SERVERS };

const createController = () => {
  const getSock = () => getSocket();
  let socketAttached = false;

  // ── Peer connection & streams ──
  const pcRef = { current: null };
  const localStreamRef = { current: null };
  const remoteStreamRef = { current: null };

  // ── Call state ──
  let status = "idle"; // idle | ringing | connecting | connected | ended
  let isMuted = false;
  let cameraOff = false;
  let callMeta = null; // { from, offer, meta: { type } }
  let remotePeerId = null;
  let callType = "audio"; // "audio" | "video"
  let callStartTime = null;
  let callDuration = 0;
  let durationInterval = null;
  let callerInfo = null; // { _id, fullName, avatar }

  const listeners = new Set();

  // ── Notify all React subscribers ──
  const emitChange = () => {
    const snapshot = {
      status,
      isMuted,
      cameraOff,
      callMeta,
      localStreamRef,
      remoteStreamRef,
      remotePeerId,
      callType,
      callDuration,
      callerInfo,
    };
    for (const fn of listeners) fn(snapshot);
  };

  // ── Duration timer ──
  const startDurationTimer = () => {
    callStartTime = Date.now();
    callDuration = 0;
    durationInterval = setInterval(() => {
      callDuration = Math.floor((Date.now() - callStartTime) / 1000);
      emitChange();
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
    callStartTime = null;
    callDuration = 0;
  };

  // ── Cleanup ──
  const cleanupPeer = () => {
    stopDurationTimer();
    status = "ended";
    try {
      pcRef.current?.close();
    } catch (_) {}
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
    emitChange();

    // Reset to idle after a brief delay so UI can show "ended" state
    setTimeout(() => {
      if (status === "ended") {
        status = "idle";
        emitChange();
      }
    }, 2000);
  };

  // ── Media ──
  const prepareLocalMedia = async (wantVideo) => {
    const constraints = { audio: true, video: wantVideo };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (isMuted) stream.getAudioTracks().forEach((t) => (t.enabled = false));
      if (cameraOff) stream.getVideoTracks().forEach((t) => (t.enabled = false));
      emitChange();
      return stream;
    } catch (err) {
      console.error("Failed to get user media:", err);
      throw new Error(
        err.name === "NotAllowedError"
          ? "Camera/microphone permission denied"
          : "Could not access camera/microphone"
      );
    }
  };

  // ── Apply video bitrate cap ──
  const applyBitrateCap = async () => {
    if (!MAX_VIDEO_KBPS || !pcRef.current) return;
    try {
      const senders = pcRef.current.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === "video");
      if (videoSender?.getParameters) {
        const params = videoSender.getParameters();
        params.encodings =
          params.encodings?.length ? params.encodings : [{}];
        params.encodings[0].maxBitrate = MAX_VIDEO_KBPS * 1000;
        await videoSender.setParameters(params);
      }
    } catch (e) {
      console.warn("Failed to set max video bitrate", e);
    }
  };

  // ── Create peer connection ──
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(DEFAULT_ICE);
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    pc.ontrack = (evt) => {
      evt.streams[0]?.getTracks().forEach((t) => {
        if (!remoteStream.getTracks().find((rt) => rt.id === t.id)) {
          remoteStream.addTrack(t);
        }
      });
      emitChange();
    };

    pc.onicecandidate = (evt) => {
      if (evt.candidate && remotePeerId) {
        const socket = getSock();
        socket?.emit("call:ice-candidate", {
          to: remotePeerId,
          candidate: evt.candidate,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === "connected" || state === "completed") {
        if (status !== "connected") {
          status = "connected";
          startDurationTimer();
          emitChange();
        }
      } else if (state === "failed" || state === "disconnected") {
        // Try to restart ICE on failure
        if (state === "failed") {
          try {
            pc.restartIce();
          } catch (_) {}
        }
      } else if (state === "closed") {
        if (status === "connected" || status === "connecting") {
          cleanupPeer();
        }
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // ── Socket handlers (attached once) ──
  const attachSocketHandlers = () => {
    if (socketAttached) return;
    const socket = getSock();
    if (!socket) return;

    // Remove any stale listeners first
    socket.off("call:offer");
    socket.off("call:answer");
    socket.off("call:ice-candidate");
    socket.off("call:ring");
    socket.off("call:hangup");
    socket.off("call:missed");
    socket.off("call:reject");

    // ── Incoming offer (sets ringing state and stores the SDP offer) ──
    socket.on("call:offer", ({ from, offer, meta }) => {
      // If already in a call, reject the new one
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

    // ── Answer from callee ──
    socket.on("call:answer", async ({ from, answer }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        status = "connected";
        startDurationTimer();
        emitChange();
      } catch (e) {
        console.error("Failed to set remote description (answer):", e);
      }
    });

    // ── ICE candidates (bidirectional) ──
    socket.on("call:ice-candidate", async ({ from, candidate }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("Failed to add ICE candidate:", e);
      }
    });

    // ── Ringing notification ──
    socket.on("call:ring", ({ from, callId, meta }) => {
      // Already handled by call:offer — ring is just a notification
    });

    // ── Hangup ──
    socket.on("call:hangup", ({ from, reason }) => {
      cleanupPeer();
    });

    // ── Reject ──
    socket.on("call:reject", ({ from, reason }) => {
      cleanupPeer();
    });

    // ── Missed call ──
    socket.on("call:missed", ({ from, meta }) => {
      console.log("Missed call from", from, meta);
    });

    socketAttached = true;
  };

  // ── Start outgoing call ──
  const startCall = async ({ toUserId, type = "video", userInfo = null }) => {
    if (status !== "idle" && status !== "ended") {
      throw new Error("Already in a call");
    }

    attachSocketHandlers();
    const socket = getSock();
    if (!socket) throw new Error("Socket not connected");

    callType = type;
    remotePeerId = toUserId;
    callerInfo = userInfo;
    status = "connecting";
    isMuted = false;
    cameraOff = false;
    emitChange();

    const pc = createPeerConnection();
    const localStream = await prepareLocalMedia(type === "video");
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    if (type === "video") await applyBitrateCap();

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send ring and offer to callee
    socket.emit("call:ring", {
      to: toUserId,
      callId: "call_" + Date.now(),
      meta: { type },
    });
    socket.emit("call:offer", {
      to: toUserId,
      offer: pc.localDescription,
      meta: { type },
    });

    return { localStream: localStreamRef.current, remoteStream: remoteStreamRef.current };
  };

  // ── Accept incoming call ──
  const acceptCall = async ({ fromUserId, type = "video" }) => {
    attachSocketHandlers();
    const socket = getSock();
    if (!socket) throw new Error("Socket not connected");

    // CRITICAL FIX: Use the stored offer from callMeta instead of waiting
    // for a new call:offer event that will never come.
    const storedOffer = callMeta?.offer;
    if (!storedOffer) {
      throw new Error("No offer available to accept");
    }

    callType = type;
    remotePeerId = fromUserId;
    status = "connecting";
    isMuted = false;
    cameraOff = false;
    emitChange();

    const pc = createPeerConnection();
    const localStream = await prepareLocalMedia(type === "video");
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // Set the remote offer that was stored during the ringing phase
    await pc.setRemoteDescription(new RTCSessionDescription(storedOffer));

    if (type === "video") await applyBitrateCap();

    // Create and send answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("call:answer", {
      to: fromUserId,
      answer: pc.localDescription,
    });

    status = "connected";
    startDurationTimer();
    emitChange();

    return { localStream: localStreamRef.current, remoteStream: remoteStreamRef.current };
  };

  // ── Reject incoming call ──
  const rejectCall = ({ toUserId } = {}) => {
    const target = toUserId || remotePeerId || callMeta?.from;
    const s = getSock();
    if (target && s) {
      s.emit("call:reject", { to: target, reason: "rejected" });
      s.emit("call:hangup", { to: target, reason: "rejected" });
    }
    cleanupPeer();
  };

  // ── End active call ──
  const endCall = () => {
    const target = remotePeerId || callMeta?.from;
    const s = getSock();
    if (target && s) {
      s.emit("call:hangup", { to: target, reason: "ended" });
    }
    cleanupPeer();
  };

  // ── Toggle mute ──
  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    isMuted = !isMuted;
    emitChange();
  };

  // ── Toggle camera ──
  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    cameraOff = !cameraOff;
    emitChange();
  };

  return {
    getState: () => ({
      status,
      isMuted,
      cameraOff,
      callMeta,
      localStreamRef,
      remoteStreamRef,
      remotePeerId,
      callType,
      callDuration,
      callerInfo,
    }),
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    subscribe: (fn) => {
      listeners.add(fn);
      fn({
        status,
        isMuted,
        cameraOff,
        callMeta,
        localStreamRef,
        remoteStreamRef,
        remotePeerId,
        callType,
        callDuration,
        callerInfo,
      });
      return () => listeners.delete(fn);
    },
  };
};

// Singleton instance
const controller = createController();

/**
 * React hook that exposes the call controller state and actions.
 * All components using this hook share the same underlying controller.
 */
export default function useCall() {
  const [state, setState] = useState(controller.getState());

  useEffect(() => {
    const unsub = controller.subscribe((s) => setState({ ...s }));
    return () => unsub();
  }, []);

  return {
    // Actions
    startCall: controller.startCall,
    acceptCall: controller.acceptCall,
    rejectCall: controller.rejectCall,
    endCall: controller.endCall,
    toggleMute: controller.toggleMute,
    toggleCamera: controller.toggleCamera,
    // State
    status: state.status,
    isMuted: state.isMuted,
    cameraOff: state.cameraOff,
    localStreamRef: state.localStreamRef,
    remoteStreamRef: state.remoteStreamRef,
    callMeta: state.callMeta,
    remotePeerId: state.remotePeerId,
    callType: state.callType,
    callDuration: state.callDuration,
    callerInfo: state.callerInfo,
  };
}
