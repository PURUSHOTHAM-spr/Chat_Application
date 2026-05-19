// API and Socket configuration constants

export const API_URL = import.meta.env.VITE_API_URL || "https://chat-application-oi6a.onrender.com/api";
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://chat-application-oi6a.onrender.com";

// Socket event names
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  ERROR: "error",

  // Messages
  MESSAGE_SEND: "message:send",
  MESSAGE_NEW: "message:new",
  MESSAGE_SENT: "message:sent",
  MESSAGE_DELIVERED: "message:delivered",
  MESSAGE_READ: "message:read",
  MESSAGE_STATUS: "message:status",
  MESSAGE_DELETE: "message:delete",
  MESSAGE_DELETED: "message:deleted",

  // Typing
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",

  // Presence
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",

  // Conversations
  CONVERSATION_NEW: "conversation:new",
  GROUP_UPDATED: "group:updated",
  GROUP_REMOVED: "group:removed",

  // Notifications
  NOTIFICATION_NEW: "notification:new",
};

// Message types
export const MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  FILE: "file",
  VOICE: "voice",
  SYSTEM: "system",
};

// Message status
export const MESSAGE_STATUS = {
  SENDING: "sending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
};

// Default avatar placeholder
export const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=128C7E&color=fff&bold=true&name=";

// Chat wallpaper options
export const WALLPAPERS = [
  "",
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80",
  "https://images.unsplash.com/photo-1560015534-cee980ba7e13?w=800&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
];
