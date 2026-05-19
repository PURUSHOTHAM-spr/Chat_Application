import { useState, useEffect } from "react";
import { IoSearch as IoSearchIcon } from "react-icons/io5";
import api from "../../lib/axios";
import Avatar from "../common/Avatar";
import useChatStore from "../../store/useChatStore";

/**
 * Search users component — allows finding and starting conversations with new users.
 */
const SearchUsers = ({ query, onClose }) => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { createConversation, setActiveConversation } = useChatStore();

  useEffect(() => {
    const searchUsers = async () => {
      if (!query || query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
        setResults(res.data.users);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const [isCreating, setIsCreating] = useState(false);

  const handleUserClick = async (userId) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const conversation = await createConversation(userId);
      if (conversation) {
        setActiveConversation(conversation);
        onClose();
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-2">
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-whatsapp-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && results.length === 0 && query.length >= 2 && (
        <div className="flex flex-col items-center py-8 text-center">
          <IoSearchIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No users found</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Try a different name or email
          </p>
        </div>
      )}

      {results.map((user) => (
        <button
          key={user._id}
          onClick={() => handleUserClick(user._id)}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-light-2 dark:hover:bg-dark-3 transition-colors"
        >
          <Avatar
            src={user.avatar}
            name={user.fullName}
            size="md"
            isOnline={user.isOnline}
          />
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user.fullName}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {user.about || user.email}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default SearchUsers;
