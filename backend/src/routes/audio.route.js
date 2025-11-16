// routes/audio.route.js
import express from "express";
import { uploadAudio } from "../controllers/audio.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// POST /api/audio/upload
router.post("/upload", protectRoute, uploadAudio);

export default router;
