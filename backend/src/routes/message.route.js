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

router.get("/users", protectRoute, getUsersForSidebar);

router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);

router.put("/:id", protectRoute, editMessage);

router.delete("/:id", protectRoute, deleteMessage);

router.get("/search/:id", protectRoute, searchMessages);

router.post("/:id/react", protectRoute, reactToMessage);

export default router;
