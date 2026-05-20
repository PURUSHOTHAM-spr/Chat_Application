import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";
import { ICE_SERVERS, MAX_VIDEO_KBPS } from "../constants";

// Use configurable ICE servers (STUN/TURN). Default falls back to public STUN in constants.
const DEFAULT_ICE = { iceServers: ICE_SERVERS };

// Singleton call controller to avoid duplicate listeners and memory leaks.
const createController = () => {
  // Do not capture socket at module initialization — fetch it lazily
  const getSock = () => getSocket();
  let socketAttached = false;
  const pcRef = { current: null };
  const localStreamRef = { current: null };
  const remoteStreamRef = { current: null };
  let status = "idle";
  let isMuted = false;
  let cameraOff = false;
  let callMeta = null;

  const listeners = new Set();

  const emitChange = () => {
    for (const fn of listeners) fn({ status, isMuted, cameraOff, callMeta, localStreamRef, remoteStreamRef });
  };

  const cleanupPeer = () => {
    status = "ended";
    try {
      pcRef.current?.close();
    } catch (e) {}
    pcRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    // Remove socket listeners if socket exists
    try {
      const s = getSock();
      if (s) {
        s.off("call:offer");
        s.off("call:answer");
        s.off("call:ice-candidate");
        s.off("call:ring");
        s.off("call:hangup");
        s.off("call:missed");
      }
    } catch (e) {}
    emitChange();
  };

  const prepareLocalMedia = async (wantVideo) => {
    const constraints = { audio: true, video: wantVideo };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    if (isMuted) stream.getAudioTracks().forEach((t) => (t.enabled = false));
    if (cameraOff) stream.getVideoTracks().forEach((t) => (t.enabled = false));
    emitChange();
    return stream;
  };

  const attachSocketHandlers = () => {
    if (socketAttached) return;
    const socket = getSock();
    if (!socket) return;

    socket.off("call:offer");
    socket.on("call:offer", ({ from, offer, meta }) => {
      callMeta = { from, meta };
      status = "ringing";
      emitChange();
    });

    socket.off("call:hangup");
    socket.on("call:hangup", () => {
      cleanupPeer();
    });

    socket.off("call:missed");
    socket.on("call:missed", ({ from, meta }) => {
      console.log("Missed call from", from, meta);
    });

    socketAttached = true;
  };

  const startCall = async ({ toUserId, type = "video" }) => {
    // ensure socket handlers are attached
    attachSocketHandlers();
    const socket = getSock();
    if (!socket) throw new Error("Socket not connected");
    status = "connecting";
    emitChange();

    pcRef.current = new RTCPeerConnection(DEFAULT_ICE);
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    pcRef.current.ontrack = (evt) => {
      evt.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
      emitChange();
    };

    pcRef.current.onicecandidate = (evt) => {
      if (evt.candidate) {
        socket.emit("call:ice-candidate", { to: toUserId, candidate: evt.candidate });
      }
    };

    const localStream = await prepareLocalMedia(type === "video");
    localStream.getTracks().forEach((track) => pcRef.current.addTrack(track, localStream));

    // Apply video bitrate cap before creating offer when configured
    if (type === "video" && MAX_VIDEO_KBPS) {
      try {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === "video");
        if (videoSender && videoSender.getParameters) {
          const params = videoSender.getParameters();
          params.encodings = params.encodings && params.encodings.length ? params.encodings : [{}];
          params.encodings[0].maxBitrate = MAX_VIDEO_KBPS * 1000; // kbps -> bps
          await videoSender.setParameters(params);
        }
      } catch (e) {
        console.warn("Failed to set max video bitrate", e);
      }
    }

    await pcRef.current.setLocalDescription(await pcRef.current.createOffer());

    socket.emit("call:ring", { to: toUserId, callId: "call_" + Date.now(), meta: { type } });
    socket.emit("call:offer", { to: toUserId, offer: pcRef.current.localDescription, meta: { type } });

    const onAnswer = async ({ from, answer }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(answer);
      status = "connected";
      emitChange();
    };

    const onIce = ({ from, candidate }) => {
      try {
        pcRef.current?.addIceCandidate(candidate);
      } catch (e) {
        console.warn("Failed to add remote ICE candidate", e);
      }
    };

    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIce);

    return { localStream: localStreamRef.current, remoteStream: remoteStreamRef.current };
  };

  const acceptCall = async ({ fromUserId, type = "video" }) => {
    status = "connecting";
    emitChange();
    pcRef.current = new RTCPeerConnection(DEFAULT_ICE);

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    pcRef.current.ontrack = (evt) => {
      evt.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
      emitChange();
    };

    // ensure socket handlers attached and socket available
    attachSocketHandlers();
    const socket = getSock();
    if (!socket) throw new Error("Socket not connected");

    pcRef.current.onicecandidate = (evt) => {
      if (evt.candidate) {
        socket.emit("call:ice-candidate", { to: fromUserId, candidate: evt.candidate });
      }
    };

    await prepareLocalMedia(type === "video");

    const onOffer = async ({ from, offer, meta }) => {
      try {
        await pcRef.current.setRemoteDescription(offer);

        // Apply video bitrate cap before creating answer when configured
        if (type === "video" && MAX_VIDEO_KBPS) {
          try {
            const senders = pcRef.current.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === "video");
            if (videoSender && videoSender.getParameters) {
              const params = videoSender.getParameters();
              params.encodings = params.encodings && params.encodings.length ? params.encodings : [{}];
              params.encodings[0].maxBitrate = MAX_VIDEO_KBPS * 1000;
              await videoSender.setParameters(params);
            }
          } catch (e) {
            console.warn("Failed to set max video bitrate for answer", e);
          }
        }

        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit("call:answer", { to: from, answer: pcRef.current.localDescription });
        status = "connected";
        emitChange();
      } catch (e) {
        console.error(e);
      }
    };

    const onIce = ({ from, candidate }) => {
      try {
        pcRef.current?.addIceCandidate(candidate);
      } catch (e) {
        console.warn("Failed to add ICE candidate", e);
      }
    };

    socket.on("call:offer", onOffer);
    socket.on("call:ice-candidate", onIce);

    return { localStream: localStreamRef.current, remoteStream: remoteStreamRef.current };
  };

  const rejectCall = ({ toUserId }) => {
    const s = getSock();
    s?.emit("call:hangup", { to: toUserId, reason: "rejected" });
    cleanupPeer();
  };

  const endCall = ({ toUserId }) => {
    const s = getSock();
    s?.emit("call:hangup", { to: toUserId, reason: "ended" });
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
    // state getters
    getState: () => ({ status, isMuted, cameraOff, callMeta, localStreamRef, remoteStreamRef }),
    // actions
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    // subscription
    subscribe: (fn) => {
      listeners.add(fn);
      // immediately emit current state
      fn({ status, isMuted, cameraOff, callMeta, localStreamRef, remoteStreamRef });
      return () => listeners.delete(fn);
    },
  };
};

const controller = createController();

export default function useCall() {
  const [state, setState] = useState(controller.getState());

  useEffect(() => {
    const unsub = controller.subscribe((s) => setState(s));
    return () => unsub();
  }, []);

  return {
    // actions
    startCall: controller.startCall,
    acceptCall: controller.acceptCall,
    rejectCall: controller.rejectCall,
    endCall: controller.endCall,
    toggleMute: controller.toggleMute,
    toggleCamera: controller.toggleCamera,
    // state
    status: state.status,
    isMuted: state.isMuted,
    cameraOff: state.cameraOff,
    localStreamRef: state.localStreamRef,
    remoteStreamRef: state.remoteStreamRef,
    callMeta: state.callMeta,
  };
}
