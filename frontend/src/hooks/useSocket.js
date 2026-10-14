import { useEffect } from "react";
import { getSocket, isInGracePeriod, onSocketCreated } from "../lib/socket";
import { SOCKET_EVENTS } from "../constants";
import useChatStore from "../store/useChatStore";
import useNotificationStore from "../store/useNotificationStore";
import useAuthStore from "../store/useAuthStore";
import useExpenseStore from "../store/useExpenseStore";
import useTaskStore from "../store/useTaskStore";

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
    updateGroup,
    handleRemoveGroup,
    handleGroupExpired,
    fetchMessages,
  } = useChatStore();

  const { addNotification } = useNotificationStore();
  const { forceLogout } = useAuthStore();
  const { handleNewExpense, handleExpenseSettled } = useExpenseStore();
  const { handleTaskEvent, handleTaskDeleted } = useTaskStore();

  useEffect(() => {
    // --- Message events ---
    const handleNewMessage = ({ message, conversationId }) => {
      addIncomingMessage(message, conversationId);
      // Auto-deliver acknowledgment
      getSocket()?.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, { messageId: message._id });
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

    const handleGroupUpdated = ({ conversation }) => {
      if (conversation) {
        updateGroup(conversation);
      } else {
        fetchConversations();
      }
    };

    const handleGroupRemoved = ({ conversationId }) => {
      if (conversationId) {
        handleRemoveGroup(conversationId);
      } else {
        fetchConversations();
      }
    };

    // --- Group Expiry events ---
    const handleExpired = ({ conversationId, groupName }) => {
      handleGroupExpired(conversationId);
      import("react-hot-toast").then((m) =>
        m.default(`⏰ Temporary group "${groupName}" has expired`, { icon: "⏰" })
      );
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

    // --- Expense events ---
    const onExpenseNew = ({ expense, conversationId }) => {
      handleNewExpense(expense, conversationId);
    };

    const onExpenseSettled = ({ expense }) => {
      handleExpenseSettled(expense);
    };

    const onTaskEvent = ({ task }) => handleTaskEvent(task);
    const onTaskDeleted = ({ task }) => handleTaskDeleted(task?._id);

    const syncChatState = () => {
      fetchConversations();
      const currentConversation = useChatStore.getState().activeConversation;
      if (currentConversation?._id) {
        fetchMessages(currentConversation._id, 1);
      }
    };

    const attachedSockets = new Set();
    const attachListeners = (socket) => {
      if (!socket || attachedSockets.has(socket)) return;
      attachedSockets.add(socket);
      socket.on(SOCKET_EVENTS.CONNECT, syncChatState);
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
      socket.on(SOCKET_EVENTS.GROUP_EXPIRED, handleExpired);
      socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNotification);
      socket.on(SOCKET_EVENTS.EXPENSE_NEW, onExpenseNew);
      socket.on(SOCKET_EVENTS.EXPENSE_SETTLED, onExpenseSettled);
      socket.on("session:expired", handleSessionExpired);
      socket.on("user:updated", handleUserUpdated);
      socket.on("message:reaction", handleMessageReaction);
      socket.on(SOCKET_EVENTS.TASK_CREATED, onTaskEvent);
      socket.on(SOCKET_EVENTS.TASK_UPDATED, onTaskEvent);
      socket.on(SOCKET_EVENTS.TASK_COMPLETED, onTaskEvent);
      socket.on(SOCKET_EVENTS.TASK_REMINDER, onTaskEvent);
      socket.on(SOCKET_EVENTS.TASK_DELETED, onTaskDeleted);
    };

    const detachListeners = (socket) => {
      if (!socket || !attachedSockets.has(socket)) return;
      socket.off(SOCKET_EVENTS.CONNECT, syncChatState);
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
      socket.off(SOCKET_EVENTS.GROUP_EXPIRED, handleExpired);
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNotification);
      socket.off(SOCKET_EVENTS.EXPENSE_NEW, onExpenseNew);
      socket.off(SOCKET_EVENTS.EXPENSE_SETTLED, onExpenseSettled);
      socket.off("session:expired", handleSessionExpired);
      socket.off("user:updated", handleUserUpdated);
      socket.off("message:reaction", handleMessageReaction);
      socket.off(SOCKET_EVENTS.TASK_CREATED, onTaskEvent);
      socket.off(SOCKET_EVENTS.TASK_UPDATED, onTaskEvent);
      socket.off(SOCKET_EVENTS.TASK_COMPLETED, onTaskEvent);
      socket.off(SOCKET_EVENTS.TASK_REMINDER, onTaskEvent);
      socket.off(SOCKET_EVENTS.TASK_DELETED, onTaskDeleted);
      attachedSockets.delete(socket);
    };

    const currentSocket = getSocket();
    if (currentSocket) {
      attachListeners(currentSocket);
      if (currentSocket.connected) syncChatState();
    }
    const removeSocketCreatedListener = onSocketCreated((createdSocket) => {
      attachListeners(createdSocket);
      if (createdSocket.connected) syncChatState();
    });

    return () => {
      attachedSockets.forEach(detachListeners);
      removeSocketCreatedListener();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useSocket;
