import { useEffect, useState } from "react";
import { IoClose, IoAdd } from "react-icons/io5";
import useTaskStore from "../../store/useTaskStore";
import useChatStore from "../../store/useChatStore";
import TaskCard from "./TaskCard";

const TasksPanel = () => {
  const { showPanel, setShowPanel, tasks, isLoading, fetchMyTasks, openCreateModal } = useTaskStore();
  const { conversations } = useChatStore();
  const [scope, setScope] = useState("my");
  const [conversationId, setConversationId] = useState("");

  useEffect(() => {
    if (!showPanel) return;
    if (scope === "my") fetchMyTasks();
    else if (conversationId) useTaskStore.getState().fetchConversationTasks(conversationId);
  }, [showPanel, scope, conversationId, fetchMyTasks]);

  if (!showPanel) return null;
  const selectedConversation = conversations.find((conversation) => conversation._id === conversationId);
  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] bg-gray-50 dark:bg-dark-2 shadow-2xl border-l border-gray-200 dark:border-dark-4 flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Tasks</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => openCreateModal(null, selectedConversation)} disabled={!selectedConversation} title="Create task" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 disabled:opacity-40"><IoAdd /></button>
          <button onClick={() => setShowPanel(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4"><IoClose /></button>
        </div>
      </header>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setScope("my")} className={`px-3 py-1.5 rounded-lg text-xs ${scope === "my" ? "bg-chatsphere-500 text-white" : "bg-white dark:bg-dark-3"}`}>My tasks</button>
          <button onClick={() => setScope("group")} className={`px-3 py-1.5 rounded-lg text-xs ${scope === "group" ? "bg-chatsphere-500 text-white" : "bg-white dark:bg-dark-3"}`}>Group tasks</button>
        </div>
        {scope === "group" && (
          <select value={conversationId} onChange={(e) => setConversationId(e.target.value)} className="input-task w-full">
            <option value="">Select a conversation</option>
            {conversations.map((conversation) => <option key={conversation._id} value={conversation._id}>{conversation.groupInfo?.name || "Direct conversation"}</option>)}
          </select>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && <p className="text-sm text-gray-500">Loading tasks...</p>}
        {!isLoading && tasks.length === 0 && <p className="text-sm text-center text-gray-500 py-8">No tasks yet.</p>}
        {tasks.map((task) => <TaskCard key={task._id} task={task} />)}
      </div>
    </aside>
  );
};

export default TasksPanel;
