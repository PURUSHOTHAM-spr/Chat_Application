import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      required: [true, "Expense description is required"],
      trim: true,
      maxlength: [100, "Description cannot exceed 100 characters"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    currency: {
      type: String,
      default: "INR",
      enum: ["INR", "USD", "EUR", "GBP"],
    },
    splitType: {
      type: String,
      enum: ["equal", "custom", "percentage"],
      default: "equal",
    },
    // Who paid for the expense (the person who created it by default)
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Individual splits for each participant
    splits: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        isPaid: {
          type: Boolean,
          default: false,
        },
        paidAt: {
          type: Date,
          default: null,
        },
      },
    ],
    // "active" when at least one split is unpaid, "settled" when all paid
    status: {
      type: String,
      enum: ["active", "settled"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching expenses per conversation
expenseSchema.index({ conversationId: 1, createdAt: -1 });
// Index for finding active expenses
expenseSchema.index({ status: 1 });

const Expense = mongoose.model("Expense", expenseSchema);
export default Expense;
