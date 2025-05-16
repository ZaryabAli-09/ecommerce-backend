import { Message } from "../models/seller-buyer-chat.models.js";
import { Seller } from "../../models/seller.model.js";
import { Buyer } from "../../models/buyer.models.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import mongoose from "mongoose";

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.query.userId; // Get user ID from query params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID format.");
    }
    // Fetch all messages where the user is either sender or receiver
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    }).sort({ timestamp: -1 }); // Latest messages first

    // Store only the latest message per conversation
    const conversationMap = new Map();

    for (const msg of messages) {
      const isSender = msg.sender.toString() === userId;
      const otherUserId = isSender ? msg.receiver : msg.sender;
      const otherUserModel = isSender ? msg.receiverModel : msg.senderModel;

      // Get the actual user details based on model (Buyer or Seller)
      let otherUser;
      if (otherUserModel === "Buyer") {
        otherUser = await Buyer.findById(otherUserId).select("name");
      } else if (otherUserModel === "Seller") {
        otherUser = await Seller.findById(otherUserId).select("brandName logo"); //add logo field changes ...............................
      }

      if (otherUser && !conversationMap.has(otherUserId.toString())) {
        conversationMap.set(otherUserId.toString(), {
          _id: otherUser._id,
          name: otherUser.brandName || otherUser.name, // Ensure correct field is used
          lastMessage: msg.message,
          timestamp: msg.timestamp,
          logo: otherUser.logo || null, // changes..................................
        });
      }
    }

    res.status(200).json([...conversationMap.values()]);
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { senderId, receiverId } = req.query;

    if (!senderId || !receiverId) {
      throw new ApiError(400, "Both senderId and receiverId are required.");
    }

    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name brandName")
      .populate("receiver", "name brandName");

    if (!messages.length) {
      throw new ApiError(404, "No messages found.");
    }

    res
      .status(200)
      .json(new ApiResponse(messages, "Messages retrieved successfully."));
  } catch (error) {
    next(error);
  }
};
