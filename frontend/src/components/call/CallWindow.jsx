import React, { useEffect, useRef, useState } from "react";
import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiPhoneOff,
  FiMaximize2,
  FiMinimize2,
} from "react-icons/fi";
import useCall from "../../hooks/useCall";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";
import Avatar from "../common/Avatar";
import { getOtherParticipant } from "../../lib/utils";

/**
 * Full-screen WhatsApp-style call window.
 * Shows during connecting and connected states.
 */
const CallWindow = () => {
  const {
    endCall,
    toggleMute,
    toggleCamera,
    status,
    isMuted,
    cameraOff,
    callType,
    callDuration,
    localStreamRef,
    remoteStreamRef,
    remotePeerId,
    callerInfo,
    callMeta,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { activeConversation, conversations } = useChatStore();
  const { user } = useAuthStore();
  const [isMinimized, setIsMinimized] = useState(false);

  // Attach streams to video elements
  useEffect(() => {
    let stopped = false;
    const interval = setInterval(() => {
      if (stopped) return;
      try {
        if (localVideoRef.current && localStreamRef.current) {
          if (localVideoRef.current.srcObject !== localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        }
        if (remoteVideoRef.current && remoteStreamRef.current) {
          if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
          }
        }
      } catch (_) {}
    }, 150);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [localStreamRef, remoteStreamRef, status]);

  if (status !== "connected" && status !== "connecting") return null;

  // Find the remote user info
  const peerId = remotePeerId || callMeta?.from;
  let peerName = "Unknown";
  let peerAvatar = null;

  if (callerInfo) {
    peerName = callerInfo.fullName || "Unknown";
    peerAvatar = callerInfo.avatar;
  } else if (activeConversation && activeConversation.type === "direct") {
    const other = getOtherParticipant(activeConversation, user?._id);
    if (other) {
      peerName = other.fullName || "Unknown";
      peerAvatar = other.avatar;
    }
  } else {
    // Search all conversations for the peer
    for (const conv of conversations) {
      if (conv.type !== "direct") continue;
      const other = conv.participants?.find((p) => (p._id || p) === peerId);
      if (other) {
        peerName = other.fullName || "Unknown";
        peerAvatar = other.avatar;
        break;
      }
    }
  }

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const statusLabel =
    status === "connecting"
      ? "Calling..."
      : status === "connected"
      ? formatDuration(callDuration)
      : status;

  const isVideoCall = callType === "video";

  // ── Minimized PIP mode ──
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] animate-fade-in">
        <div className="w-[200px] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          {isVideoCall && (
            <div className="relative w-full h-[150px] bg-black">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              <span className="text-white text-xs font-medium truncate max-w-[80px]">
                {peerName}
              </span>
              <span className="text-green-400 text-[10px]">● {statusLabel}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1.5 text-white/70 hover:text-white transition-colors"
                title="Maximize"
              >
                <FiMaximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={endCall}
                className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                title="End call"
              >
                <FiPhoneOff className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Full-screen call view ──
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col animate-fade-in">
      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/90 text-sm font-medium">
            {isVideoCall ? "Video Call" : "Audio Call"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
            {statusLabel}
          </span>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            title="Minimize"
          >
            <FiMinimize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Main call area ── */}
      <div className="flex-1 relative overflow-hidden">
        {isVideoCall ? (
          <>
            {/* Remote video (full screen) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

            {/* Local video PIP */}
            <div className="absolute top-20 right-4 md:right-8 z-30 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-[120px] h-[160px] md:w-[180px] md:h-[240px] object-cover"
              />
              {cameraOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <FiVideoOff className="w-8 h-8 text-white/40" />
                </div>
              )}
            </div>

            {/* Connecting overlay for video calls */}
            {status === "connecting" && (
              <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-20">
                <div className="flex flex-col items-center">
                  {/* Pulse rings */}
                  <div className="relative w-32 h-32 md:w-40 md:h-40 mb-6 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-call-pulse-ring" />
                    <div className="absolute inset-0 rounded-full border-4 border-white/10 animate-call-pulse-ring" style={{ animationDelay: "0.6s" }} />
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                      <Avatar src={peerAvatar} name={peerName} size="2xl" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-1">{peerName}</h2>
                  <p className="text-white/60 text-sm mb-4">Connecting video call...</p>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Audio call — gradient background with centered avatar */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.08),transparent_60%)]" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                {/* Avatar with pulse ring */}
                <div className="relative w-36 h-36 md:w-44 md:h-44 mb-6 flex items-center justify-center">
                  {status === "connecting" && (
                    <>
                      <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-call-pulse-ring" />
                      <div className="absolute inset-0 rounded-full border-4 border-white/10 animate-call-pulse-ring" style={{ animationDelay: "0.6s" }} />
                    </>
                  )}
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                    <Avatar src={peerAvatar} name={peerName} size="2xl" />
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                  {peerName}
                </h2>
                <p className="text-white/70 text-base">
                  {status === "connecting" ? "Calling..." : formatDuration(callDuration)}
                </p>

                {status === "connecting" && (
                  <div className="flex gap-2 mt-4">
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </div>
                )}
              </div>
            </div>

            {/* Hidden media elements for audio-only call */}
            <audio ref={remoteVideoRef} autoPlay playsInline style={{ display: "none" }} />
            <audio ref={localVideoRef} autoPlay muted playsInline style={{ display: "none" }} />
          </>
        )}
      </div>

      {/* ── Bottom control bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-8 pt-16 md:pb-12 bg-gradient-to-t from-black/80 to-transparent">
        {/* Peer name (video mode when connected) */}
        {isVideoCall && status === "connected" && (
          <div className="text-center mb-6">
            <p className="text-white text-lg font-medium" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
              {peerName}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-5 md:gap-8">
          {/* Mute */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleMute}
              className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                isMuted
                  ? "bg-white text-gray-900"
                  : "bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 border border-white/10"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <FiMicOff className="w-6 h-6" />
              ) : (
                <FiMic className="w-6 h-6" />
              )}
            </button>
            <span className="text-white/60 text-[11px]">{isMuted ? "Unmute" : "Mute"}</span>
          </div>

          {/* Camera toggle */}
          {isVideoCall && (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleCamera}
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                  cameraOff
                    ? "bg-white text-gray-900"
                    : "bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 border border-white/10"
                }`}
                title={cameraOff ? "Enable camera" : "Disable camera"}
              >
                {cameraOff ? (
                  <FiVideoOff className="w-6 h-6" />
                ) : (
                  <FiVideo className="w-6 h-6" />
                )}
              </button>
              <span className="text-white/60 text-[11px]">{cameraOff ? "Start video" : "Stop video"}</span>
            </div>
          )}

          {/* End call */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={endCall}
              className="w-16 h-16 md:w-18 md:h-18 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-500/40 transform hover:scale-105 active:scale-95"
              title="End call"
            >
              <FiPhoneOff className="w-7 h-7 rotate-[135deg]" />
            </button>
            <span className="text-white/60 text-[11px]">End</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallWindow;
