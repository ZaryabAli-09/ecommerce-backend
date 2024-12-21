import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // Reference to the same Category model for parent-child relationship
      default: null, // Null indicates that this is a top-level category
    },
    subCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category", // Reference to subcategories
      },
    ],
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);

export { Category };
