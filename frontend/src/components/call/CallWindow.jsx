import React, { useEffect, useRef } from "react";
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiX } from "react-icons/fi";
import useCall from "../../hooks/useCall";
import useChatStore from "../../store/useChatStore";
import useAuthStore from "../../store/useAuthStore";

const CallWindow = () => {
  const {
    endCall,
    toggleMute,
    toggleCamera,
    status,
    isMuted,
    cameraOff,
    localStreamRef,
    remoteStreamRef,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { activeConversation } = useChatStore();
  const { user } = useAuthStore();

  // Poll for stream refs and attach them to the video elements when available.
  useEffect(() => {
    let stopped = false;
    const interval = setInterval(() => {
      if (stopped) return;
      try {
        if (localVideoRef.current && localStreamRef.current) {
          if (localVideoRef.current.srcObject !== localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        }
        if (remoteVideoRef.current && remoteStreamRef.current) {
          if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
          }
        }
        // Stop polling once both are attached or call ended
        if ((localVideoRef.current && localVideoRef.current.srcObject) && (remoteVideoRef.current && remoteVideoRef.current.srcObject)) {
          clearInterval(interval);
        }
      } catch (e) {
        // ignore
      }
    }, 200);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [localStreamRef, remoteStreamRef]);

  if (status !== "connected" && status !== "connecting") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] md:w-[520px] bg-white dark:bg-dark-3 rounded-xl shadow-xl overflow-hidden border border-gray-100 dark:border-dark-4">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-1/2 bg-black relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-48 md:h-64 object-cover bg-black"
          />
        </div>
        <div className="w-full md:w-1/2 p-3 flex flex-col gap-2">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-24 h-24 rounded-lg object-cover bg-gray-900 self-end"
          />
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="p-2 rounded-full hover:bg-gray-100" aria-label="Toggle mute">
                {isMuted ? <FiMicOff className="w-5 h-5" /> : <FiMic className="w-5 h-5" />}
              </button>
              <button onClick={toggleCamera} className="p-2 rounded-full hover:bg-gray-100" aria-label="Toggle camera">
                {cameraOff ? <FiVideoOff className="w-5 h-5" /> : <FiVideo className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{status}</span>
              <button
                onClick={() => endCall({ toUserId: null })}
                className="px-3 py-2 rounded-lg bg-red-500 text-white"
              >
                <FiX />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallWindow;
