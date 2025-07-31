import mongoose from "mongoose";

const buyerSchema = new mongoose.Schema(
  {
    // User's full name with validation for minimum and maximum length
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
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
    browsingHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    phoneNumber: { type: String, trim: true },

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
      country: { type: String, trim: true, default: "Pakistan" },
      province: { type: String, trim: true },
      city: { type: String, trim: true },
      remainingAddress: { type: String, trim: true },
      notes: { type: String, trim: true },
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
        variant: {
          // Add variant reference
          type: mongoose.Schema.Types.ObjectId,
          required: true,
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
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        variant: {
          // Add variant reference
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
      },
    ],
    likedReels: [
      {
        reel: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Reel",
          required: true,
        },
        _id: false, // <-- prevent Mongoose from assigning _id to each subdoc if not needed
      },
    ],
  },
  { timestamps: true }
);

const Buyer = mongoose.model("Buyer", buyerSchema);

export { Buyer };
