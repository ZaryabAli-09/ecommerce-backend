import mongoose from "mongoose";

// Enum for Seller Status
const SellerStatus = {
  PENDING: "pending", // Pending admin approval
  APPROVED: "approved", // Admin approved
  REJECTED: "rejected", // Rejected by admin
  BLOCKED: "blocked", // Blocked by admin
};

// TODO:
//  make bank details fields and others to null in default nature
//  specify the remaining fields in seller validation middleware

const sellerSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      default: null,
    },
    contactNumber: { type: String, required: true },

    brandName: {
      type: String,
      required: true,
    },
    brandDescription: {
      type: String,
      required: true,
    },
    businessAddress: { type: String },

    logo: {
      type: String, // URL to logo image
    },
    coverImage: {
      type: String, // URL to cover image
    },
    socialLinks: {
      instagram: String,
      facebook: String,
      twitter: String,
      linkedin: String,
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      accountHolderName: String,
    },
    role: {
      type: String,
      default: "seller",
      immutable: true, // Ensures the role cannot be changed after creation
    },

    status: {
      type: String,
      enum: Object.values(SellerStatus),
      default: SellerStatus.PENDING,
    },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }], // A reference to the products uploaded by the seller

    adminNotes: {
      type: String, // For admin feedback or rejection reason
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationOtp: {
      type: String, // for email verification
      default: null,
    },
    verificationOtpExpiresAt: {
      type: Number, // for email verification
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordTokenExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Seller = mongoose.model("Seller", sellerSchema);

export { Seller };
