import React, { useEffect, useState } from "react";
import useCall from "../../hooks/useCall";
import useAuthStore from "../../store/useAuthStore";

const IncomingCallModal = () => {
  const { status, callMeta, acceptCall, rejectCall } = useCall();
  const { user } = useAuthStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(status === "ringing");
  }, [status]);

  if (!visible || !callMeta) return null;

  const from = callMeta.from;
  const type = callMeta.meta?.type || "audio";

  const handleAccept = async () => {
    await acceptCall({ fromUserId: from, type });
    setVisible(false);
  };

  const handleReject = () => {
    rejectCall({ toUserId: from });
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-dark-3 rounded-xl shadow-xl border border-gray-100 dark:border-dark-4 p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Incoming {type} call</h3>
        <p className="text-sm text-gray-500 mb-4">From: {from}</p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleReject}
            className="px-4 py-2 rounded-lg bg-red-100 text-red-600"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 rounded-lg bg-whatsapp-500 text-white"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
