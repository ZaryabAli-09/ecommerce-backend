import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
    orderItems: [orderItemSchema], // Items from this seller
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "shipped", "delivered", "canceled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash on delivery", "card"],
      required: true,
    },
    paymentDetails: {
      transactionId: { type: String, trim: true }, // From the payment gateway
      paymentGateway: { type: String, trim: true }, // e.g., "Stripe", "PayPal"
      paymentStatus: {
        type: String,
      },
    },
    shippingAddress: {
      street: { type: String, trim: true, required: true },
      city: { type: String, trim: true, required: true },
      state: { type: String, trim: true, required: true },
      postalCode: {
        type: String,
        trim: true,
        // required: true,
        maxlength: [10, "Postal code cannot exceed 10 characters"],
      },
      notes: { type: String, trim: true }, // Optional notes for the delivery
      country: { type: String, trim: true, required: true },
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export { Order };
