// models/message.model.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String },
    fileUrl: { type: String }, // ✅ handles image/video/pdf
    fileType: { type: String, enum: ["image", "video", "pdf", null], default: null },
    fileName: { type: String, default: null },
    deletedFor: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],
  },
  { timestamps: true }
);
messageSchema.index({ text: "text" });
const Message = mongoose.model("Message", messageSchema);
export default Message;
