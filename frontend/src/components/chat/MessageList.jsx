import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { MessageSkeleton } from "../common/LoadingSkeleton";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";

/**
 * Message list — scrollable container for messages with infinite scroll.
 * Auto-scrolls to bottom on new messages.
 */
const MessageList = () => {
  const { messages, isLoadingMessages, pagination, loadMoreMessages, activeConversation, typingUsers } =
    useChatStore();
  const { user } = useAuthStore();
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  // Infinite scroll — triggers when sentinel element at top is visible
  const topRef = useInfiniteScroll(
    loadMoreMessages,
    pagination?.hasMore,
    isLoadingMessages
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Scroll to bottom on conversation change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView();
    }
  }, [activeConversation?._id]);

  const typing = typingUsers[activeConversation?._id] || [];

  // Group messages by date for date separators
  const groupedMessages = [];
  let lastDate = "";

  messages.forEach((msg) => {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== lastDate) {
      groupedMessages.push({ type: "date", date: msgDate, key: `date-${msgDate}` });
      lastDate = msgDate;
    }
    groupedMessages.push({ type: "message", data: msg, key: msg._id || msg.tempId });
  });

  if (isLoadingMessages && messages.length === 0) {
    return <MessageSkeleton />;
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-4 md:px-12 lg:px-20 py-4">
      {/* Infinite scroll sentinel */}
      {pagination?.hasMore && (
        <div ref={topRef} className="flex justify-center py-3">
          {isLoadingMessages && (
            <div className="w-6 h-6 border-2 border-whatsapp-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}

      {/* Messages */}
      {groupedMessages.map((item) => {
        if (item.type === "date") {
          return (
            <div key={item.key} className="flex justify-center my-4">
              <span className="px-4 py-1.5 bg-white/90 dark:bg-dark-3/90 backdrop-blur-sm text-xs text-gray-500 dark:text-gray-400 rounded-lg shadow-sm font-medium">
                {formatDateSeparator(item.date)}
              </span>
            </div>
          );
        }

        const msg = item.data;
        const isOwn = (msg.sender?._id || msg.sender) === user?._id;

        return (
          <MessageBubble
            key={item.key}
            message={msg}
            isOwn={isOwn}
          />
        );
      })}

      {/* Typing indicator */}
      {typing.length > 0 && <TypingIndicator />}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
};

/**
 * Format date for separator labels.
 */
const formatDateSeparator = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};

export default MessageList;
