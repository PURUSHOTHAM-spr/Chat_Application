import ChatListItem from "./ChatListItem";
import { ChatListSkeleton } from "../common/LoadingSkeleton";
import useChatStore from "../../store/useChatStore";

/**
 * Chat list component — renders all conversations in the sidebar.
 */
const ChatList = () => {
  const { conversations, isLoadingConversations, activeConversation, setActiveConversation } =
    useChatStore();

  if (isLoadingConversations) {
    return <ChatListSkeleton />;
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
        <div className="w-16 h-16 bg-whatsapp-500/10 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-whatsapp-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">No conversations yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          Search for users to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-dark-4/50">
      {conversations.map((conversation) => (
        <ChatListItem
          key={conversation._id}
          conversation={conversation}
          isActive={activeConversation?._id === conversation._id}
          onClick={() => setActiveConversation(conversation)}
        />
      ))}
    </div>
  );
};

export default ChatList;
