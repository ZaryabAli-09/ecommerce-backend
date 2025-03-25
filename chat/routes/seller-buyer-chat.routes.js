import express from "express";
import {
  getMessages,
  getConversations,
} from "../controllers/seller-buyer-chat.controllers.js";

const router = express.Router();

// Get all conversations for a user (buyer or seller)
router.get("/conversations", getConversations);

// Get messages between two users
router.get("/messages", getMessages);

export default router;
