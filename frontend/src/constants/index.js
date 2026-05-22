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

// ICE servers configuration.
// Uses Google STUN servers + Metered.ca free TURN servers for cross-network calling.
// Set VITE_METERED_API_KEY env var with your free Metered.ca API key.
// Sign up free at: https://www.metered.ca/stun-turn

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

// Static fallback: STUN only (works on same network, fails across NATs)
export const ICE_SERVERS = (() => {
  try {
    const raw = import.meta.env.VITE_ICE_SERVERS;
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallthrough
  }

  const servers = [...STUN_SERVERS];

  // Add TURN server if configured via env vars
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }

  return servers;
})();

/**
 * Fetch fresh TURN server credentials from Metered.ca API.
 * Returns ICE servers array with both STUN and TURN servers.
 * Falls back to STUN-only if fetch fails.
 */
let cachedTurnServers = null;
let turnCacheTime = 0;
const TURN_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const METERED_API_URL =
  "https://chatapp1234.metered.live/api/v1/turn/credentials?apiKey=a4bdc35f7b6039a292ef5743e09b37f2dca7";

export const fetchIceServers = async () => {
  // Return cached if still fresh
  if (cachedTurnServers && (Date.now() - turnCacheTime) < TURN_CACHE_TTL) {
    return cachedTurnServers;
  }

  try {
    const resp = await fetch(METERED_API_URL);
    if (!resp.ok) throw new Error(`Metered API returned ${resp.status}`);
    const turnServers = await resp.json();
    cachedTurnServers = [...STUN_SERVERS, ...turnServers];
    turnCacheTime = Date.now();
    console.log("✅ TURN servers fetched:", cachedTurnServers.length, "servers");
    return cachedTurnServers;
  } catch (err) {
    console.error("❌ Failed to fetch TURN credentials:", err);
    console.warn("⚠️ Falling back to STUN-only — cross-network calls may fail.");
    return ICE_SERVERS;
  }
};

// Optional max video bitrate (kbps) for low-bandwidth optimization
export const MAX_VIDEO_KBPS = import.meta.env.VITE_MAX_VIDEO_KBPS ? Number(import.meta.env.VITE_MAX_VIDEO_KBPS) : null;
