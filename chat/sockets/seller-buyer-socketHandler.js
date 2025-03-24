import { Server } from "socket.io";
import { Message } from "../models/seller-buyer-chat.models.js";

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Handle sending and receiving messages
    socket.on("sendMessage", async (data) => {
      try {
        const newMessage = new Message(data);
        await newMessage.save();

        // Emit the message to the receiver
        io.to(data.receiver).emit("receiveMessage", newMessage);
      } catch (error) {
        console.error("Error saving message:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};
