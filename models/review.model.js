import mongoose from "mongoose";

// Review Schema
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buyer", // Reference to the User model
      required: true,
    },
    rating: {
      type: Number,
      required: [true, "Please give Rating"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must not be more than 5"],
    },
    comment: {
      type: String,

      trim: true,
      maxlength: [200, "Comment must not be more than 200 characters"],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true, // Ensures every review is linked to a product
    },
    sellerReply: {
      text: { type: String, default: null }, // Default should be applied inside the field definition
      replyDate: { type: Date, default: null },
      seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Seller",
        default: null, // Default should be explicitly set here
      },
    },
  },
  { timestamps: true } // Automatically handles createdAt and updatedAt timestamps
);
const Review = mongoose.model("Review", reviewSchema);

export { Review };
