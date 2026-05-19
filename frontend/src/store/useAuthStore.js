import { create } from "zustand";
import api from "../lib/axios";
import { connectSocket, disconnectSocket } from "../lib/socket";
import toast from "react-hot-toast";
import useChatStore from "./useChatStore";
import useNotificationStore from "./useNotificationStore";

/**
 * Auth store — manages user authentication state, login, register, and logout.
 * Token is persisted in localStorage for persistent login.
 */
const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("token") || null,
  isLoading: false,
  isCheckingAuth: true,

  /**
   * Check if user is authenticated on app load.
   * Verifies the stored token and connects socket if valid.
   */
  checkAuth: async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      set({ isCheckingAuth: false, user: null });
      return;
    }
    try {
      const res = await api.get("/auth/check");
      set({ user: res.data.user, token, isCheckingAuth: false });
      connectSocket(token);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        set({ user: null, token: null, isCheckingAuth: false });
      } else {
        // Do not clear token if rate limited or offline
        set({ isCheckingAuth: false });
      }
    }
  },

  /**
   * Register a new user account.
   */
  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post("/auth/register", data);
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      set({ user, token, isLoading: false });
      connectSocket(token);
      toast.success("Account created successfully!");
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || "Registration failed";
      toast.error(msg);
      set({ isLoading: false });
      return false;
    }
  },

  /**
   * Login with email and password.
   */
  login: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post("/auth/login", data);
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      set({ user, token, isLoading: false });
      connectSocket(token);
      toast.success(`Welcome back, ${user.fullName}!`);
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || "Login failed";
      toast.error(msg);
      set({ isLoading: false });
      return false;
    }
  },

  /**
   * Logout — clear token, disconnect socket.
   */
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout API errors
    }
    localStorage.removeItem("token");
    disconnectSocket();
    useChatStore.getState().clearChatStore();
    useNotificationStore.getState().clearNotifications();
    set({ user: null, token: null });
    toast.success("Logged out");
  },

  /**
   * Update user profile data in the store (after profile edit).
   */
  updateUser: (updatedUser) => {
    set({ user: updatedUser });
  },
}));

export default useAuthStore;
