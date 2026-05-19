import express from "express";
import {
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  uploadFile,
} from "../controllers/messageController.js";
import protectRoute from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(protectRoute); // All message routes are protected

router.get("/:conversationId", getMessages);
router.post("/", sendMessage);
router.put("/:conversationId/read", markAsRead);
router.delete("/:id", deleteMessage);
router.post("/upload", uploadLimiter, uploadFile);

export default router;
