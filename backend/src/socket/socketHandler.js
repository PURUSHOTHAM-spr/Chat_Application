import chatEvents from "./chatEvents.js";
import typingEvents from "./typingEvents.js";
import presenceEvents from "./presenceEvents.js";
import Conversation from "../models/Conversation.js";

/**
 * Main socket handler — orchestrates all socket event modules.
 * Called once per new socket connection after JWT authentication.
 */
const socketHandler = async (socket) => {
  console.log(`🔌 User connected: ${socket.user.fullName} (${socket.userId})`);

  // Join the user to their personal room (userId) for targeted messaging
  socket.join(socket.userId);

  // Also join all conversation rooms the user belongs to
  try {
    const conversations = await Conversation.find({
      participants: socket.userId,
    });
    conversations.forEach((conv) => {
      socket.join(conv._id.toString());
    });
  } catch (error) {
    console.error("Error joining conversation rooms:", error);
  }

  // Register all event handlers
  chatEvents(socket);
  typingEvents(socket);
  presenceEvents(socket);

  // Handle errors
  socket.on("error", (error) => {
    console.error(`Socket error for ${socket.userId}:`, error);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 User disconnected: ${socket.user.fullName} (${socket.userId})`);
  });
};

export default socketHandler;
