import express from "express";
import protectRoute from "../middleware/auth.js";
import {
  createTask,
  getMyTasks,
  getConversationTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  archiveTask,
  deleteTask,
} from "../controllers/taskController.js";

const router = express.Router();
router.use(protectRoute);

router.post("/", createTask);
router.get("/my", getMyTasks);
router.get("/conversation/:conversationId", getConversationTasks);
router.get("/:taskId", getTask);
router.put("/:taskId", updateTask);
router.patch("/:taskId/status", updateTaskStatus);
router.patch("/:taskId/archive", archiveTask);
router.delete("/:taskId", deleteTask);

export default router;
