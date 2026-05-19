import { IoClose, IoNotifications } from "react-icons/io5";
import useNotificationStore from "../../store/useNotificationStore";
import useChatStore from "../../store/useChatStore";
import Avatar from "../common/Avatar";
import { formatMessageTime } from "../../lib/utils";

/**
 * Notifications panel — slide-in panel showing recent notifications.
 */
const NotificationsPanel = () => {
  const { notifications, isOpen, togglePanel, clearNotifications } = useNotificationStore();
  const { setActiveConversation, conversations } = useChatStore();

  if (!isOpen) return null;

  const handleNotificationClick = (notification) => {
    if (notification.conversationId) {
      const conv = conversations.find((c) => c._id === notification.conversationId);
      if (conv) {
        setActiveConversation(conv);
        togglePanel();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={togglePanel} />
      <div className="relative w-full max-w-sm bg-white dark:bg-dark-2 h-full animate-slide-in-right shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-dark-4">
          <div className="flex items-center gap-2">
            <IoNotifications className="w-5 h-5 text-whatsapp-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button onClick={clearNotifications} className="text-xs text-red-500 hover:text-red-600 font-medium">
                Clear all
              </button>
            )}
            <button onClick={togglePanel} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-4">
              <IoClose className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="overflow-y-auto h-full pb-20">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <IoNotifications className="w-16 h-16 text-gray-200 dark:text-gray-700 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No notifications</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-dark-4">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-dark-3 transition-colors ${
                    !notif.read ? "bg-whatsapp-50/50 dark:bg-whatsapp-500/5" : ""
                  }`}
                >
                  <Avatar src={notif.sender?.avatar} name={notif.title} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{notif.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{notif.body}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      {formatMessageTime(notif.timestamp)}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-2.5 h-2.5 bg-whatsapp-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPanel;
