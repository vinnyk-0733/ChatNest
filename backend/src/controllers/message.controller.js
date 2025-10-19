import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { encrypt, decrypt } from "../utils/encryption.js";

// 🧩 Get all users except logged-in one
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🧩 Get all messages between logged-in user and another user
export const getMessages = async (req, res) => {
  const userId = req.user._id.toString();
  const otherUserId = req.params.id;

  try {
    // Populate reactions.userId (name + profilepic) so client can show who reacted
    const messages = await Message.find({
      $and: [
        {
          $or: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("reactions.userId", "name profilepic");

    const formattedMessages = messages.map((msg) => {
      const plainObject = msg.toObject();

      if (msg.isDeleted || msg.deletedFor.includes(userId)) {
        return {
          ...plainObject,
          text: "deleted message",
          image: null,
          // keep reactions visible even for deleted messages if you prefer (optional)
        };
      }

      return {
        ...plainObject,
        text: msg.text ? decrypt(msg.text) : "",
      };
    });

    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to load messages" });
  }
};


// 🧩 Send message (text, image, video, or PDF)
export const sendMessage = async (req, res) => {
  try {
    const { text, file } = req.body; // file = base64 or null
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !file) {
      return res.status(400).json({ message: "Message must contain text or file." });
    }

    let uploadedFileUrl = null;
    let uploadedFileType = null;
    let uploadedFileName = null;

    // ✅ Upload file to Cloudinary if provided
    if (file) {
      const uploadResponse = await cloudinary.uploader.upload(file, {
        resource_type: "auto",
        use_filename: true, // keep original name
        unique_filename: false, // don't rename randomly
      });

      uploadedFileUrl = uploadResponse.secure_url;
      uploadedFileName =
        uploadResponse.original_filename +
        (uploadResponse.format ? `.${uploadResponse.format}` : "");
      const mimeType = uploadResponse.resource_type;
      if (mimeType === "image") uploadedFileType = "image";
      else if (mimeType === "video") uploadedFileType = "video";
      else uploadedFileType = "pdf";
    }

    const encryptedText = text ? encrypt(text) : "";

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: encryptedText,
      fileUrl: uploadedFileUrl,
      fileType: uploadedFileType,
      fileName: uploadedFileName,
    });

    const safeMessage = {
      ...newMessage.toObject(),
      text: decrypt(newMessage.text || ""),
    };

    // 🔁 Real-time socket emit to both users
    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId);

    if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", safeMessage);
    if (senderSocketId) io.to(senderSocketId).emit("newMessage", safeMessage);

    res.status(201).json(safeMessage);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Error sending message", error: err.message });
  }
};

// 🧩 Delete message
export const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const currentUserId = req.user._id.toString();

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (!message.deletedFor.includes(currentUserId)) {
      message.deletedFor.push(currentUserId);
    }

    const senderId = message.senderId.toString();
    const receiverId = message.receiverId.toString();

    if (message.deletedFor.includes(senderId) && message.deletedFor.includes(receiverId)) {
      message.isDeleted = true;
    }

    await message.save();

    const responseMessage = {
      ...message.toObject(),
      text: "deleted message",
      image: null,
    };

    const senderSocketId = getReceiverSocketId(senderId);
    const receiverSocketId = getReceiverSocketId(receiverId);

    if (senderSocketId) io.to(senderSocketId).emit("messageDeleted", responseMessage);
    if (receiverSocketId) io.to(receiverSocketId).emit("messageDeleted", responseMessage);

    res.status(200).json({ message: "Message deleted for current user", data: responseMessage });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

// 🧩 Edit message
export const editMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const encryptedText = encrypt(text);

    const updatedMessage = await Message.findByIdAndUpdate(
      req.params.id,
      { text: encryptedText, edited: true, editedAt: new Date() },
      { new: true }
    );

    if (!updatedMessage) return res.status(404).json({ error: "Message not found" });

    const decryptedMessage = {
      ...updatedMessage.toObject(),
      text: text,
    };

    const senderSocketId = getReceiverSocketId(updatedMessage.senderId.toString());
    const receiverSocketId = getReceiverSocketId(updatedMessage.receiverId.toString());

    if (senderSocketId) io.to(senderSocketId).emit("messageEdited", decryptedMessage);
    if (receiverSocketId) io.to(receiverSocketId).emit("messageEdited", decryptedMessage);

    res.status(200).json(decryptedMessage);
  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({ error: "Failed to edit message" });
  }
};

// 🧩 Search messages between logged-in user and another user
export const searchMessages = async (req, res) => {
  const userId = req.user._id.toString();
  const otherUserId = req.params.id; // ✅ FIX: use route param instead of query
  const { query } = req.query;

  if (!query) return res.status(400).json({ message: "Query is required" });

  try {
    // ✅ Fetch messages between two users
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    }).sort({ createdAt: 1 });

    // ✅ Decrypt and filter locally
    const filteredMessages = messages
      .map((msg) => ({
        ...msg.toObject(),
        text: msg.text ? decrypt(msg.text) : "",
      }))
      .filter((msg) =>
        msg.text.toLowerCase().includes(query.toLowerCase())
      );

    res.status(200).json(filteredMessages);
  } catch (err) {
    console.error("Search messages error:", err);
    res.status(500).json({ message: "Failed to search messages" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const emoji = req.body.emoji;
    const userId = req.user._id.toString();

    if (!emoji) return res.status(400).json({ error: "Emoji is required" });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Ensure reactions array exists
    if (!Array.isArray(message.reactions)) message.reactions = [];

    // Find existing reaction by this user
    const existingIndex = message.reactions.findIndex(
      (r) => r.userId?.toString() === userId
    );

    if (existingIndex !== -1) {
      const existingEmoji = message.reactions[existingIndex].emoji;
      if (existingEmoji === emoji) {
        // Toggle off (remove)
        message.reactions.splice(existingIndex, 1);
      } else {
        // Change reaction to new emoji
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ userId: userId, emoji });
    }

    await message.save();

    // Re-fetch the message and populate reaction user info for the client
    const updatedMessage = await Message.findById(messageId).populate(
      "reactions.userId",
      "name profilepic"
    );

    const safeMessage = {
      ...updatedMessage.toObject(),
      text: updatedMessage.text ? decrypt(updatedMessage.text) : "",
    };

    // Emit to sender and receiver (so only the two participants receive update)
    const senderId = updatedMessage.senderId.toString();
    const receiverId = updatedMessage.receiverId.toString();

    const senderSocketId = getReceiverSocketId(senderId);
    const receiverSocketId = getReceiverSocketId(receiverId);

    if (senderSocketId) io.to(senderSocketId).emit("messageReaction", safeMessage);
    if (receiverSocketId) io.to(receiverSocketId).emit("messageReaction", safeMessage);

    // Respond to API caller too
    res.status(200).json({ message: "Reaction updated", data: safeMessage });
  } catch (error) {
    console.error("reactToMessage error:", error);
    res.status(500).json({ error: "Failed to react to message" });
  }
};
