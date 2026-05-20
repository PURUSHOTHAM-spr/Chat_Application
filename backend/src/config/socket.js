import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

let io;

/**
 * Initialize Socket.IO server with JWT authentication middleware.
 * Each authenticated user joins a personal room (their userId) for targeted messaging.
 */
export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.CLIENT_URL,
        "https://chat-application-swart-six.vercel.app",
        "http://localhost:5173",
      ].filter(Boolean),
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // JWT authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      // Log handshake attempt for debugging (don't log full token in production)
      console.log("Socket handshake from", socket.handshake.address, "tokenPresent:", !!token);

      if (!token) {
        console.warn("Socket auth failed: missing token");
        return next(new Error("Authentication token required"));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.warn("Socket auth failed: jwt verify error", err.message);
        return next(new Error("Invalid authentication token"));
      }

      const user = await User.findById(decoded.userId).select("-password");
      if (!user) {
        console.warn("Socket auth failed: user not found", decoded.userId);
        return next(new Error("User not found"));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      console.error("Socket auth middleware unexpected error:", error);
      next(new Error("Invalid authentication token"));
    }
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};
