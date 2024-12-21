import mongoose from "mongoose";

// Variant Schema for Variable Products
const variantSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
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
    price: {
      type: Number,
      required: [true, "Product Price is required"],
    },
    discountedPrice: {
      type: Number,
      default: null, // Can be null if there is no discount
    },
    images: {
      type: [String], // Array of image URLs
      required: [true, "Product images is required"],
    },
    imagesPublicIds: {
      type: [String],
      required: [true, "Product images public id is required"],
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
      default: 1,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category", // Linking to Category schema
        required: [true, "Product categories is required"],
      },
    ],
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review", // Store only review references here
      },
    ],
    isVariable: {
      type: Boolean,
      default: false, // Indicates if the product has variants
    },
    variants: [variantSchema], // Array of product variants for variable products
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export { Product };
