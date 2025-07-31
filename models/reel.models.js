import mongoose from "mongoose";

const reelSchema = new mongoose.Schema(
  {
    videoUrl: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
    caption: {
      type: String,
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Reel", reelSchema);
