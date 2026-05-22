import { getIO } from "../config/socket.js";

/**
 * callEvents(socket)
 * Handles WebRTC signaling events between two peers using Socket.IO.
 * Events handled:
 * - call:offer -> forward SDP offer to callee
 * - call:answer -> forward SDP answer to caller
 * - call:ice-candidate -> forward ICE candidates
 * - call:ring -> notify callee of incoming call
 * - call:hangup -> notify remote peer to end call
 * - call:reject -> notify caller that callee rejected
 * - call:missed -> record missed call notification
 *
 * Each event forwards the payload to the target user's personal room (userId).
 */
const callEvents = (socket) => {
  const io = getIO();

  // Send an offer to the callee
  socket.on("call:offer", ({ to, offer, meta }) => {
    if (!to) return;
    console.log(`📞 FORWARDING OFFER: ${socket.userId} → ${to} (type: ${meta?.type || "unknown"})`);
    io.to(to).emit("call:offer", { from: socket.userId, offer, meta });
  });

  // Send an answer back to the caller
  socket.on("call:answer", ({ to, answer }) => {
    if (!to) return;
    console.log(`📞 FORWARDING ANSWER: ${socket.userId} → ${to}`);
    io.to(to).emit("call:answer", { from: socket.userId, answer });
  });

  // Exchange ICE candidates
  socket.on("call:ice-candidate", ({ to, candidate }) => {
    if (!to) return;
    console.log(`🧊 FORWARDING ICE: ${socket.userId} → ${to}`);
    io.to(to).emit("call:ice-candidate", { from: socket.userId, candidate });
  });

  // Notify callee of incoming call (ringing)
  socket.on("call:ring", ({ to, callId, meta }) => {
    if (!to) return;
    console.log(`🔔 FORWARDING RING: ${socket.userId} → ${to} (callId: ${callId})`);
    io.to(to).emit("call:ring", { from: socket.userId, callId, meta });
  });

  // Hangup
  socket.on("call:hangup", ({ to, reason }) => {
    if (!to) return;
    console.log(`📴 FORWARDING HANGUP: ${socket.userId} → ${to} (reason: ${reason})`);
    io.to(to).emit("call:hangup", { from: socket.userId, reason });
  });

  // Reject (callee -> caller)
  socket.on("call:reject", ({ to, reason }) => {
    if (!to) return;
    io.to(to).emit("call:reject", { from: socket.userId, reason });
  });

  // Notify missed call (for notifications)
  socket.on("call:missed", ({ to, meta }) => {
    if (!to) return;
    io.to(to).emit("call:missed", { from: socket.userId, meta });
  });

  // Clean up on disconnect
  socket.on("disconnect", () => {
    // no-op for now; presenceEvents handles status
  });
};

export default callEvents;
