import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import cloudinary from "../config/cloudinary.js";
import { getIO } from "../config/socket.js";

/**
 * Get messages for a conversation with pagination (infinite scroll)
 * GET /api/messages/:conversationId?page=1&limit=50
 */
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is a participant in this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const clearedAt = conversation.clearedAt?.get(req.user._id.toString());
    const query = { 
      conversationId,
      deletedFor: { $ne: req.user._id }
    };

    if (clearedAt) {
      query.createdAt = { $gt: new Date(clearedAt) };
    }

    const totalMessages = await Message.countDocuments(query);
    const messages = await Message.find(query)
      .populate("sender", "fullName avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Return messages in chronological order
    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total: totalMessages,
        pages: Math.ceil(totalMessages / limit),
        hasMore: skip + limit < totalMessages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a new message
 * POST /api/messages
 * Body: { conversationId, content, type }
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, content, type = "text", fileName, fileSize } = req.body;

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    }).populate("participants", "blockedUsers");

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check block status for direct messages
    if (conversation.type === "direct") {
      const recipient = conversation.participants.find(
        (p) => p._id.toString() !== req.user._id.toString()
      );
      const sender = conversation.participants.find(
        (p) => p._id.toString() === req.user._id.toString()
      );

      if (recipient && sender) {
        if (recipient.blockedUsers.includes(sender._id)) {
          return res.status(403).json({ message: "You cannot send messages to this user." });
        }
        if (sender.blockedUsers.includes(recipient._id)) {
          return res.status(403).json({ message: "You blocked this user. Unblock to send a message." });
        }
      }
    }

    // Create the message
    const message = await Message.create({
      conversationId,
      sender: req.user._id,
      content,
      type,
      fileName: fileName || "",
      fileSize: fileSize || 0,
      status: "sent",
      readBy: [{ userId: req.user._id, readAt: new Date() }],
    });

    // Populate sender info
    await message.populate("sender", "fullName avatar");

    // Update conversation's lastMessage (subset pattern) and unread counts
    conversation.lastMessage = {
      content: type === "text" ? content : `📎 ${type}`,
      sender: req.user._id,
      type,
      createdAt: message.createdAt,
    };

    // Increment unread count for all participants except sender
    conversation.participants.forEach((pId) => {
      if (pId.toString() !== req.user._id.toString()) {
        const current = conversation.unreadCount.get(pId.toString()) || 0;
        conversation.unreadCount.set(pId.toString(), current + 1);
      }
    });

    await conversation.save();

    // Emit message to all participants via Socket.IO
    const io = getIO();
    conversation.participants.forEach((pId) => {
      if (pId.toString() !== req.user._id.toString()) {
        io.to(pId.toString()).emit("message:new", {
          message,
          conversationId,
        });
        // Send notification
        io.to(pId.toString()).emit("notification:new", {
          type: "message",
          title: conversation.type === "group"
            ? conversation.groupInfo.name
            : req.user.fullName,
          body: type === "text" ? content : `Sent a ${type}`,
          conversationId,
          sender: {
            _id: req.user._id,
            fullName: req.user.fullName,
            avatar: req.user.avatar,
          },
        });
      }
    });

    res.status(201).json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark messages as read in a conversation
 * PUT /api/messages/:conversationId/read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    // Update all unread messages in this conversation that the user hasn't read
    const result = await Message.updateMany(
      {
        conversationId,
        sender: { $ne: req.user._id },
        "readBy.userId": { $ne: req.user._id },
      },
      {
        $push: { readBy: { userId: req.user._id, readAt: new Date() } },
        $set: { status: "read" },
      }
    );

    // Reset unread count for this user
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCount.${req.user._id}`]: 0 },
    });

    // Notify senders that their messages were read
    if (result.modifiedCount > 0) {
      const io = getIO();
      const conversation = await Conversation.findById(conversationId);
      conversation.participants.forEach((pId) => {
        if (pId.toString() !== req.user._id.toString()) {
          io.to(pId.toString()).emit("message:read", {
            conversationId,
            readBy: req.user._id,
          });
        }
      });
    }

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a message (soft delete for everyone OR delete for me)
 * DELETE /api/messages/:id?type=me|everyone
 */
export const deleteMessage = async (req, res, next) => {
  try {
    const { type = "everyone" } = req.query;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (type === "everyone") {
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You can only delete your own messages for everyone" });
      }
      message.isDeleted = true;
      message.content = "This message was deleted";
      message.deletedAt = new Date();
      message.reactions = []; // Clear reactions when deleted for everyone
    } else if (type === "me") {
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
      }
    }

    await message.save();

    // Notify other participants about deletion only if type=everyone
    if (type === "everyone") {
      const io = getIO();
      const conversation = await Conversation.findById(message.conversationId);
      conversation.participants.forEach((pId) => {
        if (pId.toString() !== req.user._id.toString()) {
          io.to(pId.toString()).emit("message:deleted", {
            messageId: message._id,
            conversationId: message.conversationId,
          });
        }
      });
    }

    res.json({ success: true, message, type });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload file/image to Cloudinary
 * POST /api/messages/upload
 */
export const uploadFile = async (req, res, next) => {
  try {
    const { file } = req.body; // Base64 encoded file

    if (!file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    console.log("Upload file received, length:", file.length);

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.error("Cloudinary not configured:", {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY ? "set" : "missing",
      });
      return res.status(500).json({ success: false, message: "Upload service not configured" });
    }

    const uploadData = file.startsWith("data:") ? file : `data:audio/webm;base64,${file}`;

    try {
      const result = await cloudinary.uploader.upload(uploadData, {
        folder: "whatsapp-clone/messages",
        resource_type: "auto",
        max_file_size: 10000000, // 10MB
      });

      res.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary error:", cloudinaryError.message);
      throw cloudinaryError;
    }
  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * React to a message
 * POST /api/messages/:id/react
 */
export const reactToMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji is required" });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user already reacted
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingReactionIndex > -1) {
      // If clicking the same emoji, remove it (toggle off)
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Change emoji
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Populate sender info if needed for real-time update
    const io = getIO();
    io.to(message.conversationId.toString()).emit("message:reaction", {
      messageId: message._id,
      conversationId: message.conversationId,
      reactions: message.reactions,
    });

    res.json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear chat for current user
 * POST /api/messages/:conversationId/clear
 */
export const clearChat = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.clearedAt) conversation.clearedAt = new Map();
    conversation.clearedAt.set(req.user._id.toString(), new Date());

    await conversation.save();

    res.json({ success: true, message: "Chat cleared" });
  } catch (error) {
    next(error);
  }
};
