import { IoChatbubbles, IoLockClosed } from "react-icons/io5";

/**
 * Empty chat placeholder — shown when no conversation is selected.
 */
const EmptyChat = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-light-2 dark:bg-dark-1 text-center px-8">
      <div className="w-72 h-72 mb-6 relative">
        {/* Decorative circles */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-40 h-40 bg-whatsapp-500/5 rounded-full animate-pulse" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 bg-whatsapp-500/10 rounded-full" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <IoChatbubbles className="w-16 h-16 text-whatsapp-500/60" />
        </div>
      </div>

      <h2 className="text-2xl font-light text-gray-700 dark:text-gray-300 mb-3">
        WhatsApp Web
      </h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md leading-relaxed">
        Send and receive messages without keeping your phone online.
        Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
      </p>

      <div className="flex items-center gap-2 mt-8 text-xs text-gray-400 dark:text-gray-600">
        <IoLockClosed className="w-3.5 h-3.5" />
        <span>End-to-end encrypted</span>
      </div>
    </div>
  );
};

export default EmptyChat;
