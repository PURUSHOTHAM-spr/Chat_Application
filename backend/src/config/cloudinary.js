import { v2 as cloudinary } from "cloudinary";

console.log("Cloudinary config loading:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "set" : "missing",
  api_key: process.env.CLOUDINARY_API_KEY ? "set" : "missing",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "set" : "missing",
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
