import express from "express";
import {
  searchUsers,
  getProfile,
  updateProfile,
  updateAvatar,
  getUserById,
} from "../controllers/userController.js";
import protectRoute from "../middleware/auth.js";

const router = express.Router();

router.use(protectRoute); // All user routes are protected

router.get("/search", searchUsers);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/avatar", updateAvatar);
router.get("/:id", getUserById);

export default router;
