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

  const { activeConversation, sendMessage, uploadFile } = useChatStore();
  const { user, toggleBlockUser } = useAuthStore();
  const { startTyping, stopTyping } = useTyping(activeConversation?._id);

  // Check if current user has blocked the recipient
  const recipient = activeConversation?.type === "direct" 
    ? activeConversation.participants.find(p => p._id !== user._id)
    : null;
  const isBlockedByMe = recipient && user?.blockedUsers?.includes(recipient._id);

  const handleSend = async () => {
    if (!text.trim() && !preview) return;
    if (!activeConversation) return;

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
      await sendMessage({
        conversationId: activeConversation._id,
        content: text.trim(),
        type: "text",
      });
    }

    setText("");
    stopTyping();
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
          className="text-sm text-whatsapp-500 hover:text-whatsapp-600 font-medium"
        >
          Tap to unblock
        </button>
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
              <div className="w-16 h-16 bg-whatsapp-500/10 rounded-lg flex items-center justify-center">
                <IoDocument className="w-8 h-8 text-whatsapp-500" />
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
            className="w-full px-4 py-3 bg-white dark:bg-dark-3 rounded-2xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-whatsapp-500/30 max-h-32 overflow-y-auto transition-all"
            style={{ minHeight: "44px" }}
            onInput={(e) => {
              e.target.style.height = "44px";
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
            }}
          />
        </div>

        {/* Send or Mic button */}
        {text.trim() || preview ? (
          <button
            id="send-button"
            onClick={handleSend}
            disabled={isUploading}
            className="p-3 bg-whatsapp-500 text-white rounded-full hover:bg-whatsapp-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-whatsapp-500/25 flex-shrink-0 disabled:opacity-50"
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
            className="p-3 bg-whatsapp-500 text-white rounded-full hover:bg-whatsapp-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-whatsapp-500/25 flex-shrink-0"
          >
            <IoMic className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Backdrop for emoji/attach */}
      {(showEmoji || showAttach) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowEmoji(false); setShowAttach(false); }} />
      )}
    </div>
  );
};

export default MessageInput;
