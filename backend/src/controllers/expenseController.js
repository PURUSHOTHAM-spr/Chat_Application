import Expense from "../models/Expense.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { getIO } from "../config/socket.js";

/**
 * Create a new expense in a group conversation
 * POST /api/expenses
 * Body: { conversationId, description, totalAmount, currency, splitType, splits, paidBy? }
 */
export const createExpense = async (req, res, next) => {
  try {
    const { conversationId, description, totalAmount, currency, splitType = "equal", splits, paidBy } = req.body;

    if (!conversationId || !description || !totalAmount) {
      return res.status(400).json({ message: "conversationId, description, and totalAmount are required" });
    }

    // Verify conversation is a group and user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      type: "group",
      participants: req.user._id,
    }).populate("participants", "fullName avatar");

    if (!conversation) {
      return res.status(404).json({ message: "Group conversation not found" });
    }

    // Check if temporary group is expired
    if (conversation.groupInfo?.isExpired) {
      return res.status(403).json({ message: "This temporary group has expired" });
    }

    const actualPaidBy = paidBy || req.user._id;

    // Calculate splits
    let expenseSplits;
    if (splitType === "equal") {
      const participantIds = splits && splits.length > 0
        ? splits.map(s => s.userId)
        : conversation.participants.map(p => p._id.toString());
      
      const perPerson = Math.round((totalAmount / participantIds.length) * 100) / 100;
      expenseSplits = participantIds.map(userId => ({
        userId,
        amount: perPerson,
        isPaid: userId.toString() === actualPaidBy.toString(), // The payer's share is auto-settled
      }));
    } else if (splitType === "custom" || splitType === "percentage") {
      if (!splits || splits.length === 0) {
        return res.status(400).json({ message: "Splits are required for custom/percentage split type" });
      }

      if (splitType === "percentage") {
        expenseSplits = splits.map(s => ({
          userId: s.userId,
          amount: Math.round((totalAmount * s.amount / 100) * 100) / 100,
          isPaid: s.userId.toString() === actualPaidBy.toString(),
        }));
      } else {
        // Validate custom amounts sum to total
        const sum = splits.reduce((acc, s) => acc + s.amount, 0);
        if (Math.abs(sum - totalAmount) > 0.01) {
          return res.status(400).json({ message: "Custom split amounts must sum to the total" });
        }
        expenseSplits = splits.map(s => ({
          userId: s.userId,
          amount: s.amount,
          isPaid: s.userId.toString() === actualPaidBy.toString(),
        }));
      }
    }

    const expense = await Expense.create({
      conversationId,
      createdBy: req.user._id,
      description,
      totalAmount,
      currency: currency || "INR",
      splitType,
      paidBy: actualPaidBy,
      splits: expenseSplits,
    });

    await expense.populate("createdBy", "fullName avatar");
    await expense.populate("paidBy", "fullName avatar");
    await expense.populate("splits.userId", "fullName avatar");

    // Create system message in the group chat
    const currencySymbols = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
    const symbol = currencySymbols[expense.currency] || expense.currency;
    const systemMessage = await Message.create({
      conversationId,
      sender: req.user._id,
      content: `💰 ${req.user.fullName} added an expense: "${description}" — ${symbol}${totalAmount} (split ${splitType}ly among ${expenseSplits.length} people)`,
      type: "system",
    });

    // Update conversation lastMessage
    conversation.lastMessage = {
      content: `💰 Expense: ${description}`,
      sender: req.user._id,
      type: "system",
      createdAt: systemMessage.createdAt,
    };
    await conversation.save();

    // Emit to all group members
    const io = getIO();
    conversation.participants.forEach((p) => {
      const pId = p._id?.toString() || p.toString();
      io.to(pId).emit("expense:new", { expense, conversationId: conversationId.toString() });
      if (pId !== req.user._id.toString()) {
        io.to(pId).emit("message:new", {
          message: systemMessage,
          conversationId: conversationId.toString(),
        });
      }
    });

    res.status(201).json({ success: true, expense });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all expenses for a group conversation
 * GET /api/expenses/:conversationId
 */
