import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash on delivery", "card"],
      required: true,
    },
    paymentDetails: {
      // Optional, populated only if payment is made online
      transactionId: { type: String, trim: true }, // From the payment gateway
      paymentGateway: { type: String, trim: true }, // e.g., "Stripe", "PayPal"
      paymentDate: { type: Date }, // When payment was made
    },

    orderStatus: {
      type: String,
      enum: ["pending", "shipped", "delivered", "canceled"],
      default: "pending",
    },

    shippingAddress: {
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: {
        type: String,
        trim: true,
        maxlength: [10, "Postal code cannot exceed 10 characters"],
      },
      country: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

const Order = mongoose.Model("Order", orderSchema);

export { Order };
