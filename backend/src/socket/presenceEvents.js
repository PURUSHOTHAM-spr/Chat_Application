import User from "../models/User.js";
import { getIO } from "../config/socket.js";

/**
 * Handle online/offline presence events.
 * When a user connects, mark them online and notify contacts.
 * When they disconnect, update lastSeen and notify contacts.
 */
const presenceEvents = (socket) => {
  const io = getIO();

  // Mark user as online when they connect
  const handleOnline = async () => {
    try {
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date(),
      });

      // Broadcast online status to all connected clients
      socket.broadcast.emit("user:online", { userId: socket.userId });
    } catch (error) {
      console.error("Presence online error:", error);
    }
  };

  // Mark user as offline when they disconnect
  const handleOffline = async () => {
    try {
      const lastSeen = new Date();
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen,
      });

      // Broadcast offline status to all connected clients
      socket.broadcast.emit("user:offline", {
        userId: socket.userId,
        lastSeen,
      });
    } catch (error) {
      console.error("Presence offline error:", error);
    }
  };

  handleOnline();
  socket.on("disconnect", handleOffline);
};

export default presenceEvents;
