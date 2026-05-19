import { useState, useRef } from "react";
import { IoArrowBack, IoCamera } from "react-icons/io5";
import Avatar from "../common/Avatar";
import useAuthStore from "../../store/useAuthStore";
import api from "../../lib/axios";
import { fileToBase64 } from "../../lib/utils";
import toast from "react-hot-toast";

/**
 * Profile settings panel — slide-in panel for editing user profile.
 */
const ProfileSettings = ({ onClose }) => {
  const { user, updateUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [about, setAbout] = useState(user?.about || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const res = await api.put("/users/profile", { fullName, about });
      updateUser(res.data.user);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    }
    setIsUpdating(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await api.put("/users/avatar", { avatar: base64 });
      updateUser(res.data.user);
      toast.success("Avatar updated!");
    } catch {
      toast.error("Failed to update avatar");
    }
    setIsUploadingAvatar(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-dark-2 h-full animate-slide-in-left shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 header-gradient text-white">
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <IoArrowBack className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>

        <div className="p-6 space-y-8">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar src={user?.avatar} name={user?.fullName} size="2xl" />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploadingAvatar ? (
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IoCamera className="w-8 h-8 text-white" />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs text-whatsapp-600 dark:text-whatsapp-400 font-semibold mb-2">
              Your Name
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="flex-1 px-0 py-2 bg-transparent border-b-2 border-whatsapp-500 text-gray-900 dark:text-white text-base focus:outline-none"
                maxLength={50}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              This is not your username. This name will be visible to your contacts.
            </p>
          </div>

          {/* About */}
          <div>
            <label className="block text-xs text-whatsapp-600 dark:text-whatsapp-400 font-semibold mb-2">
              About
            </label>
            <input
              type="text"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="w-full px-0 py-2 bg-transparent border-b-2 border-gray-200 dark:border-dark-4 text-gray-900 dark:text-white text-base focus:outline-none focus:border-whatsapp-500 transition-colors"
              maxLength={150}
            />
          </div>

          {/* Email (read only) */}
          <div>
            <label className="block text-xs text-whatsapp-600 dark:text-whatsapp-400 font-semibold mb-2">
              Email
            </label>
            <p className="py-2 text-gray-500 dark:text-gray-400 text-base">{user?.email}</p>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="w-full py-3 bg-gradient-to-r from-whatsapp-600 to-whatsapp-500 text-white font-semibold rounded-xl hover:from-whatsapp-700 hover:to-whatsapp-600 transition-all disabled:opacity-50 shadow-lg shadow-whatsapp-500/25"
          >
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
