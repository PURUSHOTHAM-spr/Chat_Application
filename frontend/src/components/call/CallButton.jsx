import React from "react";
import { FiPhone, FiVideo } from "react-icons/fi";
import useCall from "../../hooks/useCall";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";
import toast from "react-hot-toast";

const CallButton = () => {
  const { startCall } = useCall();
  const { activeConversation } = useChatStore();
  const { user } = useAuthStore();

  if (!activeConversation || activeConversation.type === "group") return null;

  const other = activeConversation.participants.find((p) => p._id !== user._id);
  if (!other) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={async () => {
          try {
            await startCall({ toUserId: other._id, type: "audio" });
          } catch (e) {
            console.error(e);
            toast.error(e.message || "Failed to start call");
          }
        }}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors"
        aria-label="Start audio call"
      >
        <FiPhone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      <button
        onClick={async () => {
          try {
            await startCall({ toUserId: other._id, type: "video" });
          } catch (e) {
            console.error(e);
            toast.error(e.message || "Failed to start call");
          }
        }}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors"
        aria-label="Start video call"
      >
        <FiVideo className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
    </div>
  );
};

export default CallButton;
