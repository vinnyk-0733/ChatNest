import express from "express";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage,
  deleteMessage,
  editMessage,
  searchMessages,
  reactToMessage // new controller
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Fetch all chat users except logged-in user
router.get("/users", protectRoute, getUsersForSidebar);

// Get all messages between current user and selected user
router.get("/:id", protectRoute, getMessages);

// Send a message (text/image)
router.post("/send/:id", protectRoute, sendMessage);

// Edit a message
router.put("/:id", protectRoute, editMessage);

// Delete message (for self / for both)
router.delete("/:id", protectRoute, deleteMessage);

// Search messages between logged-in user and another user
router.get("/search/:id", protectRoute, searchMessages);

// ✅ React to a message (toggle/change reaction) - new route
// Body: { emoji: "👍" }
router.post("/:id/react", protectRoute, reactToMessage);

export default router;
