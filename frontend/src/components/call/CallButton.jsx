import React from "react";
import { FiPhone, FiVideo } from "react-icons/fi";
import useCall from "../../hooks/useCall";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";
import toast from "react-hot-toast";

/**
 * Call buttons for the chat header — audio and video call.
 * Only shown for direct (non-group) conversations.
 * Passes the remote user's info to the call controller for display.
 */
const CallButton = () => {
  const { startCall, status } = useCall();
  const { activeConversation } = useChatStore();
  const { user } = useAuthStore();

  if (!activeConversation || activeConversation.type === "group") return null;

  const other = activeConversation.participants.find((p) => p._id !== user._id);
  if (!other) return null;

  const isInCall = status === "connecting" || status === "connected" || status === "ringing";

  const handleCall = async (type) => {
    if (isInCall) {
      toast.error("You are already in a call");
      return;
    }
    try {
      await startCall({
        toUserId: other._id,
        type,
        userInfo: { _id: other._id, fullName: other.fullName, avatar: other.avatar },
      });
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to start call");
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => handleCall("audio")}
        disabled={isInCall}
        className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group relative"
        aria-label="Start audio call"
        title="Audio call"
      >
        <FiPhone className="w-[20px] h-[20px] text-gray-600 dark:text-gray-300 group-hover:text-whatsapp-600 dark:group-hover:text-whatsapp-400 transition-colors" />
      </button>
      <button
        onClick={() => handleCall("video")}
        disabled={isInCall}
        className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group relative"
        aria-label="Start video call"
        title="Video call"
      >
        <FiVideo className="w-[20px] h-[20px] text-gray-600 dark:text-gray-300 group-hover:text-whatsapp-600 dark:group-hover:text-whatsapp-400 transition-colors" />
      </button>
    </div>
  );
};

export default CallButton;
