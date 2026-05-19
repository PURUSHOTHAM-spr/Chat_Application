import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Group-specific fields
    groupInfo: {
      name: { type: String, trim: true },
      description: { type: String, default: "" },
      avatar: { type: String, default: "" },
      admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    // Subset pattern — embedded last message for fast sidebar rendering
    lastMessage: {
      content: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      type: { type: String, default: "text" },
      createdAt: { type: Date, default: Date.now },
    },
    // Per-user unread message count
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    wallpaper: {
      type: String,
      default: "",
    },
    clearedAt: {
      type: Map,
      of: Date,
      default: {},
    },
    deletedAt: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding all conversations a user belongs to
conversationSchema.index({ participants: 1 });
// Index for sorting conversations by most recent activity
conversationSchema.index({ updatedAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
