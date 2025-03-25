import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "senderModel", // Dynamic referencing
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "receiverModel", // Dynamic referencing
  },
  receiverModel: { type: String, required: true, enum: ["Buyer", "Seller"] },

  senderModel: { type: String, required: true, enum: ["Buyer", "Seller"] },

  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

export { Message };
