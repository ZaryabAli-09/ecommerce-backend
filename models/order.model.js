// import mongoose from "mongoose";

// const orderItemSchema = new mongoose.Schema({
//   product: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Product",
//     required: true,
//   },
//   variantId: {
//     type: mongoose.Schema.Types.ObjectId,
//     required: true,
//   },
//   quantity: {
//     type: Number,
//     required: true,
//   },
// });

// const subOrderSchema = new mongoose.Schema({
//   seller: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Seller",
//     required: true,
//   },
//   orderItems: [orderItemSchema], // Items from this seller
//   totalAmount: {
//     type: Number,
//     required: true,
//   },
//   status: {
//     type: String,
//     enum: ["pending", "shipped", "delivered", "canceled"],
//     default: "pending",
//   },
// });

// const orderSchema = new mongoose.Schema(
//   {
//     orderBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Buyer",
//     },

//     subOrders: [subOrderSchema],

//     totalAmount: {
//       type: Number,
//       required: true,
//     },

//     paymentMethod: {
//       type: String,
//       enum: ["cash on delivery", "card"],
//       required: true,
//     },
//     paymentDetails: {
//       // Optional, populated only if payment is made online
//       transactionId: { type: String, trim: true }, // From the payment gateway
//       paymentGateway: { type: String, trim: true }, // e.g., "Stripe", "PayPal"
//       paymentDate: { type: Date }, // When payment was made
//     },

//     // Overall order status (aggregated from sub-orders)
//     orderStatus: {
//       type: String,
//       enum: [
//         "pending",
//         "partially shipped",
//         "shipped",
//         "delivered",
//         "canceled",
//       ],
//       default: "pending",
//     },

//     shippingAddress: {
//       street: { type: String, trim: true, required: true },
//       city: { type: String, trim: true, required: true },
//       state: { type: String, trim: true, required: true },
//       postalCode: {
//         type: String,
//         trim: true,
//         required: true,
//         maxlength: [10, "Postal code cannot exceed 10 characters"],
//       },
//       country: { type: String, trim: true, required: true },
//     },
//   },
//   { timestamps: true }
// );

// const Order = mongoose.model("Order", orderSchema);

// export { Order };

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
      paymentDate: { type: Date }, // When payment was made
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
