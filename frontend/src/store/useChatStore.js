import { create } from "zustand";
import api from "../lib/axios";
import toast from "react-hot-toast";
import useAuthStore from "./useAuthStore";

/**
 * Chat store — manages conversations, messages, active chat, and online users.
 * This is the core state for the entire chat interface.
 */
const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  onlineUsers: new Set(),
  typingUsers: {},       // { conversationId: [{ userId, userName }] }
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  pagination: null,

  // UI State to prevent prop drilling
  showMobileSidebar: true,
  showProfilePanel: false,

  setShowMobileSidebar: (show) => set({ showMobileSidebar: show }),
  setShowProfilePanel: (show) => set({ showProfilePanel: show }),

  /**
   * Fetch all conversations for the sidebar.
   */
  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const res = await api.get("/conversations");
      set({ conversations: res.data.conversations, isLoadingConversations: false });
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      set({ isLoadingConversations: false });
    }
  },

  /**
   * Set the active conversation and load its messages.
   */
  setActiveConversation: async (conversation) => {
    set({ activeConversation: conversation, messages: [], pagination: null });
    if (conversation) {
      await get().fetchMessages(conversation._id);
    }
  },

  /**
   * Fetch paginated messages for a conversation.
   */
  fetchMessages: async (conversationId, page = 1) => {
    set({ isLoadingMessages: true });
    try {
      const res = await api.get(`/messages/${conversationId}?page=${page}&limit=50`);
      const { messages: newMessages, pagination } = res.data;

      if (page === 1) {
        set({ messages: newMessages, pagination, isLoadingMessages: false });
      } else {
        // Prepend older messages for infinite scroll
        set((state) => ({
          messages: [...newMessages, ...state.messages],
          pagination,
          isLoadingMessages: false,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      set({ isLoadingMessages: false });
    }
  },

  /**
   * Load more (older) messages for infinite scroll.
   */
  loadMoreMessages: async () => {
    const { pagination, activeConversation } = get();
    if (!pagination?.hasMore || !activeConversation) return;
    await get().fetchMessages(activeConversation._id, pagination.page + 1);
  },

  /**
   * Send a text message via REST API.
   */
  sendMessage: async (data) => {
    set({ isSendingMessage: true });
    try {
      const res = await api.post("/messages", data);
      // Add message to local state immediately
      set((state) => ({
        messages: [...state.messages, res.data.message],
        isSendingMessage: false,
      }));

      // Update lastMessage in conversation list
      get().updateConversationLastMessage(data.conversationId, res.data.message);
      return res.data.message;
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
      set({ isSendingMessage: false });
      return null;
    }
  },

  /**
   * Add a new incoming message from Socket.IO.
   */
  addIncomingMessage: (message, conversationId) => {
    const { activeConversation } = get();

    // If this message is for the active conversation, add it to messages
    if (activeConversation?._id === conversationId) {
      set((state) => ({
        messages: [...state.messages, message],
      }));
    }

    // Update conversation list
    get().updateConversationLastMessage(conversationId, message);
  },

  /**
   * Update the lastMessage and unread count in the conversation list.
   */
  updateConversationLastMessage: (conversationId, message) => {
    const currentUser = useAuthStore.getState().user;

    set((state) => {
      const updated = state.conversations.map((conv) => {
        if (conv._id === conversationId) {
          const isActive = state.activeConversation?._id === conversationId;
          
          let newUnreadCount = { ...conv.unreadCount };
          if (!isActive && currentUser) {
            newUnreadCount[currentUser._id] = (newUnreadCount[currentUser._id] || 0) + 1;
          }

          return {
            ...conv,
            lastMessage: {
              content: message.type === "text" ? message.content : `📎 ${message.type}`,
              sender: message.sender,
              type: message.type,
              createdAt: message.createdAt,
            },
            updatedAt: message.createdAt,
            unreadCount: newUnreadCount,
          };
        }
        return conv;
      });

      // Sort by most recent
      updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      return { conversations: updated };
    });
  },

  /**
   * Mark messages as read for a conversation.
   */
  markAsRead: async (conversationId) => {
    try {
      await api.put(`/messages/${conversationId}/read`);
      const currentUser = useAuthStore.getState().user;
      
      // Reset unread count locally for the current user
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv._id === conversationId && currentUser
            ? { ...conv, unreadCount: { ...conv.unreadCount, [currentUser._id]: 0 } }
            : conv
        ),
      }));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  },

  /**
   * Update message read status from Socket.IO event.
   */
  updateMessageReadStatus: (conversationId) => {
    const { activeConversation } = get();
    if (activeConversation?._id === conversationId) {
      set((state) => ({
        messages: state.messages.map((msg) => ({
          ...msg,
          status: "read",
        })),
      }));
    }
  },

  /**
   * Delete a message via API.
   */
  deleteMessage: async (messageId, type = "everyone") => {
    try {
      await api.delete(`/messages/${messageId}?type=${type}`);
      if (type === "everyone") {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg._id === messageId
              ? { ...msg, isDeleted: true, content: "This message was deleted", reactions: [] }
              : msg
          ),
        }));
      } else if (type === "me") {
        set((state) => ({
          messages: state.messages.filter((msg) => msg._id !== messageId),
        }));
      }
    } catch {
      toast.error("Failed to delete message");
    }
  },

  /**
   * Handle incoming message deletion event.
   */
  handleMessageDeleted: (messageId) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === messageId
          ? { ...msg, isDeleted: true, content: "This message was deleted", reactions: [] }
          : msg
      ),
    }));
  },

  /**
   * React to a message via API.
   */
  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await api.post(`/messages/${messageId}/react`, { emoji });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId
            ? { ...msg, reactions: res.data.message.reactions }
            : msg
        ),
      }));
    } catch {
      toast.error("Failed to add reaction");
    }
  },

  /**
   * Handle incoming message reaction event from Socket.IO.
   */
  handleMessageReaction: ({ messageId, conversationId, reactions }) => {
    const { activeConversation } = get();
    if (activeConversation?._id === conversationId) {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId
            ? { ...msg, reactions }
            : msg
        ),
      }));
    }
  },

  /**
   * Create or get a direct conversation with a user.
   */
  createConversation: async (participantId) => {
    try {
      const res = await api.post("/conversations", { participantId });
      const { conversation, isNew } = res.data;

      if (isNew) {
        set((state) => {
          // Check for existing by ID
          const existsById = state.conversations.find((c) => c._id === conversation._id);
          if (existsById) return state;

          // Check for duplicate direct conversation by participants
          if (conversation.type === "direct") {
            const partIds = conversation.participants.map(p => p._id || p).sort().join('_');
            const duplicate = state.conversations.find(c => 
              c.type === "direct" && 
              c.participants.map(p => p._id || p).sort().join('_') === partIds
            );
            if (duplicate) return state;
          }

          return { conversations: [conversation, ...state.conversations] };
        });
      }

      return conversation;
    } catch {
      toast.error("Failed to create conversation");
      return null;
    }
  },

  /**
   * Add a new conversation to the list.
   */
  addConversation: (conversation) => {
    set((state) => {
      // Check if it already exists
      const exists = state.conversations.some((c) => c._id === conversation._id);
      if (exists) {
        // Update existing
        return {
          conversations: state.conversations.map((c) =>
            c._id === conversation._id ? conversation : c
          ),
        };
      }
      // Add new
      return {
        conversations: [conversation, ...state.conversations],
      };
    });
  },

  /**
   * Clear all messages in the active conversation
   */
  clearChat: async (conversationId) => {
    try {
      await api.post(`/messages/${conversationId}/clear`);
      set({ messages: [] });
      toast.success("Chat cleared");
    } catch (error) {
      toast.error("Failed to clear chat");
    }
  },

  /**
   * Delete the active conversation
   */
  deleteConversation: async (conversationId) => {
    try {
      await api.delete(`/conversations/${conversationId}`);
      set((state) => ({
        conversations: state.conversations.filter(c => c._id !== conversationId),
        activeConversation: state.activeConversation?._id === conversationId ? null : state.activeConversation,
        messages: state.activeConversation?._id === conversationId ? [] : state.messages
      }));
      toast.success("Chat deleted");
    } catch (error) {
      toast.error("Failed to delete chat");
    }
  },

  /**
   * Create a group conversation.
   */
  createGroup: async (data) => {
    try {
      const res = await api.post("/conversations/group", data);
      set((state) => ({
        conversations: [res.data.conversation, ...state.conversations],
      }));
      toast.success("Group created!");
      return res.data.conversation;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      return null;
    }
  },

  /**
   * Instantly update user profile across all conversations
   */
  updateUserInConversations: (updatedUser) => {
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        // Deep copy participants
        const participants = conv.participants?.map(p => 
          p._id === updatedUser.userId 
            ? { ...p, fullName: updatedUser.fullName, avatar: updatedUser.avatar, about: updatedUser.about } 
            : p
        );

        // Update group admin info if needed
        const groupInfo = conv.groupInfo?.admin?._id === updatedUser.userId
          ? { ...conv.groupInfo, admin: { ...conv.groupInfo.admin, fullName: updatedUser.fullName } }
          : conv.groupInfo;

        return { ...conv, participants, groupInfo };
      }),
      activeConversation: state.activeConversation 
        ? {
            ...state.activeConversation,
            participants: state.activeConversation.participants?.map(p => 
              p._id === updatedUser.userId 
                ? { ...p, fullName: updatedUser.fullName, avatar: updatedUser.avatar, about: updatedUser.about } 
                : p
            ),
            groupInfo: state.activeConversation.groupInfo?.admin?._id === updatedUser.userId
              ? { ...state.activeConversation.groupInfo, admin: { ...state.activeConversation.groupInfo.admin, fullName: updatedUser.fullName } }
              : state.activeConversation.groupInfo
          }
        : null
    }));
  },

  /**
   * Upload a file and return the URL.
   */
  uploadFile: async (base64File) => {
    try {
      const res = await api.post("/messages/upload", { file: base64File });
      return res.data;
    } catch (error) {
      console.error("Upload error details:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to upload file");
      return null;
    }
  },

  // --- Online/Offline tracking ---
  setUserOnline: (userId) => {
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      newSet.add(userId);
      return { onlineUsers: newSet };
    });
  },

  setUserOffline: (userId) => {
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      newSet.delete(userId);
      return { onlineUsers: newSet };
    });
  },

  // --- Typing indicators ---
  setTypingUser: (conversationId, userId, userName) => {
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      if (current.find((u) => u.userId === userId)) return {};
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: [...current, { userId, userName }],
        },
      };
    });
  },

  removeTypingUser: (conversationId, userId) => {
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: current.filter((u) => u.userId !== userId),
        },
      };
    });
  },

  // --- Reset Store ---
  clearChatStore: () => {
    set({
      conversations: [],
      activeConversation: null,
      messages: [],
      onlineUsers: new Set(),
      typingUsers: {},
      pagination: null,
    });
  },
}));

export default useChatStore;