export const getExpenses = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const expenses = await Expense.find({ conversationId })
      .populate("createdBy", "fullName avatar")
      .populate("paidBy", "fullName avatar")
      .populate("splits.userId", "fullName avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, expenses });
  } catch (error) {
    next(error);
  }
};

/**
 * Settle (mark as paid) a user's split in an expense
 * PUT /api/expenses/:id/settle
 */
export const settleExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Find the user's split
    const split = expense.splits.find(
      (s) => s.userId.toString() === req.user._id.toString()
    );

    if (!split) {
      return res.status(404).json({ message: "You are not part of this expense" });
    }

    if (split.isPaid) {
      return res.status(400).json({ message: "Already settled" });
    }

    split.isPaid = true;
    split.paidAt = new Date();

    // Check if all splits are paid
    const allPaid = expense.splits.every((s) => s.isPaid);
    if (allPaid) {
      expense.status = "settled";
    }

    await expense.save();

    await expense.populate("createdBy", "fullName avatar");
    await expense.populate("paidBy", "fullName avatar");
    await expense.populate("splits.userId", "fullName avatar");

    // Notify group members
    const conversation = await Conversation.findById(expense.conversationId);
    if (conversation) {
      const io = getIO();
      conversation.participants.forEach((pId) => {
        io.to(pId.toString()).emit("expense:settled", {
          expense,
          settledBy: req.user._id,
          conversationId: expense.conversationId.toString(),
        });
      });
    }

    res.json({ success: true, expense });
  } catch (error) {
    next(error);
  }
};

/**
 * Get expense summary (net balances) for a group conversation
 * GET /api/expenses/:conversationId/summary
 */
export const getExpenseSummary = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const expenses = await Expense.find({
      conversationId,
      status: "active",
    });

    // Calculate net balances: for each user, how much they owe or are owed
    const balances = {};

    for (const expense of expenses) {
      const payerId = expense.paidBy.toString();

      for (const split of expense.splits) {
        const userId = split.userId.toString();
        if (userId === payerId) continue; // Skip the payer's own split
        if (split.isPaid) continue; // Skip already settled splits

        // This user owes the payer `split.amount`
        if (!balances[userId]) balances[userId] = {};
        if (!balances[payerId]) balances[payerId] = {};

        balances[userId][payerId] = (balances[userId][payerId] || 0) - split.amount;
        balances[payerId][userId] = (balances[payerId][userId] || 0) + split.amount;
      }
    }

    // Simplify: for the current user, compute what they owe and what they're owed
    const currentUserId = req.user._id.toString();
    const userBalances = balances[currentUserId] || {};

    let totalOwed = 0; // What current user owes others
    let totalOwing = 0; // What others owe current user
    const details = [];

    for (const [otherId, amount] of Object.entries(userBalances)) {
      if (amount < 0) {
        totalOwed += Math.abs(amount);
        details.push({ userId: otherId, amount: Math.abs(amount), type: "owe" });
      } else if (amount > 0) {
        totalOwing += amount;
        details.push({ userId: otherId, amount, type: "owed" });
      }
    }

    // Populate user details
    const User = (await import("../models/User.js")).default;
    const userIds = details.map((d) => d.userId);
    const users = await User.find({ _id: { $in: userIds } }).select("fullName avatar");
    const userMap = {};
    users.forEach((u) => { userMap[u._id.toString()] = u; });

    const populatedDetails = details.map((d) => ({
      ...d,
      user: userMap[d.userId] || { fullName: "Unknown", avatar: "" },
    }));

    res.json({
      success: true,
      summary: {
        totalOwed: Math.round(totalOwed * 100) / 100,
        totalOwing: Math.round(totalOwing * 100) / 100,
        net: Math.round((totalOwing - totalOwed) * 100) / 100,
        details: populatedDetails,
        currency: expenses[0]?.currency || "INR",
      },
    });
  } catch (error) {
    next(error);
  }
};
