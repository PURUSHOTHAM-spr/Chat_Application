import { useState } from "react";
import {
  IoSearch,
  IoEllipsisVertical,
  IoNotifications,
  IoPeople,
} from "react-icons/io5";
import ChatList from "./ChatList";
import SearchUsers from "./SearchUsers";
import Avatar from "../common/Avatar";
import ThemeToggle from "../common/ThemeToggle";
import Badge from "../common/Badge";
import useAuthStore from "../../store/useAuthStore";
import useNotificationStore from "../../store/useNotificationStore";
import CreateGroupModal from "../group/CreateGroupModal";

import useChatStore from "../../store/useChatStore";

/**
 * Sidebar component — contains user header, search, and conversation list.
 */
const Sidebar = () => {
  const { user } = useAuthStore();
  const { unreadCount, togglePanel } = useNotificationStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-light-2 dark:bg-dark-2 border-b border-gray-200 dark:border-dark-4">
        <button onClick={() => useChatStore.getState().setShowProfilePanel(true)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Avatar src={user?.avatar} name={user?.fullName} size="md" />
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowGroupModal(true)}
            className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors"
            title="New group"
          >
            <IoPeople className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <ThemeToggle />
          <button
            onClick={togglePanel}
            className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors relative"
            title="Notifications"
          >
            <IoNotifications className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <Badge count={unreadCount} className="absolute -top-0.5 -right-0.5 scale-90" />
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
                    useChatStore.getState().setShowProfilePanel(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-4 transition-colors"
                >
                  Profile Settings
                </button>
                <button
                  onClick={() => {
                    setShowGroupModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-4 transition-colors"
                >
                  New Group
                </button>
                <button
                  onClick={() => {
                    useAuthStore.getState().logout();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 bg-white dark:bg-dark-2">
        <div className="relative">
          <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="sidebar-search"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearching(e.target.value.length > 0);
            }}
            placeholder="Search or start new chat"
            className="w-full pl-10 pr-4 py-2.5 bg-light-2 dark:bg-dark-3 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-whatsapp-500/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setIsSearching(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Chat list or search results */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <SearchUsers query={searchQuery} onClose={() => {
            setSearchQuery("");
            setIsSearching(false);
          }} />
        ) : (
          <ChatList />
        )}
      </div>

      {/* Group creation modal */}
      <CreateGroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
      />

      {/* Backdrop for menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
