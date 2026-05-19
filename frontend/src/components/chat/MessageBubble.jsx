import { useState, useRef } from "react";
import { IoCheckmark, IoCheckmarkDone, IoTrash, IoDownload, IoPlay, IoPause } from "react-icons/io5";
import { formatFullTime, formatFileSize } from "../../lib/utils";
import useChatStore from "../../store/useChatStore";
import { MESSAGE_STATUS } from "../../constants";

/**
 * Message bubble — supports text, image, file, voice, and system messages.
 * Shows delivery ticks based on message status.
 */
const MessageBubble = ({ message, isOwn }) => {
  const [showActions, setShowActions] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const { deleteMessage } = useChatStore();
  
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // System messages
  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="px-3 py-1 bg-yellow-50/90 dark:bg-yellow-900/20 backdrop-blur-sm text-xs text-yellow-700 dark:text-yellow-400 rounded-lg italic">
          {message.content}
        </span>
      </div>
    );
  }

  // Deleted messages
  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
        <div className={`max-w-[75%] px-3 py-2 rounded-xl opacity-60 ${
          isOwn ? "bg-bubble-out dark:bg-bubble-outDark rounded-tr-none" : "bg-bubble-in dark:bg-bubble-inDark rounded-tl-none"
        }`}>
          <p className="text-sm italic text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <IoTrash className="w-3.5 h-3.5" /> This message was deleted
          </p>
        </div>
      </div>
    );
  }

  const renderTicks = () => {
    if (!isOwn) return null;
    switch (message.status) {
      case MESSAGE_STATUS.SENT: return <IoCheckmark className="w-4 h-4 tick-sent" />;
      case MESSAGE_STATUS.DELIVERED: return <IoCheckmarkDone className="w-4 h-4 tick-delivered" />;
      case MESSAGE_STATUS.READ: return <IoCheckmarkDone className="w-4 h-4 tick-read" />;
      default: return <IoCheckmark className="w-4 h-4 tick-sent" />;
    }
  };

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative max-w-[75%] md:max-w-[60%]">
        {showActions && isOwn && (
          <div className="absolute top-1 left-0 -translate-x-full pr-2 z-10">
            <button onClick={() => deleteMessage(message._id)} className="p-1.5 bg-white dark:bg-dark-3 rounded-full shadow-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete">
              <IoTrash className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        )}

        <div className={`px-3 py-1.5 rounded-xl shadow-sm animate-fade-in ${
          isOwn ? "bg-bubble-out dark:bg-bubble-outDark rounded-tr-none bubble-tail-out" : "bg-bubble-in dark:bg-bubble-inDark rounded-tl-none bubble-tail-in"
        }`}>
          {!isOwn && message.sender?.fullName && (
            <p className="text-xs font-semibold text-whatsapp-600 dark:text-whatsapp-400 mb-0.5">{message.sender.fullName}</p>
          )}

          {message.type === "image" && (
            <div className="mb-1 rounded-lg overflow-hidden">
              {!imgLoaded && <div className="w-64 h-48 skeleton rounded-lg" />}
              <img src={message.content} alt="Shared" className={`max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 ${imgLoaded ? "" : "hidden"}`} onLoad={() => setImgLoaded(true)} onClick={() => window.open(message.content, "_blank")} />
            </div>
          )}

          {message.type === "file" && (
            <a href={message.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 bg-white/50 dark:bg-white/5 rounded-lg hover:bg-white/80 dark:hover:bg-white/10 transition-colors">
              <div className="w-10 h-10 bg-whatsapp-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <IoDownload className="w-5 h-5 text-whatsapp-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{message.fileName || "File"}</p>
                <p className="text-xs text-gray-400">{formatFileSize(message.fileSize)}</p>
              </div>
            </a>
          )}

          {message.type === "voice" && (
            <div className="flex items-center gap-3 min-w-[200px]">
              <audio
                ref={audioRef}
                src={message.content}
                preload="metadata"
                playsInline
                onLoadedMetadata={() => {
                  if (audioRef.current) {
                    setDuration(audioRef.current.duration);
                  }
                }}
                onTimeUpdate={() => {
                  if (audioRef.current) {
                    setCurrentTime(audioRef.current.currentTime);
                  }
                }}
                onEnded={() => setIsPlaying(false)}
              />
              <button
                onClick={() => {
                  if (!audioRef.current) return;
                  if (isPlaying) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                  } else {
                    audioRef.current.play();
                    setIsPlaying(true);
                  }
                }}
                className="w-8 h-8 bg-whatsapp-500 rounded-full flex items-center justify-center flex-shrink-0"
                type="button"
              >
                {isPlaying ? <IoPause className="w-4 h-4 text-white" /> : <IoPlay className="w-4 h-4 text-white" />}
              </button>
              <div className="flex-1">
                <div className="h-3 bg-white/20 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-whatsapp-500"
                    style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{duration ? formatDuration(duration) : "0:00"}</span>
                </div>
              </div>
            </div>
          )}

          {message.type === "text" && (
            <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          )}

          <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{formatFullTime(message.createdAt)}</span>
            {renderTicks()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
