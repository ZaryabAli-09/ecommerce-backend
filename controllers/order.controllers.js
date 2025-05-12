import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import sendEmail from "../utils/sendEmail.js";
import { Seller } from "../models/seller.model.js";
import mongoose from "mongoose";
import sendEmailHtml from "../utils/sendEmailHtml.js";

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

    // First check stock availability for all items
    await Promise.all(
      orderItems.map(async (item) => {
        const product = await Product.findOne({
          _id: item.product,
          "variants._id": item.variantId,
        });

        if (!product) {
          throw new ApiError(404, `Product not found: ${item.product}`);
        }

        const variant = product.variants.find(
          (v) => v._id.toString() === item.variantId
        );

        if (!variant) {
          throw new ApiError(404, `Variant not found: ${item.variantId}`);
        }

        if (variant.stock < item.quantity) {
          throw new ApiError(
            400,
            `Not enough stock for ${product.name}` +
              `   Available: ${variant.stock}, Requested: ${item.quantity}`
          );
        }
      })
    );

    // Create the order
    const order = await Order.create({
      orderBy: userId, // Renamed from `buyer` to `orderBy`
      seller: sellerId,
      orderItems: populatedOrderItems, // Renamed from `items` to `orderItems`
      totalAmount,
      paymentMethod,
      shippingAddress,
    });

    // Update product-level sold count AND variant-level stock
    await Promise.all(
      orderItems.map(async (item) => {
        await Product.updateOne(
          {
            _id: item.product,
            "variants._id": item.variantId,
          },
          {
            $inc: {
              sold: item.quantity, // Product-level sold count
              "variants.$.stock": -item.quantity, // Variant-level stock
              countInStock: -item.quantity, // Product-level stock (optional)
            },
          }
        );
      })
    );

    // Notify the seller
    const seller = await Seller.findById(sellerId).select("email").exec();

    const emailTemplate = `
    <div style="font-family: Arial, sans-serif;   max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h1 style="color: #2d3748;">${process.env.PLATFORM_NAME}</h1>
      <h2 style="color: #4a5568;">Order Information</h2>
      <p style="color: #4a5568;">You have received a new order.</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Order ID:</strong>  ${order._id}</p>
        <p style="margin: 5px 0;"><strong>Total Amount:</strong>  ${
          order.totalAmount
        }</p>
        <p style="margin: 5px 0;"><strong>Payment Method:</strong>  ${
          order.paymentMethod
        }</p>
        <p style="margin: 5px 0;"><strong>Custmer Email:</strong>  ${
          req.buyer?.email
        }</p>
        <p style="margin: 5px 0;"><strong>Shipping Address:</strong></p>
        <p style="margin: 5px 0;">${shippingAddress.street}</p>
        <p style="margin: 5px 0;">${shippingAddress.city}, ${
      shippingAddress.state
    }</p>
        <p style="margin: 5px 0;">${shippingAddress.postalCode}</p>
        <p style="margin: 5px 0;">${shippingAddress.country}</p>
        <p style="margin: 5px 0;"><strong>Order Items:</strong></p>
        <ul style="list-style-type: none; padding: 0;">
          ${populatedOrderItems
            .map(
              (item) =>
                `<li style="margin: 5px 0;">${item.product.name} - ${item.quantity} pcs</li>`
            )
            .join("")}
        </ul>
      </div>  
      
    </div>
  `;

    const CustomerEmailTemplate = `
  <div style="font-family: Arial, sans-serif;   max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <h1 style="color: #2d3748;">${process.env.PLATFORM_NAME}</h1>
    <h2 style="color: #4a5568;">Order Information</h2>
    <p style="color: #4a5568;">Your order has been placed successfully.</p>
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Order ID:</strong>  ${order._id}</p>
      <p style="margin: 5px 0;"><strong>Total Amount:</strong>  ${
        order.totalAmount
      }</p>
      <p style="margin: 5px 0;"><strong>Payment Method:</strong>  ${
        order.paymentMethod
      }</p>
      <p style="margin: 5px 0;"><strong>Shipping Address:</strong></p>
      <p style="margin: 5px 0;">${shippingAddress.street}</p>
      <p style="margin: 5px 0;">${shippingAddress.city}, ${
      shippingAddress.state
    }</p>
      <p style="margin: 5px 0;">${shippingAddress.postalCode}</p>
      <p style="margin: 5px 0;">${shippingAddress.country}</p>
      <p style="margin: 5px 0;"><strong>Order Items:</strong></p>
      <ul style="list-style-type: none; padding: 0;">
        ${populatedOrderItems
          .map(
            (item) =>
              `<li style="margin: 5px 0;">${item.product.name} - ${item.quantity} pcs</li>`
          )
          .join("")}
      </ul>
    </div>  
    
  </div>
`;
    if (seller) {
      await sendEmailHtml(
        process.env.SMTP_GMAIL_USER,
        seller.email,
        "New Order Received",
        emailTemplate
      );
    }

    // Notify the buyer
    await sendEmailHtml(
      process.env.SMTP_GMAIL_USER,
      req.buyer.email,
      "Order Placed Successfully",
      CustomerEmailTemplate
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate status
      const validStatuses = ["pending", "shipped", "delivered", "canceled"];
      if (!validStatuses.includes(status)) {
        throw new ApiError(400, "Invalid status.");
      }

      // Find and lock the order
      const order = await Order.findOne({
        _id: orderId,
      })
        .populate("orderBy", "email")
        .session(session);

      if (!order) {
        throw new ApiError(404, "Order not found.");
      }

      const previousStatus = order.status;

      // Only proceed if status actually changed
      if (previousStatus === status) {
        await session.abortTransaction();
        return res
          .status(200)
          .json(new ApiResponse(order, "Status unchanged."));
      }

      // Handle inventory adjustments
      if (status === "canceled") {
        // When canceling, revert stock and sales
        await Promise.all(
          order.orderItems.map(async (item) => {
            await Product.updateOne(
              {
                _id: item.product,
                "variants._id": item.variantId,
              },
              {
                $inc: {
                  sold: -item.quantity,
                  "variants.$.stock": item.quantity,
                  countInStock: item.quantity,
                },
              },
              { session }
            );
          })
        );
      } else if (previousStatus === "canceled") {
        // When reactivating from canceled, verify and deduct stock
        await Promise.all(
          order.orderItems.map(async (item) => {
            const product = await Product.findOne({
              _id: item.product,
              "variants._id": item.variantId,
            }).session(session);

            const variant = product?.variants?.find(
              (v) => v._id.toString() === item.variantId.toString()
            );

            if (!variant || variant.stock < item.quantity) {
              throw new ApiError(
                400,
                `Cannot reactivate order - insufficient stock for variant ${item.variantId}`
              );
            }

            await Product.updateOne(
              {
                _id: item.product,
                "variants._id": item.variantId,
              },
              {
                $inc: {
                  sold: item.quantity,
                  "variants.$.stock": -item.quantity,
                  countInStock: -item.quantity,
                },
              },
              { session }
            );
          })
        );
      }

      // Update order status
      order.status = status;

      await order.save({ session });

      // Commit transaction
      await session.commitTransaction();

      // Send notification
      const statusMessages = {
        pending: "is being processed",
        shipped: "has been shipped",
        delivered: "has been delivered",
        canceled: "has been canceled",
      };

      const OrderStatusTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #2d3748;">${process.env.PLATFORM_NAME}</h1>
        <h2 style="color: #4a5568;">Order Status Updated</h2>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order._id}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> 
            <span style="color: ${
              order.status === "Shipped"
                ? "#3182ce"
                : order.status === "Delivered"
                ? "#38a169"
                : order.status === "Cancelled"
                ? "#e53e3e"
                : "#4a5568"
            }; font-weight: bold;">
              ${order.status}
            </span>
          </p>
          
          ${
            order.status === "Shipped"
              ? `
            <p style="margin: 5px 0;"><strong>Tracking Number:</strong> ${order._id}</p>
          `
              : ""
          }
          
          ${
            order.status === "Cancelled"
              ? `
            <p style="margin: 10px 0; color: #e53e3e;">Your order has been cancelled.</p>
          `
              : ""
          }
        </div>
    
        <div style="margin-top: 20px;">
          <p style="color: #4a5568;">
            For any help or queries, contact us at: <br>
            <strong>Phone:</strong> 0009998888 <br>
            <strong>Email:</strong> khanzaryab249@gmail.com
          </p>
        </div>
      </div>
    `;
      await sendEmailHtml(
        process.env.SMTP_GMAIL_USER,
        order.orderBy.email,
        `Order ${status === "canceled" ? "Cancellation" : "Update"}`,
        OrderStatusTemplate
      );

      return res
        .status(200)
        .json(new ApiResponse(order, "Order status updated successfully."));
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};

const fetchSellerOrders = async (req, res, next) => {
  try {
    const sellerId = req.seller._id;
    const {
      page = 1,
      limit = 10,
      status,
      orderId,
      dateFilter, // "thisWeek", "thisMonth", "lastMonth"
    } = req.query;

    const query = { seller: sellerId };

    // Add filters to the query
    if (status) query.status = status;

    // Validate and filter by orderId
    if (orderId) {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(200).json(new ApiResponse([], "Invalid order ID."));
      }
      query._id = orderId;
    }

    // Date filtering logic
    if (dateFilter) {
      const currentDate = new Date();
      let startDate, endDate;

      switch (dateFilter) {
        case "thisWeek":
          startDate = new Date(
            currentDate.setDate(currentDate.getDate() - currentDate.getDay())
          );
          endDate = new Date(currentDate.setDate(currentDate.getDate() + 6));
          break;
        case "thisMonth":
          startDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
          );
          endDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0
          );
          break;
        case "lastMonth":
          startDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
          );
          endDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            0
          );
          break;
        default:
          break;
      }

      if (startDate && endDate) {
        query.createdAt = { $gte: startDate, $lte: endDate };
      }
    }

    // Get the total count of orders matching the query
    const total = await Order.countDocuments(query);

    // Pagination logic
    const skip = (page - 1) * limit;
    const orders = await Order.find(query)
      .populate("orderBy", "name email")
      .populate("orderItems.product", "name price variant")
      .skip(skip)
      .limit(Number(limit))
      .exec();

    if (!orders || orders.length === 0) {
      return res.status(200).json(new ApiResponse([], "No orders found."));
    }

    return res.status(200).json(
      new ApiResponse(
        {
          data: orders,
          total,
        },
        "Orders fetched successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};

const allOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, orderId, dateFilter } = req.query;
    const query = {};

    // Status filter
    if (status) query.status = status;

    // Order ID filter
    if (orderId) {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res
          .status(400)
          .json(new ApiResponse(null, "Invalid order ID format"));
      }
      query._id = new mongoose.Types.ObjectId(orderId);
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      let startDate, endDate;

      switch (dateFilter) {
        case "thisWeek":
          startDate = new Date(now.setDate(now.getDate() - now.getDay()));
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          break;
        case "thisMonth":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case "lastMonth":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
      }

      if (startDate && endDate) {
        query.createdAt = { $gte: startDate, $lte: endDate };
      }
    }

    // Default date range if no filters
    if (!status && !orderId && !dateFilter) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      query.createdAt = { $gte: oneYearAgo };
    }

    // Get total count and paginated results
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("orderBy", "name email")
      .populate("orderItems.product", "name price variant")
      .populate("seller", "brandName")
      .sort({ createdAt: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .exec();

    return res
      .status(200)
      .json(
        new ApiResponse({ data: orders, total }, "Orders fetched successfully")
      );
  } catch (error) {
    next(error);
  }
};
const getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Find the order and verify it belongs to the seller
    const order = await Order.findOne({
      _id: orderId,
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

export {
  newOrder,
  getOrderDetails,
  updateOrderStatus,
  fetchSellerOrders,
  allOrders,
  myOrders,
};
