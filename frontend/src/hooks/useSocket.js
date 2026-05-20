import { useEffect } from "react";
import { getSocket, isInGracePeriod } from "../lib/socket";
import { SOCKET_EVENTS } from "../constants";
import useChatStore from "../store/useChatStore";
import useNotificationStore from "../store/useNotificationStore";
import useAuthStore from "../store/useAuthStore";

/**
 * Custom hook that sets up all Socket.IO event listeners.
 * Connects incoming socket events to Zustand store actions.
 * Should be called once in the main app component after authentication.
 */
const useSocket = () => {
  const {
    addIncomingMessage,
    addConversation,
    setUserOnline,
    setUserOffline,
    setTypingUser,
    removeTypingUser,
    updateMessageReadStatus,
    handleMessageDeleted,
    fetchConversations,
    updateUserInConversations,
    handleMessageReaction,
  } = useChatStore();

  const { addNotification } = useNotificationStore();
  const { forceLogout } = useAuthStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // --- Message events ---
    const handleNewMessage = ({ message, conversationId }) => {
      addIncomingMessage(message, conversationId);
      // Auto-deliver acknowledgment
      socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, { messageId: message._id });
    };

    const handleMessageRead = ({ conversationId, readBy }) => {
      updateMessageReadStatus(conversationId, readBy);
    };

    const handleDeleted = ({ messageId }) => {
      handleMessageDeleted(messageId);
    };

    // --- Presence events ---
    const handleUserOnline = ({ userId }) => {
      setUserOnline(userId);
    };

    const handleUserOffline = ({ userId }) => {
      setUserOffline(userId);
    };

    // --- Typing events ---
    const handleTypingStart = ({ conversationId, userId, userName }) => {
      setTypingUser(conversationId, userId, userName);
    };

    const handleTypingStop = ({ conversationId, userId }) => {
      removeTypingUser(conversationId, userId);
    };

    // --- Conversation events ---
    const handleNewConversation = ({ conversation }) => {
      addConversation(conversation);
    };

    const handleGroupUpdated = () => {
      fetchConversations(); // Refresh conversations list
    };

    const handleGroupRemoved = () => {
      fetchConversations();
    };

    // --- Notification events ---
    const handleNotification = (notification) => {
      addNotification(notification);
    };

    // --- Session events ---
    // Ignore session:expired during the initial connection grace period
    // to prevent logout on page refresh.
    const handleSessionExpired = () => {
      if (isInGracePeriod()) {
        console.log("Ignoring session:expired during connection grace period");
        return;
      }
      forceLogout();
    };

    // --- Profile events ---
    const handleUserUpdated = (updatedUser) => {
      updateUserInConversations(updatedUser);
    };

    // Register all listeners
    socket.on(SOCKET_EVENTS.MESSAGE_NEW, handleNewMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead);
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, handleDeleted);
    socket.on(SOCKET_EVENTS.USER_ONLINE, handleUserOnline);
    socket.on(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline);
    socket.on(SOCKET_EVENTS.TYPING_START, handleTypingStart);
    socket.on(SOCKET_EVENTS.TYPING_STOP, handleTypingStop);
    socket.on(SOCKET_EVENTS.CONVERSATION_NEW, handleNewConversation);
    socket.on(SOCKET_EVENTS.GROUP_UPDATED, handleGroupUpdated);
    socket.on(SOCKET_EVENTS.GROUP_REMOVED, handleGroupRemoved);
    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNotification);
    socket.on("session:expired", handleSessionExpired);
    socket.on("user:updated", handleUserUpdated);
    socket.on("message:reaction", handleMessageReaction);

    // Cleanup on unmount
    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, handleNewMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead);
      socket.off(SOCKET_EVENTS.MESSAGE_DELETED, handleDeleted);
      socket.off(SOCKET_EVENTS.USER_ONLINE, handleUserOnline);
      socket.off(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline);
      socket.off(SOCKET_EVENTS.TYPING_START, handleTypingStart);
      socket.off(SOCKET_EVENTS.TYPING_STOP, handleTypingStop);
      socket.off(SOCKET_EVENTS.CONVERSATION_NEW, handleNewConversation);
      socket.off(SOCKET_EVENTS.GROUP_UPDATED, handleGroupUpdated);
      socket.off(SOCKET_EVENTS.GROUP_REMOVED, handleGroupRemoved);
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNotification);
      socket.off("session:expired", handleSessionExpired);
      socket.off("user:updated", handleUserUpdated);
      socket.off("message:reaction", handleMessageReaction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useSocket;
