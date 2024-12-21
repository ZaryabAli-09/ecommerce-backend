import { Order } from "../models/order.model.js";

async function newOrder(req, res, next) {
  try {
    const userId = req.buyer._id;

    const { orderItems, totalAmount, paymentMethod, shippingAddress } =
      req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "Order items cannot be empty" });
    }
    if (!totalAmount) {
      return res.status(400).json({ message: "Total amount is required" });
    }
    if (!paymentMethod) {
      return res.status(400).json({ message: "Payment method is required" });
    }
    if (!shippingAddress) {
      return res.status(400).json({ message: "Shipping address is required" });
    }

    const { street, city, state, country, postalCode } = shippingAddress;

    if (!street || !city || !state || !postalCode || !country) {
      return res.status(400).json({
        message: "Please complete shipping adresss",
      });
    }

    const newOrder = new Order({
      orderBy: userId,
      orderItems,
      totalAmount,
      paymentMethod,
      shippingAddress,
    });

    const order = await newOrder.save();

    return res.status(200).json({
      message: "Order placed successfully",
      order: order,
    });
  } catch (error) {
    next(error);
  }
}
async function myOrders(req, res, next) {
  try {
    const orders = await Order.find({ orderBy: req.buyer._id })
      .populate("orderItems.product", "name price images")
      .populate("orderBy", "email name");

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    return res.status(200).json({
      message: "Your orders retrieved successfully",
      orders,
    });
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
      return res.status(404).json({
        message: "No orders found",
      });
    }

    return res.status(200).json({
      message: "All orders retrieved successfully",
      orders,
    });
  } catch (error) {
    next(error);
  }
}

async function getSingleOrder(req, res, next) {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId })
      .populate("orderItems.product", "name price images")
      .populate("orderBy", "email name");

    if (!order || order.length <= 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({
      message: "Order retrieved successfully",
      order,
    });
  } catch (error) {
    next(error);
  }
}

async function updateOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["pending", "shipped", "delivered", "canceled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { orderStatus: status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteOrder(req, res, next) {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(404).json({
        message: "OrderId not found",
      });
    }
    const deletedOrder = await Order.findByIdAndDelete(orderId);

    res.status(200).json({
      message: "Order deleted successfully",
      order: deletedOrder,
    });
  } catch (error) {
    next(error);
  }
}

export {
  newOrder,
  myOrders,
  allOrders,
  getSingleOrder,
  updateOrder,
  deleteOrder,
};
