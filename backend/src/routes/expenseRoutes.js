import express from "express";
import {
  createExpense,
  getExpenses,
  settleExpense,
  getExpenseSummary,
} from "../controllers/expenseController.js";
import protectRoute from "../middleware/auth.js";

const router = express.Router();

router.use(protectRoute); // All expense routes are protected

router.post("/", createExpense);
router.get("/:conversationId", getExpenses);
router.get("/:conversationId/summary", getExpenseSummary);
router.put("/:id/settle", settleExpense);

export default router;
