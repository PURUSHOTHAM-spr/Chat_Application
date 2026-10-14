import { useState, useRef } from "react";
import {
  IoArrowBack,
  IoEllipsisVertical,
  IoSearch,
  IoClose,
  IoChevronUp,
  IoChevronDown,
  IoWalletOutline,
  IoHourglassOutline,
  IoClipboardOutline,
} from "react-icons/io5";
import Avatar from "../common/Avatar";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";
import useExpenseStore from "../../store/useExpenseStore";
import useTaskStore from "../../store/useTaskStore";
import ProfileModal from "../profile/ProfileModal";
import GroupInfo from "../group/GroupInfo";

import {
  getConversationName,
  getOtherParticipant,
  formatLastSeen,
} from "../../lib/utils";

/**
 * Chat header — shows contact name, online status, and action buttons.
 * Includes in-chat message search functionality.
 */
const ChatHeader = ({ onBack, onSearchChange }) => {
  const { activeConversation, onlineUsers, typingUsers, messages } = useChatStore();
  const { user } = useAuthStore();
  const [showProfile, setShowProfile] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchedIds, setMatchedIds] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const searchInputRef = useRef(null);

  if (!activeConversation) return null;

  const isGroup = activeConversation.type === "group";
  const name = getConversationName(activeConversation, user?._id);
  const other = getOtherParticipant(activeConversation, user?._id);
  const isOnline = other ? onlineUsers.has(other._id) : false;

  // Temporary group status
  const getRemainingTime = (expiresAt) => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt) - new Date();
    if (diffMs <= 0) return "Expired";
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHrs < 1) return `${diffMins}m left`;
    if (diffHrs < 24) return `${diffHrs}h ${diffMins}m left`;
    const days = Math.floor(diffHrs / 24);
    return `${days}d ${diffHrs % 24}h left`;
  };

  const isTempGroup = isGroup && !!activeConversation.groupInfo?.expiresAt;
  const isGroupExpired = isGroup && (activeConversation.groupInfo?.isExpired || (activeConversation.groupInfo?.expiresAt && new Date(activeConversation.groupInfo.expiresAt) <= new Date()));
  const remainingTime = isTempGroup && !isGroupExpired ? getRemainingTime(activeConversation.groupInfo.expiresAt) : null;

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

  // Search logic
  const handleToggleSearch = () => {
    if (showSearch) {
      // Close search
      setShowSearch(false);
      setSearchQuery("");
      setMatchedIds([]);
      setCurrentMatchIndex(-1);
      onSearchChange?.({ query: "", highlightedMessageId: null });
    } else {
      setShowSearch(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setMatchedIds([]);
      setCurrentMatchIndex(-1);
      onSearchChange?.({ query: "", highlightedMessageId: null });
      return;
    }

    const q = query.toLowerCase();
    const matches = messages
      .filter(
        (msg) =>
          msg.type === "text" &&
          !msg.isDeleted &&
          msg.content?.toLowerCase().includes(q)
      )
      .map((msg) => msg._id);

    setMatchedIds(matches);
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      onSearchChange?.({ query, highlightedMessageId: matches[0] });
    } else {
      setCurrentMatchIndex(-1);
      onSearchChange?.({ query, highlightedMessageId: null });
    }
  };

  const navigateMatch = (direction) => {
    if (matchedIds.length === 0) return;
    let next;
    if (direction === "up") {
      next = currentMatchIndex > 0 ? currentMatchIndex - 1 : matchedIds.length - 1;
    } else {
      next = currentMatchIndex < matchedIds.length - 1 ? currentMatchIndex + 1 : 0;
    }
    setCurrentMatchIndex(next);
    onSearchChange?.({ query: searchQuery, highlightedMessageId: matchedIds[next] });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      navigateMatch(e.shiftKey ? "up" : "down");
    } else if (e.key === "Escape") {
      handleToggleSearch();
    }
  };

  return (
    <>
      <div className="bg-light-2 dark:bg-dark-2 border-b border-gray-200 dark:border-dark-4">
        {/* Main header row */}
        <div className="flex items-center gap-3 px-4 py-3 relative">
          {/* Back button (mobile) */}
          <button
            onClick={onBack}
            className="md:hidden p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors"
          >
            <IoArrowBack className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => useTaskStore.getState().setShowPanel(true)}
            className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 text-chatsphere-600 dark:text-chatsphere-400 transition-colors"
            title="Tasks"
          >
            <IoClipboardOutline className="w-5 h-5" />
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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {name}
                </h2>
                {isGroupExpired && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold flex-shrink-0">
                    Expired
                  </span>
                )}
                {remainingTime && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 flex-shrink-0 shadow-sm" title="Temporary Group Expiry">
                    <IoHourglassOutline className="w-2.5 h-2.5 animate-pulse" />
                    {remainingTime}
                  </span>
                )}
              </div>
              <p
                className={`text-xs truncate ${
                  typing.length > 0
                    ? "text-chatsphere-500 font-medium"
                    : isOnline
                    ? "text-chatsphere-500"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {statusText}
              </p>
            </div>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Split Expenses Button (Groups only) */}
            {isGroup && (
              <button
                onClick={() => useExpenseStore.getState().setShowExpensePanel(true)}
                className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 text-emerald-600 dark:text-emerald-400 transition-colors"
                title="Split Expenses"
              >
                <IoWalletOutline className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={handleToggleSearch}
              className={`p-2.5 rounded-full transition-colors ${
                showSearch
                  ? "bg-chatsphere-500/10 text-chatsphere-500"
                  : "hover:bg-gray-200 dark:hover:bg-dark-4"
              }`}
            >
              <IoSearch className={`w-5 h-5 ${showSearch ? "text-chatsphere-500" : "text-gray-600 dark:text-gray-400"}`} />
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
                  {isGroup && (
                    <button
                      onClick={() => {
                        useExpenseStore.getState().setShowExpensePanel(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors flex items-center justify-between"
                    >
                      <span>Split Expenses</span>
                      <IoWalletOutline className="w-4 h-4" />
                    </button>
                  )}
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

        {/* Search bar — slides in below the header */}
        {showSearch && (
          <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 dark:border-dark-4 bg-white dark:bg-dark-3 animate-slide-down">
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                id="chat-search-input"
                type="text"
                value={searchQuery}
                onChange={handleSearchInput}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search messages..."
                className="w-full pl-4 pr-10 py-2 bg-gray-100 dark:bg-dark-4 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-chatsphere-500/30 transition-all"
                autoComplete="off"
              />
              {searchQuery && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 select-none">
                  {matchedIds.length > 0
                    ? `${currentMatchIndex + 1} of ${matchedIds.length}`
                    : "No results"}
                </span>
              )}
            </div>
            <button
              onClick={() => navigateMatch("up")}
              disabled={matchedIds.length === 0}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors disabled:opacity-30"
              title="Previous match"
            >
              <IoChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => navigateMatch("down")}
              disabled={matchedIds.length === 0}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors disabled:opacity-30"
              title="Next match"
            >
              <IoChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={handleToggleSearch}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors"
              title="Close search"
            >
              <IoClose className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
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
