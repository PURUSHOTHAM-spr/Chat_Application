import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff,
  FiPhoneOff, FiMaximize2, FiMinimize2,
} from "react-icons/fi";
import useCall from "../../hooks/useCall";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";
import { getAvatarUrl, getOtherParticipant } from "../../lib/utils";

/**
 * Full-screen WhatsApp-style call window.
 * Uses ref callbacks for direct, reliable stream attachment instead of polling.
 */
const CallWindow = () => {
  const {
    endCall, toggleMute, toggleCamera,
    status, isMuted, cameraOff, callType, callDuration,
    localStreamRef, remoteStreamRef,
    remotePeerId, callerInfo, callMeta, streamVersion,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { activeConversation, conversations } = useChatStore();
  const { user } = useAuthStore();
  const [isMinimized, setIsMinimized] = useState(false);

  const attachStream = useCallback((el, stream) => {
    if (!el) return;
    if (!stream) {
      if (el.srcObject) {
        el.srcObject = null;
      }
      return;
    }
    const trackCount = stream.getTracks().length;
    const currentSrcObject = el.srcObject;
    const currentTrackCount = currentSrcObject ? currentSrcObject.getTracks().length : 0;
    if (currentSrcObject !== stream || currentTrackCount !== trackCount) {
      console.log(`🔗 Attaching stream to element. Tracks count: ${trackCount} (was ${currentTrackCount})`);
      el.srcObject = stream;
    }
    // Force play if paused (handles autoplay policy)
    if (trackCount > 0 && el.paused) {
      el.play().catch(() => {});
    }
  }, []);

  // ── Attach streams to media elements on every render + streamVersion change ──
  useEffect(() => {
    attachStream(localVideoRef.current, localStreamRef.current);
    attachStream(remoteVideoRef.current, remoteStreamRef.current);
  });

  // ── Also run a backup interval for late-arriving tracks ──
  useEffect(() => {
    if (status !== "connected" && status !== "connecting") return;
    const id = setInterval(() => {
      attachStream(remoteVideoRef.current, remoteStreamRef.current);
    }, 500);
    return () => clearInterval(id);
  }, [status, streamVersion, attachStream]);

  if (status !== "connected" && status !== "connecting") return null;

  // ── Resolve peer info ──
  const peerId = remotePeerId || callMeta?.from;
  let peerName = "Unknown";
  let peerAvatar = null;

  if (callerInfo?.fullName) {
    peerName = callerInfo.fullName;
    peerAvatar = callerInfo.avatar;
  } else if (activeConversation?.type === "direct") {
    const other = getOtherParticipant(activeConversation, user?._id);
    if (other) { peerName = other.fullName || "Unknown"; peerAvatar = other.avatar; }
  } else {
    for (const conv of conversations) {
      if (conv.type !== "direct") continue;
      const other = conv.participants?.find((p) => (p._id || p) === peerId);
      if (other) { peerName = other.fullName || "Unknown"; peerAvatar = other.avatar; break; }
    }
  }

  const avatarSrc = getAvatarUrl(peerAvatar, peerName);

  const formatDuration = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const statusLabel = status === "connecting" ? "Calling..." : formatDuration(callDuration);
  const isVideoCall = callType === "video";

  // ── PIP minimized mode ──
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] animate-fade-in">
        <div className="w-[200px] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          {isVideoCall && (
            <div className="w-full h-[150px] bg-black">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-white text-xs font-medium truncate">{peerName}</span>
              <span className="text-green-400 text-[10px] flex-shrink-0">● {statusLabel}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setIsMinimized(false)} className="p-1.5 text-white/70 hover:text-white"><FiMaximize2 className="w-3.5 h-3.5" /></button>
              <button onClick={endCall} className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600"><FiPhoneOff className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Full-screen call ──
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900 animate-fade-in">
      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-30 px-6 py-4 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/90 text-sm font-medium">{isVideoCall ? "Video Call" : "Audio Call"}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>{statusLabel}</span>
          <button onClick={() => setIsMinimized(true)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"><FiMinimize2 className="w-5 h-5" /></button>
        </div>
      </div>

      {/* ── Main area ── */}
      {isVideoCall ? (
        <div className="absolute inset-0">
          {/* Remote video */}
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

          {/* Local video PIP */}
          <div className="absolute top-20 right-4 md:right-8 z-30 w-[120px] h-[160px] md:w-[180px] md:h-[240px] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {cameraOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <FiVideoOff className="w-8 h-8 text-white/40" />
              </div>
            )}
          </div>

          {/* Connecting overlay */}
          {status === "connecting" && (
            <div className="absolute inset-0 z-20 bg-gray-900/85 flex items-center justify-center">
              <div className="flex flex-col items-center text-center">
                <AvatarWithPulse src={avatarSrc} name={peerName} showPulse />
                <h2 className="text-xl font-semibold text-white mt-6 mb-1">{peerName}</h2>
                <p className="text-white/60 text-sm">Connecting video call...</p>
                <BouncingDots />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0">
          {/* Audio call background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.08),transparent_60%)]" />

          {/* Centered avatar and name */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center text-center px-4">
              <AvatarWithPulse src={avatarSrc} name={peerName} showPulse={status === "connecting"} />
              <h2 className="text-2xl md:text-3xl font-semibold text-white mt-6 mb-2" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                {peerName}
              </h2>
              <p className="text-white/70 text-base">
                {status === "connecting" ? "Calling..." : formatDuration(callDuration)}
              </p>
              {status === "connecting" && <BouncingDots />}
            </div>
          </div>

          {/* Hidden audio elements */}
          <audio ref={remoteVideoRef} autoPlay playsInline />
          <audio ref={localVideoRef} autoPlay muted playsInline />
        </div>
      )}

      {/* ── Peer name on connected video call ── */}
      {isVideoCall && status === "connected" && (
        <div className="absolute bottom-32 md:bottom-36 left-0 right-0 z-30 text-center">
          <p className="text-white text-lg font-medium" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{peerName}</p>
        </div>
      )}

      {/* ── Bottom controls ── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-8 pt-16 md:pb-12 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-6 md:gap-8">
          {/* Mute */}
          <CallControl
            onClick={toggleMute}
            active={isMuted}
            icon={isMuted ? <FiMicOff className="w-6 h-6" /> : <FiMic className="w-6 h-6" />}
            label={isMuted ? "Unmute" : "Mute"}
          />

          {/* Camera (video only) */}
          {isVideoCall && (
            <CallControl
              onClick={toggleCamera}
              active={cameraOff}
              icon={cameraOff ? <FiVideoOff className="w-6 h-6" /> : <FiVideo className="w-6 h-6" />}
              label={cameraOff ? "Start video" : "Stop video"}
            />
          )}

          {/* End call */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={endCall}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all active:scale-95"
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

// ── Reusable call control button ──
const CallControl = ({ onClick, active, icon, label }) => (
  <div className="flex flex-col items-center gap-2">
    <button
      onClick={onClick}
      className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
        active
          ? "bg-white text-gray-900"
          : "bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 border border-white/10"
      }`}
    >
      {icon}
    </button>
    <span className="text-white/60 text-[11px]">{label}</span>
  </div>
);

// ── Avatar with pulse ring animation ──
const AvatarWithPulse = ({ src, name, showPulse }) => (
  <div className="relative flex items-center justify-center" style={{ width: 144, height: 144 }}>
    {showPulse && (
      <>
        <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-call-pulse-ring" />
        <div className="absolute inset-0 rounded-full border-4 border-white/10 animate-call-pulse-ring" style={{ animationDelay: "0.6s" }} />
      </>
    )}
    <img
      src={src}
      alt={name}
      className="w-32 h-32 rounded-full object-cover border-4 border-white/30 shadow-2xl"
      onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=128C7E&color=fff&size=256`; }}
    />
  </div>
);

// ── Bouncing dots animation ──
const BouncingDots = () => (
  <div className="flex gap-1.5 mt-4">
    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
  </div>
);

export default CallWindow;
