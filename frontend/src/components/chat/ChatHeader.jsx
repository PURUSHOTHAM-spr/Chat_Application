import { useState } from "react";
import { IoArrowBack, IoEllipsisVertical, IoSearch } from "react-icons/io5";
import Avatar from "../common/Avatar";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";
import ProfileModal from "../profile/ProfileModal";
import GroupInfo from "../group/GroupInfo";
import {
  getConversationName,
  getOtherParticipant,
  formatLastSeen,
} from "../../lib/utils";

/**
 * Chat header — shows contact name, online status, and action buttons.
 */
const ChatHeader = ({ onBack }) => {
  const { activeConversation, onlineUsers, typingUsers } = useChatStore();
  const { user } = useAuthStore();
  const [showProfile, setShowProfile] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

    const [showMenu, setShowMenu] = useState(false);

  if (!activeConversation) return null;

  const isGroup = activeConversation.type === "group";
  const name = getConversationName(activeConversation, user?._id);
  const other = getOtherParticipant(activeConversation, user?._id);
  const isOnline = other ? onlineUsers.has(other._id) : false;

  // Typing indicator text
  const typing = typingUsers[activeConversation._id] || [];
  let statusText = "";
  if (typing.length > 0) {
    statusText = isGroup
      ? `${typing.map((t) => t.userName).join(", ")} typing...`
      : "typing...";
  } else if (isGroup) {
    const count = activeConversation.participants?.length || 0;
    statusText = `${count} participants`;
  } else if (isOnline) {
    statusText = "online";
  } else if (other?.lastSeen) {
    statusText = `last seen ${formatLastSeen(other.lastSeen)}`;
  }

  const handleHeaderClick = () => {
    if (isGroup) {
      setShowGroupInfo(true);
    } else {
      setShowProfile(true);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm("Are you sure you want to clear all messages in this chat?")) {
      await useChatStore.getState().clearChat(activeConversation._id);
      setShowMenu(false);
    }
  };

  const handleDeleteChat = async () => {
    if (window.confirm("Are you sure you want to delete this chat?")) {
      await useChatStore.getState().deleteConversation(activeConversation._id);
      setShowMenu(false);
      onBack();
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 bg-light-2 dark:bg-dark-2 border-b border-gray-200 dark:border-dark-4 relative">
        {/* Back button (mobile) */}
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors"
        >
          <IoArrowBack className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Avatar & Info */}
        <button
          onClick={handleHeaderClick}
          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
        >
          <Avatar
            src={
              isGroup
                ? activeConversation.groupInfo?.avatar
                : other?.avatar
            }
            name={name}
            size="md"
            isOnline={!isGroup && isOnline}
          />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {name}
            </h2>
            <p
              className={`text-xs truncate ${
                typing.length > 0
                  ? "text-whatsapp-500 font-medium"
                  : isOnline
                  ? "text-whatsapp-500"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {statusText}
            </p>
          </div>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors">
            <IoSearch className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors"
            >
              <IoEllipsisVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-12 w-48 bg-white dark:bg-dark-3 rounded-xl shadow-xl border border-gray-100 dark:border-dark-4 py-2 z-50 animate-fade-in">
                <button
                  onClick={() => {
                    handleHeaderClick();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-4 transition-colors"
                >
                  Contact Info
                </button>
                <button
                  onClick={handleClearChat}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-4 transition-colors"
                >
                  Clear Chat
                </button>
                <button
                  onClick={handleDeleteChat}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  Delete Chat
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Menu Backdrop */}
        {showMenu && (
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
        )}
      </div>

      {/* Profile Modal for direct chats */}
      {showProfile && other && (
        <ProfileModal
          user={other}
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Group Info for group chats */}
      {showGroupInfo && (
        <GroupInfo
          conversation={activeConversation}
          isOpen={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
        />
      )}
    </>
  );
};

export default ChatHeader;
