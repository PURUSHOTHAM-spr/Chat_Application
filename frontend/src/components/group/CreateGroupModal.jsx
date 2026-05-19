import { useState, useEffect } from "react";
import { IoClose, IoSearch } from "react-icons/io5";
import Modal from "../common/Modal";
import Avatar from "../common/Avatar";
import api from "../../lib/axios";
import useChatStore from "../../store/useChatStore";

/**
 * Modal for creating a new group conversation.
 */
const CreateGroupModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: select members, 2: group info
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { createGroup, setActiveConversation } = useChatStore();

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
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

  const toggleUser = (user) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.find((u) => u._id === user._id);
      if (isSelected) {
        return prev.filter((u) => u._id !== user._id);
      } else {
        if (prev.length >= 14) {
          import("react-hot-toast").then(m => m.default.error("Group capacity is limited to 15 members"));
          return prev;
        }
        return [...prev, user];
      }
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;
    setIsCreating(true);
    const conversation = await createGroup({
      name: groupName.trim(),
      description: groupDescription.trim(),
      participants: selectedUsers.map((u) => u._id),
    });
    if (conversation) {
      setActiveConversation(conversation);
      handleClose();
    }
    setIsCreating(false);
  };

  const handleClose = () => {
    setStep(1);
    setSearchQuery("");
    setSelectedUsers([]);
    setGroupName("");
    setGroupDescription("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={step === 1 ? "Add Group Members" : "New Group"} size="md">
      {step === 1 ? (
        <div>
          {/* Search */}
          <div className="relative mb-4">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-dark-3 rounded-xl text-sm input-focus"
            />
          </div>

          {/* Selected chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedUsers.map((user) => (
                <span key={user._id} className="flex items-center gap-1 px-3 py-1 bg-whatsapp-500/10 text-whatsapp-700 dark:text-whatsapp-400 rounded-full text-xs font-medium">
                  {user.fullName}
                  <button onClick={() => toggleUser(user)}>
                    <IoClose className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {searchResults.map((user) => {
              const isSelected = selectedUsers.find((u) => u._id === user._id);
              return (
                <button
                  key={user._id}
                  onClick={() => toggleUser(user)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                    isSelected ? "bg-whatsapp-500/10" : "hover:bg-gray-50 dark:hover:bg-dark-3"
                  }`}
                >
                  <Avatar src={user.avatar} name={user.fullName} size="sm" />
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">{user.about}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 bg-whatsapp-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Next button */}
          <button
            onClick={() => setStep(2)}
            disabled={selectedUsers.length < 2}
            className="w-full mt-4 py-2.5 bg-whatsapp-500 text-white font-medium rounded-xl hover:bg-whatsapp-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next ({selectedUsers.length} selected)
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-3 rounded-xl text-sm input-focus"
            maxLength={50}
            autoFocus
          />
          <textarea
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            placeholder="Group description (optional)"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-3 rounded-xl text-sm input-focus resize-none"
            rows={2}
            maxLength={150}
          />
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-gray-200 dark:border-dark-4 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-3 transition-colors">
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={!groupName.trim() || isCreating}
              className="flex-1 py-2.5 bg-whatsapp-500 text-white font-medium rounded-xl hover:bg-whatsapp-600 disabled:opacity-40 transition-all"
            >
              {isCreating ? "Creating..." : "Create Group"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CreateGroupModal;
