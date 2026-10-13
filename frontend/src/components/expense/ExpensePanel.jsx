import { useEffect, useState } from "react";
import {
  IoClose,
  IoAdd,
  IoWallet,
  IoCheckmarkCircle,
  IoTimeOutline,
  IoChevronDown,
  IoChevronUp,
  IoReceipt,
} from "react-icons/io5";
import Avatar from "../common/Avatar";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";
import useExpenseStore from "../../store/useExpenseStore";

const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/**
 * Slide-in panel showing all group expenses, balances, and settlements.
 */
const ExpensePanel = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
  const { activeConversation } = useChatStore();
  const { user } = useAuthStore();
  const {
    expenses,
    expenseSummary,
    fetchExpenses,
    fetchExpenseSummary,
    settleExpense,
    isLoadingExpenses,
    showExpensePanel,
    setShowExpensePanel,
    setShowCreateExpenseModal,
  } = useExpenseStore();

  const [expandedExpenseId, setExpandedExpenseId] = useState(null);

  const isOpen = propIsOpen !== undefined ? propIsOpen : showExpensePanel;
  const onClose = propOnClose || (() => setShowExpensePanel(false));

  useEffect(() => {
    if (isOpen && activeConversation?._id) {
      fetchExpenses(activeConversation._id);
      fetchExpenseSummary(activeConversation._id);
    }
  }, [isOpen, activeConversation?._id, fetchExpenses, fetchExpenseSummary]);

  if (!isOpen) return null;

  const symbol = CURRENCY_SYMBOLS[expenses[0]?.currency || "INR"] || "₹";

  const toggleExpand = (id) => {
    setExpandedExpenseId((prev) => (prev === id ? null : id));
  };

  const handleSettle = async (expenseId) => {
    if (activeConversation) {
      await settleExpense(expenseId, activeConversation._id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-in Drawer */}
      <div className="relative w-full max-w-md bg-white dark:bg-dark-2 h-full shadow-2xl animate-slide-in-right flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 to-whatsapp-500 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <IoWallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Group Expenses</h2>
              <p className="text-xs text-white/80 truncate max-w-[200px]">
                {activeConversation?.groupInfo?.name || "Group"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateExpenseModal(true)}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              title="Add Expense"
            >
              <IoAdd className="w-4 h-4" />
              <span>Add</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <IoClose className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Net Balance Summary Cards */}
          {expenseSummary && (
            <div className="bg-gradient-to-br from-gray-50 to-emerald-50/30 dark:from-dark-3 dark:to-emerald-950/10 p-4 rounded-2xl border border-gray-100 dark:border-dark-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Your Balance Summary
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-white dark:bg-dark-4 rounded-xl border border-gray-100 dark:border-dark-4/50 shadow-sm">
                  <span className="text-[11px] text-gray-400 font-medium block mb-0.5">
                    You are owed
                  </span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    +{symbol}{expenseSummary.totalOwing?.toFixed(2) || "0.00"}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-dark-4 rounded-xl border border-gray-100 dark:border-dark-4/50 shadow-sm">
                  <span className="text-[11px] text-gray-400 font-medium block mb-0.5">
                    You owe
                  </span>
                  <span className="text-base font-bold text-red-500 dark:text-red-400">
                    -{symbol}{expenseSummary.totalOwed?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>

              {/* Breakdown details */}
              {expenseSummary.details && expenseSummary.details.length > 0 && (
                <div className="pt-2 border-t border-gray-200/50 dark:border-dark-4/50 space-y-1.5">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Settlement Details:
                  </p>
                  {expenseSummary.details.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          src={item.user?.avatar}
                          name={item.user?.fullName}
                          size="xs"
                        />
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {item.type === "owed" ? (
                            <>
                              <strong className="text-gray-900 dark:text-white font-medium">
                                {item.user?.fullName}
                              </strong>{" "}
                              owes you
                            </>
                          ) : (
                            <>
                              You owe{" "}
                              <strong className="text-gray-900 dark:text-white font-medium">
                                {item.user?.fullName}
                              </strong>
                            </>
                          )}
                        </span>
                      </div>
                      <span
                        className={`font-semibold flex-shrink-0 ${
                          item.type === "owed"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500"
                        }`}
                      >
                        {symbol}{item.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Expenses List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Expense History ({expenses.length})
              </h3>
              <button
                onClick={() => setShowCreateExpenseModal(true)}
                className="text-xs text-whatsapp-600 dark:text-whatsapp-400 font-semibold hover:underline"
              >
                + New Expense
              </button>
            </div>

            {isLoadingExpenses ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-3 border-whatsapp-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-16 h-16 bg-whatsapp-500/10 rounded-full flex items-center justify-center mb-3">
                  <IoReceipt className="w-8 h-8 text-whatsapp-500" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  No Expenses Yet
                </h4>
                <p className="text-xs text-gray-400 mb-4 max-w-xs">
                  Split dinners, trips, bills, or groceries effortlessly with group members.
                </p>
                <button
                  onClick={() => setShowCreateExpenseModal(true)}
                  className="px-4 py-2 bg-whatsapp-500 text-white rounded-xl text-xs font-semibold hover:bg-whatsapp-600 shadow-md shadow-whatsapp-500/20 transition-all"
                >
                  Create First Expense
                </button>
              </div>
            ) : (
              expenses.map((expense) => {
                const isExpanded = expandedExpenseId === expense._id;
                const paidByUser = expense.paidBy;
                const isPayer = paidByUser?._id === user?._id;
                const mySplit = expense.splits?.find(
                  (s) => s.userId?._id === user?._id || s.userId === user?._id
                );
                const isSettled = expense.status === "settled";
                const totalPaidSplits = expense.splits?.filter((s) => s.isPaid).length || 0;
                const totalSplits = expense.splits?.length || 0;
                const expSymbol = CURRENCY_SYMBOLS[expense.currency] || symbol;

                return (
                  <div
                    key={expense._id}
                    className="bg-white dark:bg-dark-3 rounded-2xl border border-gray-100 dark:border-dark-4 overflow-hidden shadow-sm hover:shadow-md transition-all"
                  >
                    {/* Header info */}
                    <div
                      onClick={() => toggleExpand(expense._id)}
                      className="p-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-dark-4/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {expense.description}
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Paid by{" "}
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {isPayer ? "You" : paidByUser?.fullName}
                            </span>{" "}
                            ·{" "}
                            {new Date(expense.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-base font-bold text-gray-900 dark:text-white block">
                            {expSymbol}{expense.totalAmount}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              isSettled
                                ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                                : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            {isSettled
                              ? "Settled"
                              : `${totalPaidSplits}/${totalSplits} Paid`}
                          </span>
                        </div>
                      </div>

                      {/* Settle button if logged in user owes and hasn't settled */}
                      {mySplit && !mySplit.isPaid && !isPayer && (
                        <div
                          className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-4 flex items-center justify-between"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-xs text-gray-500">
                            Your share:{" "}
                            <span className="font-semibold text-red-500">
                              {expSymbol}{mySplit.amount}
                            </span>
                          </div>
                          <button
                            onClick={() => handleSettle(expense._id)}
                            className="px-3 py-1 bg-whatsapp-500 hover:bg-whatsapp-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                          >
                            <IoCheckmarkCircle className="w-3.5 h-3.5" />
                            <span>Mark Paid</span>
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-end mt-1 text-gray-400">
                        {isExpanded ? (
                          <IoChevronUp className="w-4 h-4" />
                        ) : (
                          <IoChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Expandable splits breakdown */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-gray-50/60 dark:bg-dark-4/20 border-t border-gray-100 dark:border-dark-4 space-y-2 animate-fade-in">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          Splits Breakdown ({expense.splitType})
                        </p>
                        <div className="space-y-1.5">
                          {expense.splits?.map((split, sIdx) => {
                            const splitUser = split.userId;
                            const isSplitUser = splitUser?._id === user?._id;
                            return (
                              <div
                                key={sIdx}
                                className="flex items-center justify-between text-xs py-1"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar
                                    src={splitUser?.avatar}
                                    name={splitUser?.fullName}
                                    size="xs"
                                  />
                                  <span className="text-gray-800 dark:text-gray-200 truncate">
                                    {isSplitUser ? "You" : splitUser?.fullName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {expSymbol}{split.amount}
                                  </span>
                                  {split.isPaid ? (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
                                      <IoCheckmarkCircle className="w-3 h-3" /> Paid
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-500 flex items-center gap-0.5 font-medium">
                                      <IoTimeOutline className="w-3 h-3" /> Unpaid
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensePanel;
