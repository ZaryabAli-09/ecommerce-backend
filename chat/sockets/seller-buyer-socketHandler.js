import { Server } from "socket.io";
import { Message } from "../models/seller-buyer-chat.models.js"; // Ensure correct import

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // Allow frontend URL
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    // User joins their unique chat room
    socket.on("join", (userId) => {
      if (!userId) return;
      socket.join(userId);
      console.log(`ℹ️ User ${userId} joined the chat.`);
    });

    // Handle message sending with validation and proper emitting
    socket.on("sendMessage", async (data, callback) => {
      try {
        console.log("📩 Message received:", data); // Debugging log

        const { sender, receiver, message, senderModel, receiverModel } = data;

        // Validate required fields
        if (!sender || !receiver || !message) {
          throw new Error(
            "Missing required fields (sender, receiver, or message)"
          );
        }

        // Save message to MongoDB
        const newMessage = new Message({
          sender,
          receiver,
          message,
          senderModel,
          receiverModel,
        });

        await newMessage.save();

        // Send message to both sender and receiver
        io.to(sender).emit("receiveMessage", newMessage); // Sender gets their message
        io.to(receiver).emit("receiveMessage", newMessage); // Receiver gets the message

        if (typeof callback === "function") {
          callback({ status: "success", message: newMessage });
        }
      } catch (error) {
        console.error("❌ Message send error:", error.message);
        if (typeof callback === "function") {
          callback({ status: "error", error: error.message });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("⚠️ User disconnected:", socket.id);
    });
  });

  return io;
};
