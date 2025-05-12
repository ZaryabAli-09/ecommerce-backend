import mongoose from "mongoose";

// Variant Schema for Variable Products
const variantSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true, // Ensures each variant has a unique ID
  },
  size: {
    type: String, // Optional (Only for clothes/shoes)
  },
  color: {
    type: String, // Optional (Only if the product has color variations)
  },
  price: {
    type: Number, // Each variant can have its own price
    required: true,
  },
  discountedPrice: {
    type: Number, // Discounted price per variant
    default: null, // No discount by default
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
  images: [
    {
      url: String,
      public_id: String,
    },
  ],
});

// Main Product Schema
const productSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true, // Trims unnecessary whitespace
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      required: [true, "Product slug is required"],
      unique: true,
    },

    numReviews: {
      type: Number,
      default: 0,
    },
    sold: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
    countInStock: {
      type: Number,
      default: 0,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category", // Linking to Category schema
        // required: [true, "Product categories is required"],
      },
    ],
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review", // Store only review references here
      },
    ],

    variants: [variantSchema], // Array of product variants for variable products
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export { Product };
