import express from "express";
import { register, login, logout, checkAuth } from "../controllers/authController.js";
import protectRoute from "../middleware/auth.js";
import { registerRules, loginRules, validate } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", authLimiter, registerRules, validate, register);
router.post("/login", authLimiter, loginRules, validate, login);
router.post("/logout", logout);
router.get("/check", protectRoute, checkAuth);

export default router;
