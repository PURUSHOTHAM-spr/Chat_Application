import { useEffect } from "react";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import EmptyChat from "./EmptyChat";
import useChatStore from "../../store/useChatStore";
import useSocket from "../../hooks/useSocket";
import ProfileSettings from "../profile/ProfileSettings";
import NotificationsPanel from "../notifications/NotificationsPanel";
import ScheduledMessagesPanel from "./ScheduledMessagesPanel";
import ExpensePanel from "../expense/ExpensePanel";
import ExpenseSplitModal from "../expense/ExpenseSplitModal";
import TasksPanel from "../tasks/TasksPanel";
import CreateTaskModal from "../tasks/CreateTaskModal";


/**
 * Main chat dashboard layout — modern two-panel with sidebar + chat window.
 * Responsive: on mobile, shows either sidebar or chat window.
 */
const ChatDashboard = () => {
  const activeConversation = useChatStore((state) => state.activeConversation);
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  const showMobileSidebar = useChatStore((state) => state.showMobileSidebar);
  const setShowMobileSidebar = useChatStore((state) => state.setShowMobileSidebar);
  const showProfilePanel = useChatStore((state) => state.showProfilePanel);
  const setShowProfilePanel = useChatStore((state) => state.setShowProfilePanel);

  // Initialize Socket.IO event listeners
  useSocket();

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // On mobile, show sidebar when no chat is selected, show chat when one is
  useEffect(() => {
    if (activeConversation) {
      setTimeout(() => setShowMobileSidebar(false), 0);
    }
  }, [activeConversation, setShowMobileSidebar]);

  return (
    <div className="h-screen flex bg-[#F4F5F7] dark:bg-dark-1 overflow-hidden">
      {/* Top header bar */}
      <div className="absolute top-0 left-0 right-0 h-32 header-gradient z-0" />

      {/* Main container */}
      <div className="relative flex w-full max-w-[1600px] mx-auto h-full py-4 px-2 md:py-6 md:px-6 z-10">
        <div className="flex w-full bg-white dark:bg-dark-2 rounded shadow-2xl overflow-hidden border border-gray-200/50 dark:border-dark-4/50">
          {/* Sidebar */}
          <div
            className={`${
              showMobileSidebar ? "flex" : "hidden"
            } md:flex flex-col w-full md:w-[420px] lg:w-[480px] border-r border-gray-200 dark:border-dark-4 flex-shrink-0`}
          >
            <Sidebar />
          </div>

          {/* Chat area */}
          <div
            className={`${
              !showMobileSidebar ? "flex" : "hidden"
            } md:flex flex-col flex-1 min-w-0`}
          >
            {activeConversation ? (
              <ChatWindow />
            ) : (
              <EmptyChat />
            )}
          </div>
        </div>
      </div>

      {/* Profile Settings Panel */}
      {showProfilePanel && (
        <ProfileSettings onClose={() => setShowProfilePanel(false)} />
      )}

      {/* Notifications Panel */}
      <NotificationsPanel />

      {/* Scheduled Messages Slide-in Panel */}
      <ScheduledMessagesPanel />

      {/* Group Expenses Slide-in Panel */}
      <ExpensePanel />

      {/* Split Expense Modal */}
      <ExpenseSplitModal />
      <TasksPanel />
      <CreateTaskModal />

    </div>
  );
};

export default ChatDashboard;
