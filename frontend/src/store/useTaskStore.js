import { create } from "zustand";
import api from "../lib/axios";
import toast from "react-hot-toast";

const mergeTask = (tasks, incoming) => {
  const index = tasks.findIndex((task) => task._id === incoming._id);
  if (index === -1) return [incoming, ...tasks];
  return tasks.map((task) => (task._id === incoming._id ? incoming : task));
};

const useTaskStore = create((set, get) => ({
  tasks: [],
  isLoading: false,
  showPanel: false,
  modal: { type: null, message: null, conversation: null },

  setShowPanel: (showPanel) => set({ showPanel }),
  openCreateModal: (message = null, conversation = null) =>
    set({ modal: { type: "create", message, conversation } }),
  closeModal: () => set({ modal: { type: null, message: null, conversation: null } }),

  fetchMyTasks: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get("/tasks/my");
      set({ tasks: response.data.tasks, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || "Failed to load tasks");
    }
  },

  fetchConversationTasks: async (conversationId, params = {}) => {
    set({ isLoading: true });
    try {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, value]) => value)
      ).toString();
      const response = await api.get(`/tasks/conversation/${conversationId}${query ? `?${query}` : ""}`);
      set({ tasks: response.data.tasks, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || "Failed to load tasks");
    }
  },

  createTask: async (data) => {
    try {
      const response = await api.post("/tasks", data);
      set((state) => ({ tasks: mergeTask(state.tasks, response.data.task) }));
      get().closeModal();
      toast.success("Task created");
      return response.data.task;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create task");
      return null;
    }
  },

  updateTask: async (taskId, data) => {
    try {
      const response = await api.put(`/tasks/${taskId}`, data);
      set((state) => ({ tasks: mergeTask(state.tasks, response.data.task) }));
      toast.success("Task updated");
      return response.data.task;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update task");
      return null;
    }
  },

  archiveTask: async (taskId) => {
    const task = await get().updateTask(taskId, { archivedAt: new Date().toISOString() });
    if (task) set((state) => ({ tasks: state.tasks.filter((item) => item._id !== taskId) }));
  },

  handleTaskEvent: (task) =>
    set((state) => ({ tasks: mergeTask(state.tasks, task) })),
  handleTaskDeleted: (taskId) =>
    set((state) => ({ tasks: state.tasks.filter((task) => task._id !== taskId) })),
}));

export default useTaskStore;
