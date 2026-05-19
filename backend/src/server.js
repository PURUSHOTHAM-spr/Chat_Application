import "dotenv/config";
import { createServer } from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initializeSocket } from "./config/socket.js";
import socketHandler from "./socket/socketHandler.js";

const PORT = process.env.PORT || 4000;


// Create HTTP server and attach Socket.IO
const httpServer = createServer(app);
const io = initializeSocket(httpServer);

// Register Socket.IO connection handler
io.on("connection", socketHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
      console.log(` Socket.IO ready for connections`);
      console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
