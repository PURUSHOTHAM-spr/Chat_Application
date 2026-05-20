import React, { useEffect, useState, useRef } from "react";
import { FiPhone, FiPhoneOff, FiVideo } from "react-icons/fi";
import useCall from "../../hooks/useCall";
import useChatStore from "../../store/useChatStore";
import Avatar from "../common/Avatar";
import toast from "react-hot-toast";

/**
 * Full-screen WhatsApp-style incoming call modal.
 * Shows a beautiful overlay with caller info, pulse animations,
 * and accept/reject buttons.
 */
const IncomingCallModal = () => {
  const { status, callMeta, callType, acceptCall, rejectCall } = useCall();
  const { conversations } = useChatStore();
  const [visible, setVisible] = useState(false);
  const ringtoneRef = useRef(null);

  useEffect(() => {
    setVisible(status === "ringing");

    // Play ringtone sound
    if (status === "ringing") {
      try {
        // Use the Web Audio API for a simple ringtone
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const playTone = () => {
          if (ringtoneRef.current?.stopped) return;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.value = 440;
          gain.gain.value = 0.1;
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
          osc.stop(audioCtx.currentTime + 0.5);
        };
        ringtoneRef.current = { stopped: false, interval: null, audioCtx };
        playTone();
        ringtoneRef.current.interval = setInterval(playTone, 2000);
      } catch (_) {}
    }

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.stopped = true;
        clearInterval(ringtoneRef.current.interval);
        try {
          ringtoneRef.current.audioCtx?.close();
        } catch (_) {}
        ringtoneRef.current = null;
      }
    };
  }, [status]);

  if (!visible || !callMeta) return null;

  const from = callMeta.from;
  const type = callMeta.meta?.type || callType || "audio";

  // Find caller info from conversations
  let callerName = "Unknown";
  let callerAvatar = null;

  for (const conv of conversations) {
    if (conv.type !== "direct") continue;
    const match = conv.participants?.find((p) => (p._id || p) === from);
    if (match) {
      callerName = match.fullName || "Unknown";
      callerAvatar = match.avatar;
      break;
    }
  }

  const handleAccept = async () => {
    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.stopped = true;
      clearInterval(ringtoneRef.current.interval);
    }
    try {
      await acceptCall({ fromUserId: from, type });
      setVisible(false);
    } catch (e) {
      console.error("Failed to accept call:", e);
      toast.error(e.message || "Failed to accept call");
    }
  };

  const handleReject = () => {
    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.stopped = true;
      clearInterval(ringtoneRef.current.interval);
    }
    rejectCall({ toUserId: from });
    setVisible(false);
  };

  const isVideoCall = type === "video";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center animate-fade-in">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.1),transparent_60%)]" />

      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full border border-white/5 animate-call-pulse-ring" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full border border-white/5 animate-call-pulse-ring" style={{ animationDelay: "0.7s" }} />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full border border-white/5 animate-call-pulse-ring" style={{ animationDelay: "1.4s" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Call type label */}
        <div className="flex items-center gap-2 mb-8">
          {isVideoCall ? (
            <FiVideo className="w-5 h-5 text-white/70" />
          ) : (
            <FiPhone className="w-5 h-5 text-white/70" />
          )}
          <span className="text-white/70 text-sm font-medium uppercase tracking-wider">
            Incoming {isVideoCall ? "Video" : "Audio"} Call
          </span>
        </div>

        {/* Avatar with pulse rings */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-full border-2 border-white/20 animate-call-pulse-ring" />
          <div className="absolute -inset-8 rounded-full border-2 border-white/10 animate-call-pulse-ring" style={{ animationDelay: "0.5s" }} />
          <div className="absolute -inset-12 rounded-full border border-white/5 animate-call-pulse-ring" style={{ animationDelay: "1s" }} />

          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl relative z-10">
            <Avatar src={callerAvatar} name={callerName} size="xl" />
          </div>
        </div>

        {/* Caller name */}
        <h2 className="text-3xl md:text-4xl font-bold text-white text-shadow mb-2">
          {callerName}
        </h2>
        <p className="text-white/60 text-base mb-2">
          {isVideoCall ? "Video Call" : "Audio Call"}
        </p>

        {/* Ringing animation dots */}
        <div className="flex gap-1.5 mb-16">
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
        </div>

        {/* Accept / Reject buttons */}
        <div className="flex items-center justify-center gap-16 md:gap-20">
          {/* Reject */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleReject}
              className="w-16 h-16 md:w-18 md:h-18 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/40 hover:bg-red-600 transition-all duration-200 transform hover:scale-110 active:scale-95 call-btn-reject"
              aria-label="Reject call"
            >
              <FiPhoneOff className="w-7 h-7 rotate-[135deg]" />
            </button>
            <span className="text-white/80 text-sm font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleAccept}
              className="w-16 h-16 md:w-18 md:h-18 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/40 hover:bg-green-600 transition-all duration-200 transform hover:scale-110 active:scale-95 call-btn-accept"
              aria-label="Accept call"
            >
              {isVideoCall ? (
                <FiVideo className="w-7 h-7" />
              ) : (
                <FiPhone className="w-7 h-7" />
              )}
            </button>
            <span className="text-white/80 text-sm font-medium">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
