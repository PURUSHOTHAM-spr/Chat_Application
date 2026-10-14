import ScheduledMessage from "../models/ScheduledMessage.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import Task from "../models/Task.js";
import { getIO } from "../config/socket.js";

/**
 * Background scheduler service.
 * Polls every 30 seconds for:
 * 1. Scheduled messages that are due to be sent
 * 2. Temporary groups that have expired
 *
 * Uses polling instead of per-item setTimeout so it survives server restarts.
 */

let schedulerInterval = null;

/**
 * Process due scheduled messages — finds pending messages whose scheduledAt <= now,
 * creates real Message documents, emits socket events, and marks them as "sent".
 */
const processScheduledMessages = async () => {
  try {
    const dueMessages = await ScheduledMessage.find({
      status: "pending",
      scheduledAt: { $lte: new Date() },
    }).limit(50); // Batch limit for safety

    if (dueMessages.length === 0) return;

    const io = getIO();

    for (const scheduled of dueMessages) {
      try {
        // Verify conversation still exists and user is a participant
        const conversation = await Conversation.findOne({
          _id: scheduled.conversationId,
          participants: scheduled.userId,
        });

        if (!conversation) {
          scheduled.status = "cancelled";
          await scheduled.save();
          continue;
        }

        // Skip if group is expired
        if (conversation.type === "group" && conversation.groupInfo?.isExpired) {
          scheduled.status = "cancelled";
          await scheduled.save();
          continue;
        }

        // Get sender info
        const sender = await User.findById(scheduled.userId).select("fullName avatar");
        if (!sender) {
          scheduled.status = "cancelled";
          await scheduled.save();
          continue;
        }

        // Create the actual message
        const message = await Message.create({
          conversationId: scheduled.conversationId,
          sender: scheduled.userId,
          content: scheduled.content,
          type: scheduled.type,
          fileName: scheduled.fileName || "",
          fileSize: scheduled.fileSize || 0,
          status: "sent",
          readBy: [{ userId: scheduled.userId, readAt: new Date() }],
        });

        await message.populate("sender", "fullName avatar");

        // Update conversation's lastMessage
        conversation.lastMessage = {
          content: scheduled.type === "text" ? scheduled.content : `📎 ${scheduled.type}`,
          sender: scheduled.userId,
          type: scheduled.type,
          createdAt: message.createdAt,
        };

        // Increment unread counts for all participants except sender
        conversation.participants.forEach((pId) => {
          if (pId.toString() !== scheduled.userId.toString()) {
            const current = conversation.unreadCount.get(pId.toString()) || 0;
            conversation.unreadCount.set(pId.toString(), current + 1);
          }
        });

        await conversation.save();

        // Emit to all participants
        conversation.participants.forEach((pId) => {
          if (pId.toString() !== scheduled.userId.toString()) {
            io.to(pId.toString()).emit("message:new", {
              message,
              conversationId: scheduled.conversationId.toString(),
            });
            io.to(pId.toString()).emit("notification:new", {
              type: "message",
              title: conversation.type === "group"
                ? conversation.groupInfo.name
                : sender.fullName,
              body: scheduled.type === "text" ? scheduled.content : `Sent a ${scheduled.type}`,
              conversationId: scheduled.conversationId.toString(),
              sender: {
                _id: scheduled.userId,
                fullName: sender.fullName,
                avatar: sender.avatar,
              },
            });
          }
        });

        // Also emit to sender so their chat updates
        io.to(scheduled.userId.toString()).emit("message:new", {
          message,
          conversationId: scheduled.conversationId.toString(),
        });

        // Mark scheduled message as sent
        scheduled.status = "sent";
        scheduled.sentMessageId = message._id;
        await scheduled.save();

        console.log(`📨 Scheduled message sent: ${scheduled._id}`);
      } catch (err) {
        console.error(`Failed to send scheduled message ${scheduled._id}:`, err);
      }
    }
  } catch (error) {
    console.error("Scheduler — processScheduledMessages error:", error);
  }
};

/**
 * Process expired temporary groups — finds groups whose expiresAt <= now and
 * marks them as expired, notifying all participants.
 */
const processExpiredGroups = async () => {
  try {
    const expiredGroups = await Conversation.find({
      type: "group",
      "groupInfo.expiresAt": { $lte: new Date(), $ne: null },
      "groupInfo.isExpired": false,
    }).limit(20);

    if (expiredGroups.length === 0) return;

    const io = getIO();

    for (const conversation of expiredGroups) {
      try {
        conversation.groupInfo.isExpired = true;
        await conversation.save();

        // Create system message about expiry
        await Message.create({
          conversationId: conversation._id,
          sender: conversation.groupInfo.admin,
          content: `⏰ This temporary group has expired and is now read-only.`,
          type: "system",
        });

        // Notify all participants
        conversation.participants.forEach((pId) => {
          io.to(pId.toString()).emit("group:expired", {
            conversationId: conversation._id.toString(),
            groupName: conversation.groupInfo.name,
          });
        });

        console.log(`⏰ Temporary group expired: ${conversation.groupInfo.name} (${conversation._id})`);
      } catch (err) {
        console.error(`Failed to expire group ${conversation._id}:`, err);
      }
    }
  } catch (error) {
    console.error("Scheduler — processExpiredGroups error:", error);
  }
};

/**
 * Claim due reminders atomically so multiple server instances cannot deliver
 * the same reminder. A claimed reminder is marked before emitting the event.
 */
const processTaskReminders = async () => {
  try {
    const now = new Date();
    for (let i = 0; i < 50; i += 1) {
      const task = await Task.findOneAndUpdate(
        {
          reminderAt: { $lte: now },
          reminderSentAt: null,
          archivedAt: null,
          status: { $nin: ["completed", "cancelled"] },
        },
        { $set: { reminderSentAt: now } },
        { returnDocument: "after" }
      );
      if (!task) break;

      const conversation = await Conversation.findById(task.conversationId);
      if (!conversation || isTaskConversationExpired(conversation)) continue;
      const io = getIO();
      io.to(task.assignedTo.toString()).emit("task:reminder", {
        task,
        conversationId: conversation._id.toString(),
      });
      io.to(task.assignedTo.toString()).emit("notification:new", {
        type: "task_reminder",
        title: "Task reminder",
        body: task.title,
        conversationId: conversation._id,
        taskId: task._id,
      });
    }
  } catch (error) {
    console.error("Scheduler — processTaskReminders error:", error);
  }
};

const isTaskConversationExpired = (conversation) =>
  conversation.type === "group" &&
  (conversation.groupInfo?.isExpired ||
    (conversation.groupInfo?.expiresAt && conversation.groupInfo.expiresAt <= new Date()));

/**
 * Start the background scheduler. Call once from server.js after DB is connected.
 * Runs every 30 seconds.
 */
export const startScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  // Run immediately on startup
  processScheduledMessages();
  processExpiredGroups();
  processTaskReminders();

  // Then run every 30 seconds
  schedulerInterval = setInterval(() => {
    processScheduledMessages();
    processExpiredGroups();
    processTaskReminders();
  }, 30000);

  console.log("🔄 Background scheduler started (30s interval)");
};

/**
 * Stop the background scheduler.
 */
export const stopScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("🔄 Background scheduler stopped");
  }
};
