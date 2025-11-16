// controllers/audio.controller.js
import { v2 as cloudinary } from "cloudinary";
import Message from "../models/message.model.js";

// ✅ configure cloudinary (if not already)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadAudio = async (req, res) => {
  try {
    const { audioData, receiverId } = req.body;
    const senderId = req.user._id;

    if (!audioData || !receiverId) {
      return res.status(400).json({ message: "Audio data or receiver missing" });
    }

    // Upload to Cloudinary
    const uploadRes = await cloudinary.uploader.upload(audioData, {
      resource_type: "video", // audio treated as video in Cloudinary
      folder: "voice_messages",
    });

    const newMsg = new Message({
      senderId,
      receiverId,
      fileUrl: uploadRes.secure_url,
      fileType: "audio",
      fileName: "voice_message",
    });

    await newMsg.save();
    res.status(201).json(newMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Audio upload failed" });
  }
};
