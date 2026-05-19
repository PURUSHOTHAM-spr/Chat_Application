import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { getIO } from "../config/socket.js";

/**
 * Get all conversations for the current user, sorted by latest activity
 * GET /api/conversations
 */
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "fullName email avatar isOnline lastSeen")
      .populate("lastMessage.sender", "fullName")
      .populate("groupInfo.admin", "fullName")
      .sort({ updatedAt: -1 });

    // Deduplicate direct conversations to fix race condition bugs
    const seenDirects = new Set();
    const uniqueConversations = conversations.filter((conv) => {
      if (conv.type === "direct") {
        const participantIds = conv.participants
          .map((p) => p._id.toString())
          .sort()
          .join("_");
        if (seenDirects.has(participantIds)) {
          return false;
        }
        seenDirects.add(participantIds);
      }
      return true;
    });

    res.json({ success: true, conversations: uniqueConversations });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or get existing direct conversation between two users
 * POST /api/conversations
 * Body: { participantId }
 */
export const createDirectConversation = async (req, res, next) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: "Participant ID is required" });
    }

    if (participantId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot create conversation with yourself" });
    }

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if direct conversation already exists between these two users
    let conversation = await Conversation.findOne({
      type: "direct",
      participants: { $all: [req.user._id, participantId], $size: 2 },
    })
      .populate("participants", "fullName email avatar isOnline lastSeen")
      .populate("lastMessage.sender", "fullName");

    if (conversation) {
      return res.json({ success: true, conversation, isNew: false });
    }

    // Create new direct conversation
    conversation = await Conversation.create({
      type: "direct",
      participants: [req.user._id, participantId],
    });

    conversation = await conversation.populate(
      "participants",
      "fullName email avatar isOnline lastSeen"
    );

    // Notify the other participant about the new conversation via Socket.IO
    const io = getIO();
    io.to(participantId).emit("conversation:new", { conversation });

    res.status(201).json({ success: true, conversation, isNew: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a group conversation
 * POST /api/conversations/group
 * Body: { name, participants, description?, avatar? }
 */
export const createGroupConversation = async (req, res, next) => {
  try {
    const { name, participants, description, avatar } = req.body;

    if (!name || !participants || participants.length < 2) {
      return res.status(400).json({
        message: "Group name and at least 2 other participants are required",
      });
    }

    if (participants.length > 99) {
      return res.status(400).json({
        message: "Group capacity is limited to 100 members",
      });
    }

    // Include the creator in participants
    const allParticipants = [...new Set([req.user._id.toString(), ...participants])];

    const conversation = await Conversation.create({
      type: "group",
      participants: allParticipants,
      groupInfo: {
        name,
        description: description || "",
        avatar: avatar || "",
        admin: req.user._id,
      },
    });

    const populated = await conversation.populate(
      "participants",
      "fullName email avatar isOnline lastSeen"
    );

    // Create system message for group creation
    await Message.create({
      conversationId: conversation._id,
      sender: req.user._id,
      content: `${req.user.fullName} created group "${name}"`,
      type: "system",
    });

    // Notify all group members
    const io = getIO();
    allParticipants.forEach((pId) => {
      if (pId !== req.user._id.toString()) {
        io.to(pId).emit("conversation:new", { conversation: populated });
      }
    });

    res.status(201).json({ success: true, conversation: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * Update group info (name, description, avatar) — admin only
 * PUT /api/conversations/:id/group
 */
export const updateGroup = async (req, res, next) => {
  try {
    const { name, description, avatar } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ message: "Group not found" });
    }

    if (conversation.groupInfo.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the admin can update the group" });
    }

    if (name) conversation.groupInfo.name = name;
    if (description !== undefined) conversation.groupInfo.description = description;
    if (avatar) conversation.groupInfo.avatar = avatar;

    await conversation.save();

    const populated = await conversation.populate(
      "participants",
      "fullName email avatar isOnline lastSeen"
    );

    // Notify group members
    const io = getIO();
    conversation.participants.forEach((pId) => {
      io.to(pId.toString()).emit("group:updated", { conversation: populated });
    });

    res.json({ success: true, conversation: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * Add members to group — admin only
 * POST /api/conversations/:id/members
 * Body: { members: [userId1, userId2, ...] }
 */
export const addGroupMembers = async (req, res, next) => {
  try {
    const { members } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ message: "Group not found" });
    }

    if (conversation.groupInfo.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the admin can add members" });
    }

    // Add only new members
    const newMembers = members.filter(
      (m) => !conversation.participants.map((p) => p.toString()).includes(m)
    );

    if (conversation.participants.length + newMembers.length > 100) {
      return res.status(400).json({ message: "Adding these members would exceed the 100 member limit" });
    }

    conversation.participants.push(...newMembers);
    await conversation.save();

    const populated = await conversation.populate(
      "participants",
      "fullName email avatar isOnline lastSeen"
    );

    // Notify new members
    const io = getIO();
    newMembers.forEach((mId) => {
      io.to(mId).emit("conversation:new", { conversation: populated });
    });

    res.json({ success: true, conversation: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a member from group — admin only
 * DELETE /api/conversations/:id/members/:userId
 */
export const removeGroupMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const conversation = await Conversation.findById(id);

    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ message: "Group not found" });
    }

    const isAdmin = conversation.groupInfo.admin.toString() === req.user._id.toString();
    const isSelf = userId === req.user._id.toString();

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: "Only the admin can remove members" });
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== userId
    );
    await conversation.save();

    const populated = await conversation.populate(
      "participants",
      "fullName email avatar isOnline lastSeen"
    );

    // Notify removed user
    const io = getIO();
    io.to(userId).emit("group:removed", { conversationId: id });

    res.json({ success: true, conversation: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * Set chat wallpaper for a conversation
 * PUT /api/conversations/:id/wallpaper
 */
export const setWallpaper = async (req, res, next) => {
  try {
    const { wallpaper } = req.body;

    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { wallpaper },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    res.json({ success: true, conversation });
  } catch (error) {
    next(error);
  }
};
