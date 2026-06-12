import { useState, useCallback } from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import useChatStore from "../../store/useChatStore";
import { useEffect } from "react";

/**
 * Chat window — the right panel that shows the active conversation.
 */
const ChatWindow = () => {
  const { activeConversation, markAsRead, setShowMobileSidebar, setActiveConversation } = useChatStore();
  const [searchState, setSearchState] = useState({ query: "", highlightedMessageId: null });

  const handleBack = () => {
    setShowMobileSidebar(true);
    setActiveConversation(null);
  };

  const handleSearchChange = useCallback((state) => {
    setSearchState(state);
  }, []);

  // Mark messages as read when opening a conversation
  useEffect(() => {
    if (activeConversation?._id) {
      markAsRead(activeConversation._id);
    }
  }, [activeConversation?._id, markAsRead]);

  // Reset search when conversation changes
  useEffect(() => {
    setSearchState({ query: "", highlightedMessageId: null });
  }, [activeConversation?._id]);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader onBack={handleBack} onSearchChange={handleSearchChange} />

      {/* Chat background with pattern */}
      <div className="flex-1 overflow-hidden chat-bg-pattern relative"
        style={
          activeConversation?.wallpaper
            ? {
                backgroundImage: `url(${activeConversation.wallpaper})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}
        }
      >
        {activeConversation?.wallpaper && (
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        )}
        <div className="relative h-full">
          <MessageList
            searchQuery={searchState.query}
            highlightedMessageId={searchState.highlightedMessageId}
          />
        </div>
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatWindow;

