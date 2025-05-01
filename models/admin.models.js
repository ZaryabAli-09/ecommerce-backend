import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "admin",
      immutable: true,
    },
    title: {
      type: String,
      enum: ["superadmin", "admin"],
      default: "admin",
    },
  },
  { timestamps: true }
);

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcryptjs.hash(this.password, 12);
  }
  next();
});

export const Admin = mongoose.model("Admin", adminSchema);
