import express from "express";
import {
  createScheduledMessage,
  getScheduledMessages,
  updateScheduledMessage,
  cancelScheduledMessage,
} from "../controllers/scheduledMessageController.js";
import protectRoute from "../middleware/auth.js";

const router = express.Router();

router.use(protectRoute); // All scheduled message routes are protected

router.post("/", createScheduledMessage);
router.get("/", getScheduledMessages);
router.put("/:id", updateScheduledMessage);
router.delete("/:id", cancelScheduledMessage);

export default router;
