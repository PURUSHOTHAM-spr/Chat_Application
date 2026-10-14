import { IoCheckmarkCircleOutline, IoTrashOutline } from "react-icons/io5";
import useTaskStore from "../../store/useTaskStore";
import TaskPriorityBadge from "./TaskPriorityBadge";

const TaskCard = ({ task }) => {
  const { updateTask, archiveTask } = useTaskStore();
  const overdue = task.dueAt && new Date(task.dueAt) < new Date() && !["completed", "cancelled"].includes(task.status);
  return (
    <article className="p-4 rounded-2xl bg-white dark:bg-dark-3 border border-gray-100 dark:border-dark-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`font-semibold truncate ${task.status === "completed" ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>{task.title}</h3>
          {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{task.description}</p>}
        </div>
        <TaskPriorityBadge priority={task.priority} />
      </div>
      <div className="flex items-center justify-between gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <span className={overdue ? "text-red-500 font-semibold" : ""}>{task.dueAt ? `${overdue ? "Overdue · " : ""}${new Date(task.dueAt).toLocaleString()}` : "No due date"}</span>
        <span>{task.assignedTo?.fullName || "Unassigned"}</span>
      </div>
      <div className="flex items-center gap-2 mt-3">
        {task.status !== "completed" && (
          <button onClick={() => updateTask(task._id, { status: "completed" })} className="flex items-center gap-1 text-xs text-chatsphere-600 dark:text-chatsphere-400">
            <IoCheckmarkCircleOutline /> Complete
          </button>
        )}
        {task.status === "completed" && (
          <button onClick={() => updateTask(task._id, { status: "todo" })} className="text-xs text-chatsphere-600 dark:text-chatsphere-400">Reopen</button>
        )}
        <button onClick={() => archiveTask(task._id)} className="ml-auto text-gray-400 hover:text-red-500"><IoTrashOutline /></button>
      </div>
    </article>
  );
};

export default TaskCard;
