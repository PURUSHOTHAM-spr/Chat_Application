import { getIO } from "../config/socket.js";
import Conversation from "../models/Conversation.js";

/**
 * Handle typing indicator events.
 * Uses debouncing on the client side to avoid flooding.
 */
const typingEvents = (socket) => {
  const io = getIO();

  socket.on("typing:start", async (data) => {
    try {
      const { conversationId } = data;

      // Notify other participants in the conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      conversation.participants.forEach((pId) => {
        if (pId.toString() !== socket.userId) {
          io.to(pId.toString()).emit("typing:start", {
            conversationId,
            userId: socket.userId,
            userName: socket.user.fullName,
          });
        }
      });
    } catch (error) {
      console.error("typing:start error:", error);
    }
  });

  socket.on("typing:stop", async (data) => {
    try {
      const { conversationId } = data;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      conversation.participants.forEach((pId) => {
        if (pId.toString() !== socket.userId) {
          io.to(pId.toString()).emit("typing:stop", {
            conversationId,
            userId: socket.userId,
          });
        }
      });
    } catch (error) {
      console.error("typing:stop error:", error);
    }
  });
};

export default typingEvents;
