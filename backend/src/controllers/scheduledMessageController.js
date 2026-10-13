import ScheduledMessage from "../models/ScheduledMessage.js";
import Conversation from "../models/Conversation.js";

/**
 * Create a scheduled message
 * POST /api/scheduled-messages
 * Body: { conversationId, content, type, scheduledAt, fileName?, fileSize? }
 */
export const createScheduledMessage = async (req, res, next) => {
  try {
    const { conversationId, content, type = "text", scheduledAt, fileName, fileSize } = req.body;

    if (!conversationId || !content || !scheduledAt) {
      return res.status(400).json({ message: "conversationId, content, and scheduledAt are required" });
    }

    const scheduleDate = new Date(scheduledAt);
    if (scheduleDate <= new Date()) {
      return res.status(400).json({ message: "Scheduled time must be in the future" });
    }

    // Verify user is a participant in the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const scheduled = await ScheduledMessage.create({
      userId: req.user._id,
      conversationId,
      content,
      type,
      scheduledAt: scheduleDate,
      fileName: fileName || "",
      fileSize: fileSize || 0,
    });

    res.status(201).json({ success: true, scheduledMessage: scheduled });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all pending scheduled messages for the current user
 * GET /api/scheduled-messages
 */
export const getScheduledMessages = async (req, res, next) => {
  try {
    const messages = await ScheduledMessage.find({
      userId: req.user._id,
      status: "pending",
    })
      .populate("conversationId", "type groupInfo participants")
      .sort({ scheduledAt: 1 });

    // Populate conversation participants for display names
    await ScheduledMessage.populate(messages, {
      path: "conversationId.participants",
      select: "fullName avatar",
      model: "User",
    });

    res.json({ success: true, scheduledMessages: messages });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a scheduled message (content, scheduledAt)
 * PUT /api/scheduled-messages/:id
 */
export const updateScheduledMessage = async (req, res, next) => {
  try {
    const { content, scheduledAt } = req.body;
    const scheduled = await ScheduledMessage.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: "pending",
    });

    if (!scheduled) {
      return res.status(404).json({ message: "Scheduled message not found" });
    }

    if (content) scheduled.content = content;
    if (scheduledAt) {
      const scheduleDate = new Date(scheduledAt);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }
      scheduled.scheduledAt = scheduleDate;
    }

    await scheduled.save();
    res.json({ success: true, scheduledMessage: scheduled });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a scheduled message
 * DELETE /api/scheduled-messages/:id
 */
export const cancelScheduledMessage = async (req, res, next) => {
  try {
    const scheduled = await ScheduledMessage.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: "pending",
    });

    if (!scheduled) {
      return res.status(404).json({ message: "Scheduled message not found" });
    }

    scheduled.status = "cancelled";
    await scheduled.save();

    res.json({ success: true, message: "Scheduled message cancelled" });
  } catch (error) {
    next(error);
  }
};
