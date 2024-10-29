import mongoose from "mongoose";
// Review Schema
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming you have a User model
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
      required: true,
    },
  },
  { timestamps: true }
);

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

// Main Product Schema
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
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
    // brand:{

    // }
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);
const Product = mongoose.model("Product", productSchema);
const Review = mongoose.model("Review", reviewSchema);

export { Product, Category, Review };
