import express from "express";
import {
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  uploadFile,
  reactToMessage,
  clearChat,
} from "../controllers/messageController.js";
import protectRoute from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(protectRoute); // All message routes are protected

router.get("/:conversationId", getMessages);
router.post("/", sendMessage);
router.put("/:conversationId/read", markAsRead);
router.post("/:conversationId/clear", clearChat);
router.delete("/:id", deleteMessage);
router.post("/upload", uploadLimiter, uploadFile);
router.post("/:id/react", reactToMessage);

export default router;
