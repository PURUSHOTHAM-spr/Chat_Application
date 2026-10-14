import mongoose from "mongoose";

const taskActivitySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    details: { type: String, default: "", maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sourceMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    sourceMessagePreview: { type: String, default: "", maxlength: 2000 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    description: { type: String, default: "", maxlength: 5000 },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "completed", "cancelled"],
      default: "todo",
      index: true,
    },
    dueAt: { type: Date, default: null, index: true },
    reminderAt: { type: Date, default: null },
    reminderSentAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    activity: { type: [taskActivitySchema], default: [] },
  },
  { timestamps: true }
);

taskSchema.index({ conversationId: 1, createdAt: -1 });
taskSchema.index({ assignedTo: 1, status: 1, dueAt: 1 });

const Task = mongoose.model("Task", taskSchema);
export default Task;
