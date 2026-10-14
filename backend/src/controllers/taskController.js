import mongoose from "mongoose";
import Task from "../models/Task.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { getIO } from "../config/socket.js";

const isId = (value) => mongoose.isValidObjectId(value);

const getConversationForUser = async (conversationId, userId) => {
  if (!isId(conversationId)) return null;
  return Conversation.findOne({ _id: conversationId, participants: userId });
};

const isExpired = (conversation) =>
  conversation?.type === "group" &&
  (conversation.groupInfo?.isExpired ||
    (conversation.groupInfo?.expiresAt && conversation.groupInfo.expiresAt <= new Date()));

const canManage = (task, conversation, userId) =>
  task.createdBy._id?.toString?.() === userId.toString() ||
  task.createdBy.toString() === userId.toString() ||
  (conversation.type === "group" &&
    conversation.groupInfo?.admin?.toString() === userId.toString());

const serializeTask = (task) => task;

const emitTask = (event, task, conversation) => {
  const io = getIO();
  conversation.participants.forEach((participant) => {
    io.to(participant.toString()).emit(event, {
      task,
      conversationId: conversation._id.toString(),
    });
  });
};

const notify = (userId, notification) => {
  getIO().to(userId.toString()).emit("notification:new", notification);
};

export const createTask = async (req, res, next) => {
  try {
    const {
      conversationId,
      sourceMessageId,
      title,
      description = "",
      assignedTo,
      dueAt,
      reminderAt,
      priority = "medium",
      status = "todo",
    } = req.body;

    if (!isId(conversationId) || !isId(assignedTo) || !title?.trim()) {
      return res.status(400).json({ message: "conversationId, assignedTo, and title are required" });
    }

    const conversation = await getConversationForUser(conversationId, req.user._id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (isExpired(conversation)) return res.status(410).json({ message: "This group has expired" });

    const participantIds = conversation.participants.map((id) => id.toString());
    if (!participantIds.includes(assignedTo.toString())) {
      return res.status(403).json({ message: "Assignee must be a conversation participant" });
    }

    let sourceMessage = null;
    if (sourceMessageId) {
      if (!isId(sourceMessageId)) return res.status(400).json({ message: "Invalid source message ID" });
      sourceMessage = await Message.findOne({
        _id: sourceMessageId,
        conversationId,
        deletedFor: { $ne: req.user._id },
      }).select("content type sender createdAt isDeleted");
      if (sourceMessage?.isDeleted) sourceMessage = null;
    }

    const task = await Task.create({
      conversationId,
      sourceMessageId: sourceMessage?._id || null,
      sourceMessagePreview: sourceMessage?.content || "",
      createdBy: req.user._id,
      assignedTo,
      title: title.trim(),
      description,
      dueAt: dueAt || null,
      reminderAt: reminderAt || null,
      priority,
      status,
      completedAt: status === "completed" ? new Date() : null,
      activity: [{ action: "created", by: req.user._id }],
    });

    await task.populate([
      { path: "createdBy", select: "fullName avatar" },
      { path: "assignedTo", select: "fullName avatar" },
      { path: "sourceMessageId", select: "content sender createdAt isDeleted" },
      { path: "activity.by", select: "fullName avatar" },
    ]);

    emitTask("task:created", serializeTask(task), conversation);
    if (assignedTo.toString() !== req.user._id.toString()) {
      notify(assignedTo, {
        type: "task_assigned",
        title: "Task assigned to you",
        body: task.title,
        conversationId: conversation._id,
        taskId: task._id,
      });
    }

    return res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

export const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({
      archivedAt: null,
      $or: [{ assignedTo: req.user._id }, { createdBy: req.user._id }],
    })
      .populate("createdBy assignedTo", "fullName avatar")
      .populate("sourceMessageId", "content sender createdAt isDeleted")
      .sort({ dueAt: 1, createdAt: -1 });
    res.json({ success: true, tasks });
  } catch (error) {
    next(error);
  }
};

export const getConversationTasks = async (req, res, next) => {
  try {
    const conversation = await getConversationForUser(req.params.conversationId, req.user._id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    const { status, priority, assignedTo, search } = req.query;
    const query = { conversationId: conversation._id, archivedAt: null };
    if (["todo", "in_progress", "completed", "cancelled"].includes(status)) query.status = status;
    if (["low", "medium", "high", "urgent"].includes(priority)) query.priority = priority;
    if (assignedTo && isId(assignedTo)) query.assignedTo = assignedTo;
    if (search?.trim()) query.$or = [
      { title: { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } },
    ];

    const tasks = await Task.find(query)
      .populate("createdBy assignedTo", "fullName avatar")
      .populate("sourceMessageId", "content sender createdAt isDeleted")
      .sort({ dueAt: 1, createdAt: -1 });
    res.json({ success: true, tasks });
  } catch (error) {
    next(error);
  }
};

export const getTask = async (req, res, next) => {
  try {
    if (!isId(req.params.taskId)) return res.status(400).json({ message: "Invalid task ID" });
    const task = await Task.findById(req.params.taskId)
      .populate("createdBy assignedTo", "fullName avatar")
      .populate("sourceMessageId", "content sender createdAt isDeleted")
      .populate("activity.by", "fullName avatar");
    if (!task) return res.status(404).json({ message: "Task not found" });
    const conversation = await getConversationForUser(task.conversationId, req.user._id);
    if (!conversation) return res.status(403).json({ message: "You are not a conversation participant" });
    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    if (!isId(req.params.taskId)) return res.status(400).json({ message: "Invalid task ID" });
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const conversation = await getConversationForUser(task.conversationId, req.user._id);
    if (!conversation) return res.status(403).json({ message: "You are not a conversation participant" });
    if (isExpired(conversation)) return res.status(410).json({ message: "This group has expired" });
    if (!canManage(task, conversation, req.user._id) && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You do not have permission to edit this task" });
    }

    const allowed = ["title", "description", "dueAt", "reminderAt", "priority", "status", "assignedTo", "archivedAt"];
    const changes = {};
    for (const key of allowed) if (req.body[key] !== undefined) changes[key] = req.body[key];
    if (changes.archivedAt && !canManage(task, conversation, req.user._id)) {
      return res.status(403).json({ message: "Only the task creator or group admin can archive this task" });
    }
    if (changes.assignedTo && (!isId(changes.assignedTo) ||
      !(await Conversation.exists({ _id: conversation._id, participants: changes.assignedTo })))) {
      return res.status(400).json({ message: "Assignee must be a conversation participant" });
    }
    if (changes.status === "completed") changes.completedAt = new Date();
    if (changes.status && changes.status !== "completed") changes.completedAt = null;
    Object.assign(task, changes);
    task.activity.push({ action: "updated", by: req.user._id, details: Object.keys(changes).join(", ") });
    await task.save();
    await task.populate([
      { path: "createdBy assignedTo", select: "fullName avatar" },
      { path: "sourceMessageId", select: "content sender createdAt isDeleted" },
      { path: "activity.by", select: "fullName avatar" },
    ]);
    emitTask(changes.status === "completed" ? "task:completed" : "task:updated", task, conversation);
    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (req, res, next) => {
  req.body = { status: req.body.status };
  return updateTask(req, res, next);
};

export const archiveTask = async (req, res, next) => {
  req.body = { archivedAt: new Date() };
  return updateTask(req, res, next);
};

export const deleteTask = async (req, res, next) => {
  try {
    if (!isId(req.params.taskId)) return res.status(400).json({ message: "Invalid task ID" });
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const conversation = await getConversationForUser(task.conversationId, req.user._id);
    if (!conversation) return res.status(403).json({ message: "You are not a conversation participant" });
    if (!canManage(task, conversation, req.user._id)) return res.status(403).json({ message: "You cannot delete this task" });
    await task.deleteOne();
    emitTask("task:deleted", { _id: task._id }, conversation);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
