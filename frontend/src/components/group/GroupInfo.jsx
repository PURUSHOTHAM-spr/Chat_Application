import Modal from "../common/Modal";
import Avatar from "../common/Avatar";
import useChatStore from "../../store/useChatStore";

/**
 * Group info panel — shows group details and members list.
 */
const GroupInfo = ({ conversation, isOpen, onClose }) => {
  const { onlineUsers } = useChatStore();
  if (!conversation || conversation.type !== "group") return null;
  const { groupInfo, participants } = conversation;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group Info" size="md">
      <div className="space-y-6">
        {/* Group avatar and name */}
        <div className="flex flex-col items-center text-center">
          <Avatar src={groupInfo?.avatar} name={groupInfo?.name} size="xl" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-3">{groupInfo?.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Group · {participants?.length} participants</p>
          {groupInfo?.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xs">{groupInfo.description}</p>
          )}
        </div>

        {/* Members list */}
        <div>
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            {participants?.length} participants
          </h4>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {participants?.map((p) => (
              <div key={p._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-3 transition-colors">
                <Avatar src={p.avatar} name={p.fullName} size="sm" isOnline={onlineUsers.has(p._id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {p.fullName}
                    {p._id === groupInfo?.admin?._id && (
                      <span className="ml-2 text-xs text-whatsapp-500 font-normal">Admin</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{p.about || p.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default GroupInfo;
