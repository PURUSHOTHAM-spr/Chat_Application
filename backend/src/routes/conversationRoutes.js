import express from "express";
import {
  getConversations,
  createDirectConversation,
  createGroupConversation,
  updateGroup,
  addGroupMembers,
  removeGroupMember,
  setWallpaper,
  deleteConversation,
} from "../controllers/conversationController.js";
import protectRoute from "../middleware/auth.js";

const router = express.Router();

router.use(protectRoute); // All conversation routes are protected

router.get("/", getConversations);
router.post("/", createDirectConversation);
router.post("/group", createGroupConversation);
router.put("/:id/group", updateGroup);
router.post("/:id/members", addGroupMembers);
router.delete("/:id/members/:userId", removeGroupMember);
router.put("/:id/wallpaper", setWallpaper);
router.delete("/:id", deleteConversation);

export default router;
