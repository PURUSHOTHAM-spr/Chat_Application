import { DEFAULT_AVATAR } from "../constants";

/**
 * Format a date/time for message timestamps.
 * Shows "HH:MM" for today, "Yesterday" for yesterday, or "MM/DD/YYYY".
 */
export const formatMessageTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const time = `${hours}:${minutes}`;

  // Same day
  if (date.toDateString() === now.toDateString()) {
    return time;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  // Within last week
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  // Older
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

/**
 * Format full message time with date and time.
 */
export const formatFullTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
};

/**
 * Format "last seen" time in a human-readable way.
 */
export const formatLastSeen = (dateStr) => {
  if (!dateStr) return "a while ago";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

  return formatMessageTime(dateStr);
};

/**
 * Get avatar URL with fallback to initial-based placeholder.
 */
export const getAvatarUrl = (avatar, name = "User") => {
  if (avatar && avatar.length > 0) return avatar;
  return DEFAULT_AVATAR + encodeURIComponent(name);
};

/**
 * Truncate text with ellipsis.
 */
export const truncate = (text, maxLength = 40) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

/**
 * Generate a unique temporary ID for optimistic updates.
 */
export const generateTempId = () => {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Convert file to base64 for upload.
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Format file size in human-readable format.
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

/**
 * Get the other participant in a direct conversation.
 */
export const getOtherParticipant = (conversation, currentUserId) => {
  if (!conversation?.participants) return null;
  return conversation.participants.find(
    (p) => (p._id || p) !== currentUserId
  );
};

/**
 * Get conversation display name.
 */
export const getConversationName = (conversation, currentUserId) => {
  if (conversation?.type === "group") {
    return conversation.groupInfo?.name || "Group";
  }
  const other = getOtherParticipant(conversation, currentUserId);
  return other?.fullName || "Unknown";
};

/**
 * Get conversation avatar.
 */
export const getConversationAvatar = (conversation, currentUserId) => {
  if (conversation?.type === "group") {
    return getAvatarUrl(conversation.groupInfo?.avatar, conversation.groupInfo?.name);
  }
  const other = getOtherParticipant(conversation, currentUserId);
  return getAvatarUrl(other?.avatar, other?.fullName);
};
