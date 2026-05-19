import Modal from "../common/Modal";
import Avatar from "../common/Avatar";
import { formatLastSeen } from "../../lib/utils";
import useChatStore from "../../store/useChatStore";

/**
 * Profile modal — shows a user's profile information.
 */
const ProfileModal = ({ user, isOpen, onClose }) => {
  const { onlineUsers } = useChatStore();
  if (!user) return null;
  const isOnline = onlineUsers.has(user._id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contact Info" size="sm">
      <div className="flex flex-col items-center text-center space-y-4">
        <Avatar src={user.avatar} name={user.fullName} size="2xl" isOnline={isOnline} />
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{user.fullName}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
        <div className="w-full text-left space-y-3 pt-2 border-t border-gray-100 dark:border-dark-4">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">About</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{user.about || "Hey there! I am using WhatsApp"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Status</p>
            <p className={`text-sm font-medium ${isOnline ? "text-whatsapp-500" : "text-gray-500"}`}>
              {isOnline ? "Online" : `Last seen ${formatLastSeen(user.lastSeen)}`}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ProfileModal;
