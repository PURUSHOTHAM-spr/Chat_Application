import { useEffect } from "react";
import { getSocket } from "../lib/socket";
import { SOCKET_EVENTS } from "../constants";
import useChatStore from "../store/useChatStore";
import useNotificationStore from "../store/useNotificationStore";

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
  } = useChatStore();

  const { addNotification } = useNotificationStore();

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useSocket;
