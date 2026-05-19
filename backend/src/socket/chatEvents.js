import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import { getIO } from "../config/socket.js";

/**
 * Handle all chat-related socket events: message sending, delivery, and read receipts.
 */
const chatEvents = (socket) => {
  const io = getIO();

  // Handle sending a message via socket (real-time path)
  socket.on("message:send", async (data) => {
    try {
      const { conversationId, content, type = "text", tempId, fileName, fileSize } = data;

      // Verify the user is a participant
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: socket.userId,
      });

      if (!conversation) {
        return socket.emit("error", { message: "Conversation not found" });
      }

      // Create message in database
      const message = await Message.create({
        conversationId,
        sender: socket.userId,
        content,
        type,
        fileName: fileName || "",
        fileSize: fileSize || 0,
        status: "sent",
        readBy: [{ userId: socket.userId, readAt: new Date() }],
      });

      await message.populate("sender", "fullName avatar");

      // Update conversation's lastMessage
      conversation.lastMessage = {
        content: type === "text" ? content : `📎 ${type}`,
        sender: socket.userId,
        type,
        createdAt: message.createdAt,
      };

      // Increment unread counts for other participants
      conversation.participants.forEach((pId) => {
        if (pId.toString() !== socket.userId) {
          const current = conversation.unreadCount.get(pId.toString()) || 0;
          conversation.unreadCount.set(pId.toString(), current + 1);
        }
      });

      await conversation.save();

      // Confirm message sent to sender (with tempId for optimistic UI matching)
      socket.emit("message:sent", { message, tempId });

      // Send message to all other participants
      conversation.participants.forEach((pId) => {
        if (pId.toString() !== socket.userId) {
          io.to(pId.toString()).emit("message:new", { message, conversationId });
          io.to(pId.toString()).emit("notification:new", {
            type: "message",
            title: conversation.type === "group"
              ? conversation.groupInfo.name
              : socket.user.fullName,
            body: type === "text" ? content : `Sent a ${type}`,
            conversationId,
            sender: {
              _id: socket.userId,
              fullName: socket.user.fullName,
              avatar: socket.user.avatar,
            },
          });
        }
      });
    } catch (error) {
      console.error("message:send error:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Handle message delivered acknowledgment
  socket.on("message:delivered", async (data) => {
    try {
      const { messageId } = data;
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status: "delivered" },
        { new: true }
      );

      if (message) {
        io.to(message.sender.toString()).emit("message:status", {
          messageId,
          status: "delivered",
        });
      }
    } catch (error) {
      console.error("message:delivered error:", error);
    }
  });

  // Handle messages read
  socket.on("message:read", async (data) => {
    try {
      const { conversationId } = data;

      // Mark all unread messages as read
      await Message.updateMany(
        {
          conversationId,
          sender: { $ne: socket.userId },
          "readBy.userId": { $ne: socket.userId },
        },
        {
          $push: { readBy: { userId: socket.userId, readAt: new Date() } },
          $set: { status: "read" },
        }
      );

      // Reset unread count
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: { [`unreadCount.${socket.userId}`]: 0 },
      });

      // Notify other participants about read status
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        conversation.participants.forEach((pId) => {
          if (pId.toString() !== socket.userId) {
            io.to(pId.toString()).emit("message:read", {
              conversationId,
              readBy: socket.userId,
            });
          }
        });
      }
    } catch (error) {
      console.error("message:read error:", error);
    }
  });

  // Handle message deletion
  socket.on("message:delete", async (data) => {
    try {
      const { messageId } = data;
      const message = await Message.findById(messageId);

      if (!message || message.sender.toString() !== socket.userId) return;

      message.isDeleted = true;
      message.content = "This message was deleted";
      message.deletedAt = new Date();
      await message.save();

      const conversation = await Conversation.findById(message.conversationId);
      if (conversation) {
        conversation.participants.forEach((pId) => {
          io.to(pId.toString()).emit("message:deleted", {
            messageId,
            conversationId: message.conversationId,
          });
        });
      }
    } catch (error) {
      console.error("message:delete error:", error);
    }
  });
};

export default chatEvents;
