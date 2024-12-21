import mongoose from "mongoose";

const buyerSchema = new mongoose.Schema(
  {
    // User's full name with validation for minimum and maximum length
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      lowercase: true,
      minlength: [3, "Name must be at least 3 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    // Unique email with proper regex validation and error messages
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, "Please enter a valid email address"],
    },

    // Password with minimum length validation and error message
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },

    // Role for differentiating between regular users and admins
    role: {
      type: String,
      default: "buyer",
      immutable: true,
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      default: null,
    },

    interests: {
      type: [String],
      enum: [
        "jackets",
        "slippers",
        "casual-shirts",
        "jeans",
        "dresses",
        "shoes",
        "sweaters",
        "t-shirts",
        "shorts",
        "hats",
        "accessories",
        "activewear",
        "bags",
        "socks",
        "sneakers",
      ],
      default: [],
    },

    // Address object for user's shipping or billing address
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: {
        type: String,
        trim: true,
        maxlength: [10, "Postal code cannot exceed 10 characters"],
      },
      country: { type: String, trim: true },
    },

    // Verification for email status
    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationOtp: {
      type: String,
    },

    verificationOtpExpiresAt: {
      type: Date,
    },

    // Refresh token for auth sessions
    refreshToken: {
      type: String,
    },

    // Password reset token
    resetPasswordToken: {
      type: String,
    },

    resetPasswordTokenExpiresAt: {
      type: Date,
    },

    // Shopping cart: Array of product items with references to product schema
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          default: 1,
          min: [1, "Quantity must be at least 1"],
        },
      },
    ],
    // Wishlist: Array of product references the user has favorited
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true }
);

const Buyer = mongoose.model("Buyer", buyerSchema);

export { Buyer };
