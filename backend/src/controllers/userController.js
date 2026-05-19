import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { getIO } from "../config/socket.js";

/**
 * Search users by name or email
 * GET /api/users/search?q=query
 */
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({
      _id: { $ne: req.user._id }, // Exclude current user
      $or: [
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .select("fullName email avatar about isOnline lastSeen")
      .limit(20);

    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

/**
 * Get own profile
 * GET /api/users/profile
 */
export const getProfile = async (req, res) => {
  res.json({ success: true, user: req.user });
};

/**
 * Update profile (name, about)
 * PUT /api/users/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, about } = req.body;
    const updates = {};

    if (fullName) updates.fullName = fullName;
    if (about !== undefined) updates.about = about;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    const io = getIO();
    io.emit("user:updated", {
      userId: user._id,
      fullName: user.fullName,
      avatar: user.avatar,
      about: user.about,
    });

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload/update avatar
 * PUT /api/users/avatar
 */
export const updateAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body; // Base64 image string

    if (!avatar) {
      return res.status(400).json({ message: "Avatar image is required" });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(avatar, {
      folder: "whatsapp-clone/avatars",
      width: 200,
      height: 200,
      crop: "fill",
      gravity: "face",
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    );

    const io = getIO();
    io.emit("user:updated", {
      userId: user._id,
      fullName: user.fullName,
      avatar: user.avatar,
      about: user.about,
    });

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      "fullName email avatar about isOnline lastSeen"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle block/unblock a user
 * POST /api/users/:id/block
 */
export const toggleBlockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isBlocked = user.blockedUsers.includes(id);

    if (isBlocked) {
      user.blockedUsers = user.blockedUsers.filter(
        (userId) => userId.toString() !== id
      );
    } else {
      user.blockedUsers.push(id);
    }

    await user.save();
    res.json({ success: true, blockedUsers: user.blockedUsers });
  } catch (error) {
    next(error);
  }
};
