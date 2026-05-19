import Avatar from "../common/Avatar";
import Badge from "../common/Badge";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";
import {
  getConversationName,
  getConversationAvatar,
  getOtherParticipant,
  formatMessageTime,
  truncate,
} from "../../lib/utils";

/**
 * Individual chat list item — shows avatar, name, last message, time, and unread count.
 */
const ChatListItem = ({ conversation, isActive, onClick }) => {
  const { user } = useAuthStore();
  const { onlineUsers, typingUsers } = useChatStore();

  const name = getConversationName(conversation, user?._id);
  const avatar = getConversationAvatar(conversation, user?._id);
  const other = getOtherParticipant(conversation, user?._id);
  const isOnline = other ? onlineUsers.has(other._id) : false;

  // Get typing status for this conversation
  const typing = typingUsers[conversation._id] || [];
  const isTyping = typing.length > 0;

  // Get unread count for current user
  const unreadCount = conversation.unreadCount?.[user?._id] || 0;

  // Last message preview
  const lastMessage = conversation.lastMessage;
  let preview = "";
  if (isTyping) {
    preview = typing.map((t) => t.userName).join(", ") + " is typing...";
  } else if (lastMessage?.content) {
    preview = lastMessage.content;
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 hover:bg-light-2 dark:hover:bg-dark-3 ${
        isActive
          ? "bg-light-3 dark:bg-dark-3 border-l-4 border-whatsapp-500"
          : "border-l-4 border-transparent"
      }`}
    >
      <Avatar
        src={avatar}
        name={name}
        size="md"
        isOnline={conversation.type === "direct" && isOnline}
      />

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <h3
            className={`text-sm font-semibold truncate ${
              isActive
                ? "text-whatsapp-700 dark:text-whatsapp-400"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {name}
          </h3>
          <span
            className={`text-xs flex-shrink-0 ml-2 ${
              unreadCount > 0
                ? "text-whatsapp-500 font-semibold"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {lastMessage?.createdAt && formatMessageTime(lastMessage.createdAt)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <p
            className={`text-xs truncate ${
              isTyping
                ? "text-whatsapp-500 font-medium italic"
                : unreadCount > 0
                ? "text-gray-600 dark:text-gray-300 font-medium"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {truncate(preview, 45) || "Start a conversation"}
          </p>
          <Badge count={unreadCount} />
        </div>
      </div>
    </button>
  );
};

export default ChatListItem;
