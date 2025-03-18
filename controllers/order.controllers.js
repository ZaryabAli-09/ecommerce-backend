import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import sendEmail from "../utils/sendEmail.js";
import { Seller } from "../models/seller.model.js";

async function newOrder(req, res, next) {
  try {
    let { orderItems, paymentMethod, shippingAddress } = req.body;
    const userId = req.buyer._id;
    // Validate inputs
    if (!orderItems || orderItems.length === 0) {
      throw new ApiError(400, "Order items cannot be empty.");
    }
    if (!paymentMethod) {
      throw new ApiError(400, "Payment method is required.");
    }
    if (!shippingAddress) {
      throw new ApiError(400, "Shipping address is required.");
    }

    const { street, city, state, country, postalCode } = shippingAddress;
    if (!street || !city || !state || !postalCode || !country) {
      throw new ApiError(400, "Please complete shipping address.");
    }

    // Populate product details and validate
    const populatedOrderItems = await Promise.all(
      orderItems.map(async (item) => {
        const product = await Product.findById(item.product)
          .select("seller variants")
          .exec();

        if (!product) throw new Error(`Product not found: ${item.product}`);

        const selectedVariant = product.variants.find(
          (variant) => variant._id.toString() === item.variantId
        );
        if (!selectedVariant)
          throw new Error(`Variant not found: ${item.variantId}`);
        if (
          typeof selectedVariant.price !== "number" ||
          selectedVariant.price <= 0
        ) {
          throw new Error(`Invalid price for variant: ${item.variantId}`);
        }

        return {
          ...item,
          product: {
            _id: product._id,
            price: selectedVariant.price,
            discountedPrice: selectedVariant.discountedPrice || null,
            seller: product.seller,
          },
        };
      })
    );

    // Ensure all items belong to the same seller
    const sellerId = populatedOrderItems[0].product.seller;
    if (
      !populatedOrderItems.every(
        (item) => item.product.seller.toString() === sellerId.toString()
      )
    ) {
      throw new ApiError(400, "All items must belong to the same seller.");
    }

    // Calculate total amount for the order
    const totalAmount = populatedOrderItems.reduce((sum, item) => {
      const itemPrice =
        item.product.discountedPrice > 0
          ? item.product.discountedPrice
          : item.product.price;
      return sum + itemPrice * item.quantity;
    }, 0);

    // Create the order
    const order = await Order.create({
      orderBy: userId, // Renamed from `buyer` to `orderBy`
      seller: sellerId,
      orderItems: populatedOrderItems, // Renamed from `items` to `orderItems`
      totalAmount,
      paymentMethod,
      shippingAddress,
    });

    // Notify the seller
    const seller = await Seller.findById(sellerId).select("email").exec();
    if (seller) {
      await sendEmail(
        process.env.SMTP_GMAIL_USER,
        seller.email,
        "New Order Received",
        `You have received a new order (ID: ${order._id}) with a total amount of $${order.totalAmount}.`
      );
    }

    // Notify the buyer
    await sendEmail(
      process.env.SMTP_GMAIL_USER,
      req.buyer.email,
      "Order Placed Successfully",
      `Your order (ID: ${order._id}) has been placed successfully. Total amount: $${order.totalAmount}.`
    );

    return res
      .status(200)
      .json(new ApiResponse(order, "Order placed successfully."));
  } catch (error) {
    next(error);
  }
}

const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const sellerId = req.seller._id;

    // Validate status
    const validStatuses = ["pending", "shipped", "delivered", "canceled"];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, "Invalid status.");
    }

    // Find the order and validate seller ownership
    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId,
    }).populate("orderBy", "email");

    if (!order) {
      throw new ApiError(404, "Order not found.");
    }

    // Update status
    order.status = status;
    await order.save();

    // Notify the buyer
    await sendEmail(
      process.env.SMTP_GMAIL_USER,
      order.orderBy.email, // Renamed from `buyer` to `orderBy`
      "Order Status Updated",
      `Your order (ID: ${order._id}) status has been updated to: ${status}.`
    );

    return res
      .status(200)
      .json(new ApiResponse(order, "Order status updated successfully."));
  } catch (error) {
    next(error);
  }
};

const fetchSellerOrders = async (req, res, next) => {
  try {
    const sellerId = req.seller._id;

    const orders = await Order.find({ seller: sellerId })
      .populate("orderBy", "name email") // Renamed from `buyer` to `orderBy`
      .populate("orderItems.product", "name price variant") // Renamed from `items` to `orderItems`
      .exec();

    if (!orders || orders.length === 0) {
      throw new ApiError(200, "No orders found for this seller.");
    }

    return res
      .status(200)
      .json(new ApiResponse(orders, "Orders fetched successfully."));
  } catch (error) {
    next(error);
  }
};

const getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller._id; // Assuming seller is authenticated

    // Find the order and verify it belongs to the seller
    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId, // Ensure the order belongs to the authenticated seller
    })
      .populate("orderBy", "name email") // Populate buyer details
      .populate({
        path: "orderItems.product", // Renamed from `subOrders.orderItems.product`
        select: "name variants", // Populate product details with variants
      })
      .exec();

    if (!order) {
      throw new ApiError(404, "Order not found.");
    }

    return res.status(200).json(
      new ApiResponse(
        {
          data: order, // Return the entire order (no suborder filtering needed)
        },
        "Order details fetched successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};

// async function myOrders(req, res, next) {
//   try {
//     const orders = await Order.find({ orderBy: req.buyer._id })
//       .populate("orderItems.product", "name price images")
//       .populate("orderBy", "email name");

//     if (!orders || orders.length === 0) {
//       return res.status(404).json({ message: "No orders found." });
//     }

//     return res
//       .status(200)
//       .json(new ApiResponse(orders, "Your orders retrieved successfully."));
//   } catch (error) {
//     next(error);
//   }
// }

// async function allOrders(req, res, next) {
//   try {
//     const orders = await Order.find()
//       .populate("orderBy", "email name") // Fetch user email for reference
//       .populate("orderItems.product", "name price images"); // Fetch product name and price

//     if (orders.length <= 0) {
//       throw new ApiError(404, "No orders found.");
//     }

//     return res
//       .status(200)
//       .json(new ApiResponse(orders, "All orders retrieved successfully."));
//   } catch (error) {
//     next(error);
//   }
// }

// async function newOrder(req, res, next) {
//   try {
//     const userId = req.buyer._id;

//     let { orderItems, paymentMethod, shippingAddress } = req.body;

//     if (!orderItems || orderItems.length === 0) {
//       throw new ApiError(400, "Order items cannot be empty.");
//     }

//     if (!paymentMethod) {
//       throw new ApiError(400, "Payment method is required.");
//     }
//     if (!shippingAddress) {
//       throw new ApiError(400, "Shipping address is required.");
//     }

//     const { street, city, state, country, postalCode } = shippingAddress;

//     if (!street || !city || !state || !postalCode || !country) {
//       throw new ApiError(400, "Please complete shipping address.");
//     }

//     // Populate the product field for each order item
//     const populatedOrderItems = await Promise.all(
//       orderItems.map(async (item) => {
//         const product = await Product.findById(item.product)
//           .select("seller variants")
//           .exec();

//         // Check if product exists
//         if (!product) {
//           throw new Error(`Product not found: ${item.product}`);
//         }

//         // Find the selected variant
//         const selectedVariant = product.variants.find(
//           (variant) => variant._id.toString() === item.variantId
//         );

//         // Check if variant exists and has a valid price
//         if (!selectedVariant) {
//           throw new Error(`Variant not found: ${item.variantId}`);
//         }
//         if (
//           typeof selectedVariant.price !== "number" ||
//           selectedVariant.price <= 0
//         ) {
//           throw new Error(`Invalid price for variant: ${item.variantId}`);
//         }

//         return {
//           ...item,
//           product: {
//             _id: product._id,
//             price: selectedVariant.price,
//             discountedPrice: selectedVariant.discountedPrice || null, // Use discountedPrice if available
//             seller: product.seller,
//           },
//         };
//       })
//     );

//     // Group items by seller
//     const itemsBySeller = populatedOrderItems.reduce((acc, item) => {
//       const sellerId = item.product.seller; // Access seller from populated product
//       if (!acc[sellerId]) {
//         acc[sellerId] = [];
//       }
//       acc[sellerId].push(item);
//       return acc;
//     }, {});

//     // Create subOrders for each seller
//     const subOrders = Object.keys(itemsBySeller).map((sellerId) => {
//       const sellerItems = itemsBySeller[sellerId];

//       // Calculate subOrderTotal
//       const subOrderTotal = sellerItems.reduce((sum, item) => {
//         // Use discountedPrice if it exists and is greater than 0, otherwise use price
//         const itemPrice =
//           item.product.discountedPrice > 0
//             ? item.product.discountedPrice
//             : item.product.price;
//         const itemTotal = itemPrice * item.quantity;

//         if (isNaN(itemTotal)) {
//           throw new Error(
//             `Invalid calculation for product: ${item.product._id}. Price: ${itemPrice}, Quantity: ${item.quantity}`
//           );
//         }
//         return sum + itemTotal;
//       }, 0);

//       return {
//         seller: sellerId,
//         orderItems: sellerItems,
//         totalAmount: subOrderTotal,
//         status: "pending",
//       };
//     });

//     // Calculate the total amount for the entire order
//     const overallTotalAmount = subOrders.reduce(
//       (sum, subOrder) => sum + subOrder.totalAmount,
//       0
//     );

//     // Step 4: Create the order
//     const newOrder = new Order({
//       orderBy: userId,
//       subOrders,
//       totalAmount: overallTotalAmount, // Use the calculated overall total amount
//       paymentMethod,
//       shippingAddress,
//     });

//     const order = await newOrder.save();

//     // Notify the buyer about the new order
//     await sendEmail(
//       process.env.SMTP_GMAIL_USER,
//       req.buyer.email, // Assuming buyer email is available in req.buyer
//       "Order Placed Successfully",
//       `Your order (ID: ${order._id}) has been placed successfully. Total amount: $${order.totalAmount}.`
//     );

//     // Notify each seller about the new order
//     await Promise.all(
//       subOrders.map(async (subOrder) => {
//         const seller = await Seller.findById(subOrder.seller)
//           .select("email")
//           .exec();
//         if (seller) {
//           await sendEmail(
//             process.env.SMTP_GMAIL_USER,
//             seller.email,
//             "New Order Received",
//             `You have received a new order (ID: ${order._id}) with a total amount of $${subOrder.totalAmount}.`
//           );
//         }
//       })
//     );

//     return res
//       .status(200)
//       .json(new ApiResponse(order, "Order placed successfully."));
//   } catch (error) {
//     next(error);
//   }
// }

// const updateOrderStatus = async (req, res, next) => {
//   try {
//     const { orderId } = req.params;
//     const { status } = req.body;
//     const sellerId = req.seller._id; // Assuming seller is authenticated

//     // Validate status
//     const validStatuses = ["pending", "shipped", "delivered", "canceled"];
//     if (!validStatuses.includes(status)) {
//       throw new ApiError(400, "Invalid status.");
//     }

//     // Find the order and the specific sub-order for the seller
//     const order = await Order.findOne({
//       _id: orderId,
//       "subOrders.seller": sellerId,
//     }).populate("orderBy", "email"); // Populate buyer details

//     if (!order) {
//       throw new ApiError(404, "Order not found.");
//     }

//     // Update the status of the sub-order
//     order.subOrders = order.subOrders.map((subOrder) => {
//       if (subOrder.seller.toString() === sellerId.toString()) {
//         subOrder.status = status;
//       }
//       return subOrder;
//     });

//     // Recalculate the overall order status
//     order.orderStatus = calculateOverallStatus(order.subOrders);

//     await order.save();

//     // Notify the buyer about the status update
//     await sendEmail(
//       process.env.SMTP_GMAIL_USER,
//       order.orderBy.email,
//       "Order Status Updated",
//       `Your order (ID: ${order._id}) status has been updated to: ${status}.`
//     );

//     // Notify the seller about the status update
//     await sendEmail(
//       process.env.SMTP_GMAIL_USER,
//       req.seller.email, // Assuming seller email is available in req.seller
//       "Order Status Updated",
//       `The status of order (ID: ${order._id}) has been updated to: ${status}.`
//     );

//     return res
//       .status(200)
//       .json(new ApiResponse(order, "Order status updated successfully."));
//   } catch (error) {
//     next(error);
//   }
// };

// const fetchSellerOrders = async (req, res, next) => {
//   try {
//     const sellerId = req.seller._id; // Assuming seller is authenticated

//     // Find all orders where the seller has sub-orders

//     // need enhancement ........
//     const orders = await Order.find({ "subOrders.seller": sellerId })
//       .populate("orderBy", "name email") // Populate buyer details
//       .populate("subOrders.orderItems.product", "name price variant") // Populate product details
//       .exec();

//     if (!orders || orders.length === 0) {
//       throw new ApiError(200, "No orders found for this seller");
//     }

//     return res
//       .status(200)
//       .json(new ApiResponse(orders, "Orders fetched successfully."));
//   } catch (error) {
//     next(error);
//   }
// };

// // Helper function to calculate overall order status
// // nned to be enhanced
// const calculateOverallStatus = (subOrders) => {
//   if (subOrders.every((subOrder) => subOrder.status === "delivered")) {
//     return "delivered";
//   } else if (subOrders.some((subOrder) => subOrder.status === "shipped")) {
//     return "partially shipped";
//   } else if (subOrders.some((subOrder) => subOrder.status === "canceled")) {
//     return "canceled";
//   } else {
//     return "pending";
//   }
// };

// const getOrderDetails = async (req, res, next) => {
//   try {
//     const { orderId } = req.params;
//     const sellerId = req.seller._id; // Assuming seller is authenticated

//     // Find the order and the specific sub-order for the seller
//     const order = await Order.findOne({
//       _id: orderId,
//       "subOrders.seller": sellerId,
//     })
//       .populate("orderBy", "name email") // Populate buyer details
//       .populate({
//         path: "subOrders.orderItems.product",
//         select: "name variants", // Populate product details with variants
//       })
//       .exec();

//     if (!order) {
//       throw new ApiError("Order not found.");
//     }

//     // Filter sub-orders to only include the seller's sub-order
//     const sellerSubOrder = order.subOrders.find(
//       (subOrder) => subOrder.seller.toString() === sellerId.toString()
//     );

//     return res.status(200).json(
//       new ApiResponse(
//         {
//           data: {
//             ...order.toObject(),
//             subOrders: [sellerSubOrder], // Only include the seller's sub-order
//           },
//         },
//         "Order details fetched successfully."
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// };

export {
  newOrder,
  getOrderDetails,
  updateOrderStatus,
  fetchSellerOrders,
  // myOrders,
  // allOrders,
};
