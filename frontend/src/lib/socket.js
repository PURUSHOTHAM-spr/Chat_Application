import { io } from "socket.io-client";
import { SOCKET_URL } from "../constants";

let socket = null;

/**
 * Grace period flag — prevents session:expired from firing during
 * initial connection or page refresh. The backend fix (socket.to vs io.to)
 * handles the server side, but this is a defensive frontend guard.
 */
let connectionGracePeriod = false;

const socketCreationListeners = new Set();

/**
 * Register a listener to be called when a socket instance is created.
 * Immediately invokes the callback if a socket is already present.
 */
export const onSocketCreated = (fn) => {
  socketCreationListeners.add(fn);
  if (socket) {
    try { fn(socket); } catch (e) { console.error("Error in onSocketCreated:", e); }
  }
  return () => socketCreationListeners.delete(fn);
};

/**
 * Initialize Socket.IO connection with JWT authentication.
 * Returns the existing connection if already connected.
 */
export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  // Set grace period before connecting
  connectionGracePeriod = true;

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

  // Trigger all registered listeners with the newly created socket instance
  socketCreationListeners.forEach((fn) => {
    try { fn(socket); } catch (e) { console.error("Error in socket creation listener:", e); }
  });

  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket.id);
    // Allow session:expired events after a brief grace period
    // This prevents logout on page refresh
    setTimeout(() => {
      connectionGracePeriod = false;
    }, 3000);
  });

  socket.on("connect_error", (error) => {
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

/**
 * Check if we're in the connection grace period.
 * During this period, session:expired events should be ignored
 * to prevent logout on page refresh.
 */
export const isInGracePeriod = () => connectionGracePeriod;
