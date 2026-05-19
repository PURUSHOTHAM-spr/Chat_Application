import { useRef, useCallback } from "react";
import { getSocket } from "../lib/socket";
import { SOCKET_EVENTS } from "../constants";

/**
 * Custom hook for typing indicator with debouncing.
 * Emits typing:start when user begins typing, and typing:stop after 2s idle.
 */
const useTyping = (conversationId) => {
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const stopTyping = useCallback(() => {
    if (!conversationId) return;
    const socket = getSocket();
    if (!socket) return;

    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [conversationId]);

  const startTyping = useCallback(() => {
    if (!conversationId) return;
    const socket = getSocket();
    if (!socket) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
    }

    // Reset the stop timer
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [conversationId, stopTyping]);

  return { startTyping, stopTyping };
};

export default useTyping;
