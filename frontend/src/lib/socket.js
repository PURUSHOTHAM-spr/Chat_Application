import { io } from "socket.io-client";
import { SOCKET_URL } from "../constants";

let socket = null;

/**
 * Initialize Socket.IO connection with JWT authentication.
 * Returns the existing connection if already connected.
 */
export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  // Allow polling fallback and detailed connect errors for debugging
  socket = io(SOCKET_URL, {
    path: "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket.id);
  });

  socket.on("connect_error", (error) => {
    // Log full error for diagnostics; show short message in UI if needed.
    console.error("Socket connection error:", error);
    if (error && error.message) {
      console.warn("Socket connect_error message:", error.message);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected:", reason);
  });

  return socket;
};

/**
 * Disconnect the socket connection.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Get the current socket instance.
 */
export const getSocket = () => socket;
