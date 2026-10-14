const colors = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const TaskPriorityBadge = ({ priority }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${colors[priority] || colors.medium}`}>
    {priority || "medium"}
  </span>
);

export default TaskPriorityBadge;
