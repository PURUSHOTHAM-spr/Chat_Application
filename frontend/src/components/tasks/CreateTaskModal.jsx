import { useEffect, useMemo, useState } from "react";
import Modal from "../common/Modal";
import useTaskStore from "../../store/useTaskStore";

const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 16) : "");

const CreateTaskModal = () => {
  const { modal, closeModal, createTask } = useTaskStore();
  const conversation = modal.conversation;
  const message = modal.message;
  const participants = useMemo(() => conversation?.participants || [], [conversation?.participants]);
  const defaultAssignee = participants[0]?._id || participants[0] || "";
  const [form, setForm] = useState({});

  useEffect(() => {
    if (modal.type !== "create") return;
    const timer = setTimeout(() => setForm({
      title: message?.content?.slice(0, 200) || "",
      description: message?.content || "",
      assignedTo: defaultAssignee,
      dueAt: "",
      reminderAt: "",
      priority: "medium",
      status: "todo",
    }), 0);
    return () => clearTimeout(timer);
  }, [modal.type, message, defaultAssignee, participants]);

  const sourceText = useMemo(() => message?.content || "No source message selected", [message]);
  if (modal.type !== "create") return null;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!conversation?._id || !form.title?.trim() || !form.assignedTo) return;
    await createTask({
      ...form,
      conversationId: conversation._id,
      sourceMessageId: message?._id,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      reminderAt: form.reminderAt ? new Date(form.reminderAt).toISOString() : null,
    });
  };

  return (
    <Modal isOpen title="Create task" onClose={closeModal} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {message && (
          <div className="rounded-xl bg-gray-50 dark:bg-dark-4 p-3 text-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {message.sender?.fullName || "Message"} · {new Date(message.createdAt).toLocaleString()}
            </p>
            <p className="text-gray-700 dark:text-gray-200 line-clamp-3">{sourceText}</p>
          </div>
        )}
        <input required maxLength={200} value={form.title || ""} onChange={(e) => update("title", e.target.value)}
          placeholder="Task title" className="w-full input-task" />
        <textarea maxLength={5000} value={form.description || ""} onChange={(e) => update("description", e.target.value)}
          placeholder="Description" rows={3} className="w-full input-task resize-none" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="field-task">Assignee
            <select value={form.assignedTo || ""} onChange={(e) => update("assignedTo", e.target.value)} className="input-task">
              {participants.map((participant) => {
                const id = participant._id || participant;
                return <option key={id} value={id}>{participant.fullName || "Participant"}</option>;
              })}
            </select>
          </label>
          <label className="field-task">Priority
            <select value={form.priority || "medium"} onChange={(e) => update("priority", e.target.value)} className="input-task">
              {["low", "medium", "high", "urgent"].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="field-task">Due date
            <input type="datetime-local" value={toInputDate(form.dueAt)} onChange={(e) => update("dueAt", e.target.value)} className="input-task" />
          </label>
          <label className="field-task">Reminder
            <input type="datetime-local" value={toInputDate(form.reminderAt)} onChange={(e) => update("reminderAt", e.target.value)} className="input-task" />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-xl bg-chatsphere-500 text-white text-sm font-semibold">Save task</button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;
