import { useState, useEffect } from "react";
import { IoClose, IoSearch, IoPersonAdd } from "react-icons/io5";
import Modal from "../common/Modal";
import Avatar from "../common/Avatar";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";
import api from "../../lib/axios";

/**
 * Group info panel — shows group details and members list.
 */
const GroupInfo = ({ conversation, isOpen, onClose }) => {
  const { onlineUsers, addGroupMembers, removeGroupMember } = useChatStore();
  const { user } = useAuthStore();

  const [showAddSection, setShowAddSection] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!conversation || conversation.type !== "group") return null;
  const { groupInfo, participants } = conversation;

  const isAdmin = groupInfo?.admin?._id === user?._id || groupInfo?.admin === user?._id;

  // Search users with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data.users);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val || val.length < 2) {
      setSearchResults([]);
    }
  };

  const toggleUserSelection = (userToToggle) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u._id === userToToggle._id);
      if (exists) {
        return prev.filter((u) => u._id !== userToToggle._id);
      }
      return [...prev, userToToggle];
    });
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    setIsSubmitting(true);
    const updated = await addGroupMembers(conversation._id, selectedUsers.map((u) => u._id));
    if (updated) {
      setShowAddSection(false);
      setSelectedUsers([]);
      setSearchQuery("");
      setSearchResults([]);
    }
    setIsSubmitting(false);
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      await removeGroupMember(conversation._id, memberId);
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm("Are you sure you want to leave this group?")) {
      await removeGroupMember(conversation._id, user?._id);
      onClose();
    }
  };

  const existingParticipantIds = new Set(participants?.map((p) => p._id) || []);
  const filteredSearchResults = searchResults.filter((u) => !existingParticipantIds.has(u._id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group Info" size="md">
      <div className="space-y-6 animate-fade-in">
        {/* Group avatar and name */}
        <div className="flex flex-col items-center text-center">
          <Avatar src={groupInfo?.avatar} name={groupInfo?.name} size="xl" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-3">{groupInfo?.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Group · {participants?.length} participants</p>
          {groupInfo?.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xs">{groupInfo.description}</p>
          )}
        </div>

        {/* Members section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {participants?.length} participants
            </h4>
            {isAdmin && !showAddSection && (
              <button
                onClick={() => setShowAddSection(true)}
                className="flex items-center gap-1 text-xs text-whatsapp-500 hover:text-whatsapp-600 font-semibold transition-colors"
              >
                <IoPersonAdd className="w-3.5 h-3.5" /> Add Participant
              </button>
            )}
          </div>

          {/* Add section */}
          {showAddSection && (
            <div className="bg-gray-50 dark:bg-dark-3/40 border border-gray-100 dark:border-dark-4 p-3 rounded-xl mb-4 space-y-3 animate-slide-up">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Add New Members</span>
                <button
                  onClick={() => {
                    setShowAddSection(false);
                    setSelectedUsers([]);
                    setSearchQuery("");
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-dark-4 rounded-full text-gray-400 transition-colors"
                >
                  <IoClose className="w-4 h-4" />
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search users to add..."
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-3 border border-gray-200 dark:border-dark-4 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-whatsapp-500"
                />
              </div>

              {/* Selected chips */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 py-1">
                  {selectedUsers.map((u) => (
                    <span key={u._id} className="flex items-center gap-1 px-2.5 py-0.5 bg-whatsapp-500/10 text-whatsapp-700 dark:text-whatsapp-400 rounded-full text-[11px] font-medium">
                      {u.fullName}
                      <button onClick={() => toggleUserSelection(u)}>
                        <IoClose className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search results */}
              {searchQuery.length >= 2 && (
                <div className="max-h-36 overflow-y-auto space-y-1 bg-white dark:bg-dark-3 border border-gray-100 dark:border-dark-4 rounded-xl p-1.5 shadow-inner">
                  {filteredSearchResults.length > 0 ? (
                    filteredSearchResults.map((u) => {
                      const isSelected = selectedUsers.some((sel) => sel._id === u._id);
                      return (
                        <button
                          key={u._id}
                          onClick={() => toggleUserSelection(u)}
                          className={`w-full flex items-center gap-2.5 p-1.5 rounded-lg transition-colors ${
                            isSelected ? "bg-whatsapp-500/10" : "hover:bg-gray-50 dark:hover:bg-dark-4"
                          }`}
                        >
                          <Avatar src={u.avatar} name={u.fullName} size="xs" />
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{u.fullName}</p>
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 bg-whatsapp-500 rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-gray-400 text-center py-2">No new users found</p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 justify-end">
                <button
                  disabled={selectedUsers.length === 0 || isSubmitting}
                  onClick={handleAddMembers}
                  className="px-3 py-1.5 bg-whatsapp-500 text-white rounded-lg text-xs font-semibold hover:bg-whatsapp-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? "Adding..." : `Add Selected (${selectedUsers.length})`}
                </button>
              </div>
            </div>
          )}

          {/* Members list */}
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {participants?.map((p) => (
              <div key={p._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-3 transition-colors">
                <Avatar src={p.avatar} name={p.fullName} size="sm" isOnline={onlineUsers.has(p._id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {p.fullName}
                    {p._id === groupInfo?.admin?._id && (
                      <span className="ml-2 text-xs text-whatsapp-500 font-normal">Admin</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{p.about || p.email}</p>
                </div>
                {/* Remove button for admin */}
                {isAdmin && p._id !== groupInfo?.admin?._id && (
                  <button
                    onClick={() => handleRemoveMember(p._id)}
                    className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Leave group option */}
        <div className="pt-4 border-t border-gray-100 dark:border-dark-4 flex">
          <button
            onClick={handleLeaveGroup}
            className="w-full py-2.5 bg-red-50/80 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white font-medium rounded-xl transition-all text-sm"
          >
            Leave Group
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default GroupInfo;
