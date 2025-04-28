import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema(
  {
    fromType: {
      type: String,
      enum: ["Buyer", "Seller"],
      required: true,
    },
    fromId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "fromType", // dynamic ref
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Dispute", disputeSchema);
