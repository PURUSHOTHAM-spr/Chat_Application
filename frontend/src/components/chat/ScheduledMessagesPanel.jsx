import { useEffect } from "react";
import { IoClose, IoTime, IoTrash, IoChatbubble } from "react-icons/io5";
import useChatStore from "../../store/useChatStore";
import Avatar from "../common/Avatar";

/**
 * Slide-in panel showing all pending scheduled messages.
 * Accessible from sidebar menu.
 */
const ScheduledMessagesPanel = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
  const { 
    scheduledMessages, 
    fetchScheduledMessages, 
    cancelScheduledMessage, 
    isLoadingScheduled,
    showScheduledPanel,
    setShowScheduledPanel 
  } = useChatStore();

  const isOpen = propIsOpen !== undefined ? propIsOpen : showScheduledPanel;
  const onClose = propOnClose || (() => setShowScheduledPanel(false));

  useEffect(() => {
    if (isOpen) {
      fetchScheduledMessages();
    }
  }, [isOpen, fetchScheduledMessages]);

  if (!isOpen) return null;

  const formatScheduledTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = d - now;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateStr = d.toLocaleDateString([], { month: "short", day: "numeric" });

    if (diffMs < 0) return `Overdue — ${dateStr} ${timeStr}`;
    if (diffHrs < 1) return `In ${diffMins}m — ${timeStr}`;
    if (diffHrs < 24) return `In ${diffHrs}h ${diffMins}m — ${timeStr}`;
    return `${dateStr} at ${timeStr}`;
  };

  const getConversationName = (msg) => {
    if (!msg.conversationId) return "Unknown";
    if (msg.conversationId.type === "group") {
      return msg.conversationId.groupInfo?.name || "Group";
    }
    // For direct conversations, show the other participant's name
    const otherParticipant = msg.conversationId.participants?.find(
      (p) => p._id !== msg.userId
    );
    return otherParticipant?.fullName || "Direct Chat";
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-dark-2 h-full shadow-2xl animate-slide-in-left flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-chatsphere-600 text-white">
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <IoClose className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-lg font-semibold">Scheduled Messages</h2>
            <p className="text-xs text-white/80">{scheduledMessages.length} pending</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingScheduled ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-3 border-chatsphere-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : scheduledMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-20 h-20 bg-chatsphere-500/10 rounded-full flex items-center justify-center mb-4">
                <IoTime className="w-10 h-10 text-chatsphere-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Scheduled Messages</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Schedule a message by clicking the clock icon next to the send button
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {scheduledMessages.map((msg) => (
                <div
                  key={msg._id}
                  className="bg-gray-50 dark:bg-dark-3 rounded-xl p-4 border border-gray-100 dark:border-dark-4 hover:shadow-md transition-all"
                >
                  {/* Conversation name */}
                  <div className="flex items-center gap-2 mb-2">
                    <IoChatbubble className="w-3.5 h-3.5 text-chatsphere-500" />
                    <span className="text-xs font-medium text-chatsphere-600 dark:text-chatsphere-400">
                      {getConversationName(msg)}
                    </span>
                  </div>

                  {/* Message content */}
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-3 line-clamp-2">
                    {msg.type === "text" ? msg.content : `📎 ${msg.type}: ${msg.fileName || msg.type}`}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <IoTime className="w-3.5 h-3.5" />
                      <span>{formatScheduledTime(msg.scheduledAt)}</span>
                    </div>
                    <button
                      onClick={() => cancelScheduledMessage(msg._id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <IoTrash className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduledMessagesPanel;
