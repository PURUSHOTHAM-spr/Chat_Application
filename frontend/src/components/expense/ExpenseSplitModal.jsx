import { useState, useEffect } from "react";
import { IoClose, IoWalletOutline, IoReceiptOutline, IoCheckmark } from "react-icons/io5";
import Modal from "../common/Modal";
import Avatar from "../common/Avatar";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";
import useExpenseStore from "../../store/useExpenseStore";
import toast from "react-hot-toast";

const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/**
 * Modal to create a new group expense split.
 * Supports Equal, Custom amount, and Percentage split types.
 */
const ExpenseSplitModal = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
  const { activeConversation } = useChatStore();
  const { user } = useAuthStore();
  const {
    createExpense,
    isCreatingExpense,
    showCreateExpenseModal,
    setShowCreateExpenseModal,
  } = useExpenseStore();

  const isOpen = propIsOpen !== undefined ? propIsOpen : showCreateExpenseModal;
  const onClose = propOnClose || (() => setShowCreateExpenseModal(false));

  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [paidBy, setPaidBy] = useState("");
  const [splitType, setSplitType] = useState("equal");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [customAmounts, setCustomAmounts] = useState({});
  const [percentages, setPercentages] = useState({});

  const participants = activeConversation?.participants || [];

  // Initialize defaults on open or conversation change
  useEffect(() => {
    if (isOpen && activeConversation) {
      setDescription("");
      setTotalAmount("");
      setCurrency("INR");
      setPaidBy(user?._id || participants[0]?._id || "");
      setSplitType("equal");
      const allIds = participants.map((p) => p._id);
      setSelectedUserIds(allIds);
      setCustomAmounts({});
      setPercentages({});
    }
  }, [isOpen, activeConversation, user?._id]);

  if (!isOpen || !activeConversation) return null;

  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const numTotal = parseFloat(totalAmount) || 0;

  // Toggle user selection in split
  const toggleUser = (userId) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        if (prev.length <= 1) {
          toast.error("At least one person must be included in the split");
          return prev;
        }
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Select all or none
  const selectAll = () => {
    setSelectedUserIds(participants.map((p) => p._id));
  };

  // Calculate split figures
  const perPersonEqual =
    selectedUserIds.length > 0 && numTotal > 0
      ? (numTotal / selectedUserIds.length).toFixed(2)
      : "0.00";

  // Calculate total for custom/percentage validation
  const currentCustomTotal = selectedUserIds.reduce((sum, id) => {
    return sum + (parseFloat(customAmounts[id]) || 0);
  }, 0);

  const currentPercentageTotal = selectedUserIds.reduce((sum, id) => {
    return sum + (parseFloat(percentages[id]) || 0);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Please enter an expense description");
      return;
    }

    if (!numTotal || numTotal <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one person to split with");
      return;
    }

    let splits = [];

    if (splitType === "equal") {
      splits = selectedUserIds.map((userId) => ({
        userId,
        amount: parseFloat(perPersonEqual),
      }));
    } else if (splitType === "custom") {
      if (Math.abs(currentCustomTotal - numTotal) > 0.05) {
        toast.error(`Custom amounts must sum to ${symbol}${numTotal}. Current: ${symbol}${currentCustomTotal.toFixed(2)}`);
        return;
      }
      splits = selectedUserIds.map((userId) => ({
        userId,
        amount: parseFloat(customAmounts[userId]) || 0,
      }));
    } else if (splitType === "percentage") {
      if (Math.abs(currentPercentageTotal - 100) > 0.1) {
        toast.error(`Percentages must sum to 100%. Current: ${currentPercentageTotal}%`);
        return;
      }
      splits = selectedUserIds.map((userId) => ({
        userId,
        amount: parseFloat(percentages[userId]) || 0,
      }));
    }

    const payload = {
      conversationId: activeConversation._id,
      description: description.trim(),
      totalAmount: numTotal,
      currency,
      splitType,
      paidBy: paidBy || user?._id,
      splits,
    };

    const created = await createExpense(payload);
    if (created) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Split An Expense" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
        {/* Description & Amount */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
              Expense Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dinner, Grocery run, Cab, Movie"
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-dark-3 border border-gray-200 dark:border-dark-4 rounded-xl text-sm input-focus"
              autoFocus
              maxLength={80}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                Total Amount
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                  {symbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 dark:bg-dark-3 border border-gray-200 dark:border-dark-4 rounded-xl text-sm font-semibold input-focus"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-dark-3 border border-gray-200 dark:border-dark-4 rounded-xl text-sm font-semibold input-focus"
              >
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="GBP">£ GBP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
              Paid By
            </label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-3 border border-gray-200 dark:border-dark-4 rounded-xl text-xs input-focus"
            >
              {participants.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.fullName} {p._id === user?._id ? "(You)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Split Type Selector */}
        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
            Split Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { type: "equal", label: "Equally" },
              { type: "custom", label: "Exact Amounts" },
              { type: "percentage", label: "By Percentage" },
            ].map((method) => (
              <button
                key={method.type}
                type="button"
                onClick={() => setSplitType(method.type)}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                  splitType === method.type
                    ? "bg-chatsphere-500 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-dark-3 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-4"
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {/* Participants list & split allocations */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Split with ({selectedUserIds.length} of {participants.length})
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-chatsphere-600 dark:text-chatsphere-400 font-medium hover:underline"
            >
              Select All
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {participants.map((p) => {
              const isSelected = selectedUserIds.includes(p._id);
              return (
                <div
                  key={p._id}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-white dark:bg-dark-3 border-gray-200 dark:border-dark-4"
                      : "bg-gray-50/50 dark:bg-dark-4/30 border-transparent opacity-60"
                  }`}
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUser(p._id)}
                      className="rounded text-chatsphere-500 focus:ring-chatsphere-500 w-4 h-4"
                    />
                    <Avatar src={p.avatar} name={p.fullName} size="xs" />
                    <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {p.fullName} {p._id === user?._id ? "(You)" : ""}
                    </span>
                  </label>

                  {isSelected && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {splitType === "equal" && (
                        <span className="text-xs font-semibold text-chatsphere-600 dark:text-chatsphere-400">
                          {symbol}{perPersonEqual}
                        </span>
                      )}

                      {splitType === "custom" && (
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            {symbol}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={customAmounts[p._id] || ""}
                            onChange={(e) =>
                              setCustomAmounts({
                                ...customAmounts,
                                [p._id]: e.target.value,
                              })
                            }
                            placeholder="0.00"
                            className="w-full pl-6 pr-2 py-1 bg-gray-100 dark:bg-dark-4 rounded-lg text-xs font-semibold text-right input-focus"
                          />
                        </div>
                      )}

                      {splitType === "percentage" && (
                        <div className="relative w-20">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={percentages[p._id] || ""}
                            onChange={(e) =>
                              setPercentages({
                                ...percentages,
                                [p._id]: e.target.value,
                              })
                            }
                            placeholder="0"
                            className="w-full pr-6 pl-2 py-1 bg-gray-100 dark:bg-dark-4 rounded-lg text-xs font-semibold text-right input-focus"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            %
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Validation Feedback */}
          {splitType === "custom" && numTotal > 0 && (
            <div className="mt-2 text-right">
              <span
                className={`text-xs font-medium ${
                  Math.abs(currentCustomTotal - numTotal) < 0.05
                    ? "text-chatsphere-600"
                    : "text-red-500"
                }`}
              >
                Allocated: {symbol}{currentCustomTotal.toFixed(2)} of {symbol}{numTotal.toFixed(2)}
              </span>
            </div>
          )}

          {splitType === "percentage" && (
            <div className="mt-2 text-right">
              <span
                className={`text-xs font-medium ${
                  Math.abs(currentPercentageTotal - 100) < 0.1
                    ? "text-chatsphere-600"
                    : "text-red-500"
                }`}
              >
                Total: {currentPercentageTotal}% of 100%
              </span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-dark-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-dark-4 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-3 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreatingExpense}
            className="flex-1 py-2.5 bg-chatsphere-500 text-white font-semibold rounded-xl text-xs hover:bg-chatsphere-600 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-chatsphere-500/20"
          >
            {isCreatingExpense ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <IoReceiptOutline className="w-4 h-4" />
                <span>Create Expense</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ExpenseSplitModal;
