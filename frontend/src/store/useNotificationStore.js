import { create } from "zustand";

/**
 * Notification store — manages in-app notifications.
 */
const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  addNotification: (notification) => {
    set((state) => ({
      notifications: [
        { ...notification, id: Date.now(), timestamp: new Date(), read: false },
        ...state.notifications,
      ].slice(0, 50), // Keep last 50 notifications
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  togglePanel: () => {
    const { isOpen } = get();
    set({
      isOpen: !isOpen,
      ...(isOpen ? {} : { unreadCount: 0 }),
    });
    // Mark all as read when opening
    if (!isOpen) {
      get().markAllAsRead();
    }
  },
}));

export default useNotificationStore;
