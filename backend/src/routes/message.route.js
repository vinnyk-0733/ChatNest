import express from "express";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage,
  deleteMessage,
  editMessage,
  reactToMessage, 
  searchMessages// ✅ new controller for reactions
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// ✅ Fetch all chat users except logged-in user
router.get("/users", protectRoute, getUsersForSidebar);

// ✅ Get all messages between current user and selected user
router.get("/:id", protectRoute, getMessages);

// ✅ Send a message (text/image)
router.post("/send/:id", protectRoute, sendMessage);

// ✅ Edit a message
router.put("/:id", protectRoute, editMessage);

// ✅ Delete message (for self / for both)
router.delete("/:id", protectRoute, deleteMessage);

// ✅ Add or remove a reaction (👍❤️😂🔥)
router.post("/:id/react", protectRoute, reactToMessage);

// ✅ Search messages between logged-in user and another user
router.get("/search/:id", protectRoute, searchMessages); 


export default router;
