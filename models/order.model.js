import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buyer",
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
      street: { type: String, trim: true, required: true },
      city: { type: String, trim: true, required: true },
      state: { type: String, trim: true, required: true },
      postalCode: {
        type: String,
        trim: true,
        required: true,
        maxlength: [10, "Postal code cannot exceed 10 characters"],
      },
      country: { type: String, trim: true, required: true },
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export { Order };
