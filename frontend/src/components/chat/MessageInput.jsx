import { useState, useRef, useEffect } from "react";
import {
  IoSend,
  IoHappy,
  IoAttach,
  IoImage,
  IoDocument,
  IoMic,
  IoClose,
  IoStop,
  IoTime,
} from "react-icons/io5";
import EmojiPicker from "emoji-picker-react";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";
import useTyping from "../../hooks/useTyping";
import { fileToBase64 } from "../../lib/utils";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Cleanup recording timer on unmount or when recording stops
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Stop timer when recording stops
  useEffect(() => {
    if (!isRecording && recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, [isRecording]);

  const { activeConversation, sendMessage, uploadFile, isSendingMessage, createScheduledMessage } = useChatStore();
  const { user, toggleBlockUser } = useAuthStore();
  const { startTyping, stopTyping } = useTyping(activeConversation?._id);

  // Check if current user has blocked the recipient
  const recipient = activeConversation?.type === "direct" 
    ? activeConversation.participants.find(p => p._id !== user._id)
    : null;
  const isBlockedByMe = recipient && user?.blockedUsers?.includes(recipient._id);

  const handleOpenSchedule = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    const pad = (n) => String(n).padStart(2, "0");
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setScheduleDateTime(formatted);
    setShowSchedule((prev) => !prev);
    setShowEmoji(false);
    setShowAttach(false);
  };

  const setPresetSchedule = (minutes, isTomorrow9AM = false) => {
    let d = new Date();
    if (isTomorrow9AM) {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else {
      d = new Date(Date.now() + minutes * 60 * 1000);
      d.setSeconds(0, 0);
    }
    const pad = (n) => String(n).padStart(2, "0");
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setScheduleDateTime(formatted);
  };

  const handleScheduleSubmit = async () => {
    if (!text.trim() && !preview) {
      toast.error("Please enter a message or attach a file to schedule");
      return;
    }
    if (!activeConversation) return;
    if (!scheduleDateTime) {
      toast.error("Please select a date and time");
      return;
    }

    const scheduledDate = new Date(scheduleDateTime);
    if (scheduledDate <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    setIsScheduling(true);
    try {
      if (preview) {
        setIsUploading(true);
        const result = await uploadFile(preview.data);
        if (result) {
          await createScheduledMessage({
            conversationId: activeConversation._id,
            content: result.url,
            type: preview.type,
            fileName: preview.name,
            fileSize: preview.size,
            scheduledAt: scheduledDate.toISOString(),
          });
        }
      } else {
        const messageText = text.trim();
        await createScheduledMessage({
          conversationId: activeConversation._id,
          content: messageText,
          type: "text",
          scheduledAt: scheduledDate.toISOString(),
        });
      }
      setText("");
      setPreview(null);
      setShowSchedule(false);
      stopTyping();
    } catch (err) {
      console.error(err);
      toast.error("Failed to schedule message");
    } finally {
      setIsScheduling(false);
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim() && !preview) return;
    if (!activeConversation) return;
    // Guard against duplicate sends while a message is in-flight
    if (isSendingMessage) return;

    if (preview) {
      setIsUploading(true);
      try {
        const result = await uploadFile(preview.data);
        if (result) {
          await sendMessage({
            conversationId: activeConversation._id,
            content: result.url,
            type: preview.type,
            fileName: preview.name,
            fileSize: preview.size,
          });
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload file. It might be too large.");
      } finally {
        setPreview(null);
        setIsUploading(false);
      }
    } else {
      // Clear text IMMEDIATELY before the async call to prevent duplicate sends
      const messageText = text.trim();
      setText("");
      stopTyping();
      await sendMessage({
        conversationId: activeConversation._id,
        content: messageText,
        type: "text",
      });
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setText(e.target.value);
    startTyping();
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1 || items[i].type.indexOf("application") !== -1) {
        const file = items[i].getAsFile();
        if (!file) continue;
        
        if (file.size > 10 * 1024 * 1024) {
          toast.error("Pasted file size must be under 10MB");
          return;
        }
        
        const type = items[i].type.indexOf("image") !== -1 ? "image" : "file";
        const base64 = await fileToBase64(file);
        setPreview({ data: base64, type, name: file.name || `pasted_${type}`, size: file.size });
        break; // Only handle the first pasted file
      }
    }
  };

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    const base64 = await fileToBase64(file);
    setPreview({ data: base64, type, name: file.name, size: file.size });
    setShowAttach(false);
  };

  const startVoiceRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      };

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          // Strip the data URL prefix to get just the base64 string
          const base64Audio = reader.result.split(",")[1];
          await sendVoiceMessage(base64Audio, audioBlob.size);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const sendVoiceMessage = async (base64Audio, fileSize) => {
    if (!activeConversation) return;

    setIsUploading(true);
    try {
      // Prepend data URL prefix for Cloudinary
      const dataUrl = `data:audio/webm;base64,${base64Audio}`;
      const result = await uploadFile(dataUrl);
      if (result) {
        await sendMessage({
          conversationId: activeConversation._id,
          content: result.url,
          type: "voice",
          fileName: `voice_${Date.now()}.webm`,
          fileSize,
        });
        toast.success("Voice message sent");
      }
    } catch (error) {
      console.error("Voice upload error:", error);
      toast.error("Failed to send voice message");
    } finally {
      setIsUploading(false);
    }
  };

  if (isBlockedByMe) {
    return (
      <div className="bg-light-2 dark:bg-dark-2 border-t border-gray-200 dark:border-dark-4 p-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">You blocked this contact. Messages cannot be sent or received.</p>
        <button 
          onClick={() => toggleBlockUser(recipient._id)}
          className="text-sm text-chatsphere-500 hover:text-chatsphere-600 font-medium"
        >
          Tap to unblock
        </button>
      </div>
    );
  }

  // Temporary group expired check
  if (activeConversation?.type === "group" && activeConversation?.groupInfo?.isExpired) {
    return (
      <div className="bg-light-2 dark:bg-dark-2 border-t border-gray-200 dark:border-dark-4 p-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center gap-2">
          <span>⏰</span> This temporary group has expired and is now read-only.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-light-2 dark:bg-dark-2 border-t border-gray-200 dark:border-dark-4">
      {/* File preview */}
      {preview && (
        <div className="px-4 pt-3 flex items-center gap-3">
          <div className="relative">
            {preview.type === "image" ? (
              <img src={preview.data} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 bg-chatsphere-500/10 rounded-lg flex items-center justify-center">
                <IoDocument className="w-8 h-8 text-chatsphere-500" />
              </div>
            )}
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
            >
              <IoClose className="w-3 h-3" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{preview.name}</p>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-20 left-4 z-50">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme="auto"
            width={320}
            height={400}
            searchDisabled={false}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 p-3">
        {/* Emoji button */}
        <button
          onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
          className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors flex-shrink-0"
        >
          <IoHappy className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Attach button */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}
            className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-colors"
          >
            <IoAttach className="w-6 h-6 text-gray-500 dark:text-gray-400 rotate-45" />
          </button>
          {showAttach && (
            <div className="absolute bottom-14 left-0 bg-white dark:bg-dark-3 rounded-xl shadow-xl border border-gray-100 dark:border-dark-4 py-2 w-44 z-50 animate-slide-up">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-dark-4 transition-colors"
              >
                <IoImage className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Photo</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-dark-4 transition-colors"
              >
                <IoDocument className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Document</span>
              </button>
            </div>
          )}
        </div>

        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, "image")} />
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileSelect(e, "file")} />

        {/* Text input */}
        <div className="flex-1">
          <textarea
            ref={inputRef}
            id="message-input"
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Type a message"
            rows={1}
            className="w-full px-4 py-3 bg-white dark:bg-dark-3 rounded-2xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-chatsphere-500/30 max-h-32 overflow-y-auto transition-all"
            style={{ minHeight: "44px" }}
            onInput={(e) => {
              e.target.style.height = "44px";
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
            }}
          />
        </div>

        {/* Schedule button */}
        <button
          type="button"
          onClick={handleOpenSchedule}
          className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${
            showSchedule
              ? "bg-chatsphere-500/10 text-chatsphere-600 dark:text-chatsphere-400"
              : "hover:bg-gray-200 dark:hover:bg-dark-4 text-gray-500 dark:text-gray-400"
          }`}
          title="Schedule message"
        >
          <IoTime className="w-5 h-5" />
        </button>

        {/* Send or Mic button */}
        {text.trim() || preview ? (
          <button
            id="send-button"
            onClick={handleSend}
            disabled={isUploading || isSendingMessage}
            className="p-3 bg-chatsphere-500 text-white rounded-full hover:bg-chatsphere-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-chatsphere-500/25 flex-shrink-0 disabled:opacity-50"
            title="Send now"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <IoSend className="w-5 h-5" />
            )}
          </button>
        ) : isRecording ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-semibold">
              {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
            </span>
            <button
              onClick={stopVoiceRecording}
              className="p-1 hover:bg-red-600 rounded-full transition-colors"
            >
              <IoStop className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={startVoiceRecording}
            className="p-3 bg-chatsphere-500 text-white rounded-full hover:bg-chatsphere-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-chatsphere-500/25 flex-shrink-0"
          >
            <IoMic className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Schedule Message Popover */}
      {showSchedule && (
        <div className="absolute bottom-20 right-4 w-80 bg-white dark:bg-dark-3 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-4 p-4 z-50 animate-slide-up">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-dark-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-chatsphere-500/10 flex items-center justify-center text-chatsphere-600 dark:text-chatsphere-400">
                <IoTime className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Schedule Message</h4>
            </div>
            <button
              onClick={() => setShowSchedule(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-dark-4 rounded-full text-gray-400"
            >
              <IoClose className="w-4 h-4" />
            </button>
          </div>

          {/* Quick presets */}
          <p className="text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Quick Presets</p>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => setPresetSchedule(30)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-dark-4 hover:bg-chatsphere-500/10 hover:text-chatsphere-600 dark:hover:text-chatsphere-400 text-gray-700 dark:text-gray-300 font-medium transition-colors text-left"
            >
              ⏱️ In 30 mins
            </button>
            <button
              type="button"
              onClick={() => setPresetSchedule(60)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-dark-4 hover:bg-chatsphere-500/10 hover:text-chatsphere-600 dark:hover:text-chatsphere-400 text-gray-700 dark:text-gray-300 font-medium transition-colors text-left"
            >
              ⏱️ In 1 hour
            </button>
            <button
              type="button"
              onClick={() => setPresetSchedule(180)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-dark-4 hover:bg-chatsphere-500/10 hover:text-chatsphere-600 dark:hover:text-chatsphere-400 text-gray-700 dark:text-gray-300 font-medium transition-colors text-left"
            >
              ⏱️ In 3 hours
            </button>
            <button
              type="button"
              onClick={() => setPresetSchedule(0, true)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-dark-4 hover:bg-chatsphere-500/10 hover:text-chatsphere-600 dark:hover:text-chatsphere-400 text-gray-700 dark:text-gray-300 font-medium transition-colors text-left"
            >
              ☀️ Tomorrow 9 AM
            </button>
          </div>

          {/* Date Time Input */}
          <label className="text-[11px] font-semibold text-gray-400 block mb-1.5 uppercase tracking-wider">
            Custom Date & Time
          </label>
          <input
            type="datetime-local"
            value={scheduleDateTime}
            onChange={(e) => setScheduleDateTime(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-4 border border-gray-200 dark:border-dark-4 rounded-xl text-xs text-gray-900 dark:text-white mb-3 focus:outline-none focus:ring-1 focus:ring-chatsphere-500"
          />

          <button
            type="button"
            onClick={handleScheduleSubmit}
            disabled={isScheduling || isUploading || (!text.trim() && !preview)}
            className="w-full py-2 bg-chatsphere-500 text-white rounded-xl text-xs font-semibold hover:bg-chatsphere-600 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-chatsphere-500/20"
          >
            {isScheduling || isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <IoTime className="w-4 h-4" />
                <span>Confirm & Schedule</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Backdrop for emoji/attach/schedule */}
      {(showEmoji || showAttach || showSchedule) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowEmoji(false);
            setShowAttach(false);
            setShowSchedule(false);
          }}
        />
      )}
    </div>
  );
};

export default MessageInput;
