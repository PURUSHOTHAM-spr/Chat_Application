import { create } from "zustand";
import api from "../lib/axios";
import toast from "react-hot-toast";

/**
 * Expense store — manages expense splitting data for group conversations.
 */
const useExpenseStore = create((set, get) => ({
  expenses: [],
  expenseSummary: null,
  isLoadingExpenses: false,
  isCreatingExpense: false,
  showExpensePanel: false,
  showCreateExpenseModal: false,

  setShowExpensePanel: (show) => set({ showExpensePanel: show }),
  setShowCreateExpenseModal: (show) => set({ showCreateExpenseModal: show }),

  /**
   * Fetch all expenses for a conversation
   */
  fetchExpenses: async (conversationId) => {
    set({ isLoadingExpenses: true });
    try {
      const res = await api.get(`/expenses/${conversationId}`);
      set({ expenses: res.data.expenses, isLoadingExpenses: false });
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      set({ isLoadingExpenses: false });
    }
  },

  /**
   * Fetch expense summary (net balances) for a conversation
   */
  fetchExpenseSummary: async (conversationId) => {
    try {
      const res = await api.get(`/expenses/${conversationId}/summary`);
      set({ expenseSummary: res.data.summary });
    } catch (error) {
      console.error("Failed to fetch expense summary:", error);
    }
  },

  /**
   * Create a new expense
   */
  createExpense: async (data) => {
    set({ isCreatingExpense: true });
    try {
      const res = await api.post("/expenses", data);
      set((state) => ({
        expenses: [res.data.expense, ...state.expenses],
        isCreatingExpense: false,
        showCreateExpenseModal: false,
      }));
      toast.success("Expense created!");
      // Refresh summary
      get().fetchExpenseSummary(data.conversationId);
      return res.data.expense;
    } catch (error) {
      console.error("Failed to create expense:", error);
      toast.error(error.response?.data?.message || "Failed to create expense");
      set({ isCreatingExpense: false });
      return null;
    }
  },

  /**
   * Settle your split in an expense
   */
  settleExpense: async (expenseId, conversationId) => {
    try {
      const res = await api.put(`/expenses/${expenseId}/settle`);
      set((state) => ({
        expenses: state.expenses.map((e) =>
          e._id === expenseId ? res.data.expense : e
        ),
      }));
      toast.success("Expense settled!");
      // Refresh summary
      get().fetchExpenseSummary(conversationId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to settle expense");
    }
  },

  /**
   * Handle real-time expense creation from socket
   */
  handleNewExpense: (expense, conversationId) => {
    set((state) => {
      const exists = state.expenses.some((e) => e._id === expense._id);
      if (exists) return state;
      return { expenses: [expense, ...state.expenses] };
    });
  },

  /**
   * Handle real-time expense settlement from socket
   */
  handleExpenseSettled: (expense) => {
    set((state) => ({
      expenses: state.expenses.map((e) =>
        e._id === expense._id ? expense : e
      ),
    }));
  },

  /**
   * Clear store
   */
  clearExpenseStore: () => {
    set({
      expenses: [],
      expenseSummary: null,
      showExpensePanel: false,
      showCreateExpenseModal: false,
    });
  },
}));

export default useExpenseStore;
