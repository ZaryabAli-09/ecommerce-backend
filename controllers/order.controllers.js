import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
async function newOrder(req, res, next) {
  try {
    const userId = req.buyer._id;

    const { orderItems, totalAmount, paymentMethod, shippingAddress } =
      req.body;

    if (!orderItems || orderItems.length === 0) {
      throw new ApiError(400, "Order items cannot be empty.");
    }
    if (!totalAmount) {
      throw new ApiError(400, "Total amount is required.");
    }
    if (!paymentMethod) {
      throw new ApiError(400, "Payment method is required.");
    }
    if (!shippingAddress) {
      throw new ApiError(400, "Shipping address is required.");
    }

    const { street, city, state, country, postalCode } = shippingAddress;

    if (!street || !city || !state || !postalCode || !country) {
      throw new ApiError(400, "Please complete shipping adresss.");
    }

    // Populate the product field for each order item
    const populatedOrderItems = await Promise.all(
      orderItems.map(async (item) => {
        const product = await Product.findById(item.product)
          .select("price seller variants")
          .exec();

        // Check if product exists
        if (!product) {
          throw new Error(`Product not found: ${item.product}`);
        }

        // Find the selected variant
        const selectedVariant = product.variants.find(
          (variant) => variant._id.toString() === item.variantId
        );

        // Check if variant exists and has a valid price
        if (!selectedVariant) {
          throw new Error(`Variant not found: ${item.variantId}`);
        }
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
            price: selectedVariant.discountedPrice || selectedVariant.price, // Use the price from the selected variant if discounted price is not null then discounted price will be pick else general price
            seller: product.seller,
          },
        };
      })
    );

    //  Group items by seller
    const itemsBySeller = populatedOrderItems.reduce((acc, item) => {
      const sellerId = item.product.seller; // Access seller from populated product
      if (!acc[sellerId]) {
        acc[sellerId] = [];
      }
      acc[sellerId].push(item);
      return acc;
    }, {});

    // Create subOrders for each seller
    const subOrders = Object.keys(itemsBySeller).map((sellerId) => {
      const sellerItems = itemsBySeller[sellerId];

      // Calculate subOrderTotal
      const subOrderTotal = sellerItems.reduce((sum, item) => {
        // If discountedPrice is not null then the total will be sum of discounted price else general price
        const itemTotal =
          item.product.discountedPrice || item.product.price * item.quantity;
        if (isNaN(itemTotal)) {
          throw new Error(
            `Invalid calculation for product: ${item.product._id}. Price: ${
              item.product.discountedPrice || item.product.price
            }, Quantity: ${item.quantity}`
          );
        }
        return sum + itemTotal;
      }, 0);

      return {
        seller: sellerId,
        orderItems: sellerItems,
        totalAmount: subOrderTotal,
        status: "pending",
      };
    });

    // Step 4: Create the order
    const newOrder = new Order({
      orderBy: userId,
      subOrders,
      totalAmount,
      paymentMethod,
      shippingAddress,
    });

    const order = await newOrder.save();

    return res
      .status(200)
      .json(new ApiResponse(order, "Order placed successfully."));
  } catch (error) {
    next(error);
  }
}

const fetchSellerOrders = async (req, res, next) => {
  try {
    const sellerId = req.seller._id; // Assuming seller is authenticated

    // Find all orders where the seller has sub-orders

    // need enhancement ........
    const orders = await Order.find({ "subOrders.seller": sellerId })
      .populate("orderBy", "name email") // Populate buyer details
      .populate("subOrders.orderItems.product", "name price") // Populate product details
      .populate("subOrders.orderItems.product.variant") // Populate product details
      .exec();

    if (!orders || orders.length === 0) {
      throw new ApiError(200, "No orders found for this seller");
    }

    return res
      .status(200)
      .json(new ApiResponse(orders, "Orders fetched successfully."));
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const sellerId = req.seller._id; // Assuming seller is authenticated

    // Validate status
    const validStatuses = ["pending", "shipped", "delivered", "canceled"];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, "Invalid status.");
    }

    // Find the order and the specific sub-order for the seller
    const order = await Order.findOne({
      _id: orderId,
      "subOrders.seller": sellerId,
    });

    if (!order) {
      throw new ApiError(404, "Order not found.");
    }

    // Update the status of the sub-order
    order.subOrders = order.subOrders.map((subOrder) => {
      if (subOrder.seller.toString() === sellerId.toString()) {
        subOrder.status = status;
      }
      return subOrder;
    });

    // Recalculate the overall order status
    order.orderStatus = calculateOverallStatus(order.subOrders);

    await order.save();

    return res
      .status(200)
      .json(new ApiResponse(order, "Order status updated successfully."));
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate overall order status
const calculateOverallStatus = (subOrders) => {
  if (subOrders.every((subOrder) => subOrder.status === "delivered")) {
    return "delivered";
  } else if (subOrders.some((subOrder) => subOrder.status === "shipped")) {
    return "partially shipped";
  } else if (subOrders.some((subOrder) => subOrder.status === "canceled")) {
    return "canceled";
  } else {
    return "pending";
  }
};

const getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller._id; // Assuming seller is authenticated

    // Find the order and the specific sub-order for the seller
    const order = await Order.findOne({
      _id: orderId,
      "subOrders.seller": sellerId,
    })
      .populate("orderBy", "name email") // Populate buyer details
      .populate({
        path: "subOrders.orderItems.product",
        select: "name variants", // Populate product details with variants
      })
      .exec();

    if (!order) {
      throw new ApiError("Order not found.");
    }

    // Filter sub-orders to only include the seller's sub-order
    const sellerSubOrder = order.subOrders.find(
      (subOrder) => subOrder.seller.toString() === sellerId.toString()
    );

    return res.status(200).json(
      new ApiResponse(
        {
          data: {
            ...order.toObject(),
            subOrders: [sellerSubOrder], // Only include the seller's sub-order
          },
        },
        "Order details fetched successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};

// need to updated

async function myOrders(req, res, next) {
  try {
    const orders = await Order.find({ orderBy: req.buyer._id })
      .populate("orderItems.product", "name price images")
      .populate("orderBy", "email name");

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found." });
    }

    return res
      .status(200)
      .json(new ApiResponse(orders, "Your orders retrieved successfully."));
  } catch (error) {
    next(error);
  }
}

async function allOrders(req, res, next) {
  try {
    const orders = await Order.find()
      .populate("orderBy", "email name") // Fetch user email for reference
      .populate("orderItems.product", "name price images"); // Fetch product name and price

    if (orders.length <= 0) {
      throw new ApiError(404, "No orders found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(orders, "All orders retrieved successfully."));
  } catch (error) {
    next(error);
  }
}

export {
  newOrder,
  getOrderDetails,
  updateOrderStatus,
  fetchSellerOrders,
  myOrders,
  allOrders,
};
