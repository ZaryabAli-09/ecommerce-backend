import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import bcryptjs from "bcryptjs";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";

async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required.");
    }

    // Find the admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      throw new ApiError(401, "Invalid credentials.");
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid credentials.");
    }

    // Generate JWT token for admi

    const access_token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.ADMIN_ACCESS_TOKEN_SECRET_KEY, // Ensure this is defined in your environment variables
      { expiresIn: "30d" }
    );

    res
      .status(200)
      .cookie("access_token", access_token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      })
      .json(new ApiResponse(admin, "Admin Logged In successfully."));
  } catch (error) {
    next(error);
  }
}
async function adminLogout(req, res, next) {
  try {
    res
      .clearCookie("access_token", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      })
      .status(200)
      .json(new ApiResponse(null, "Admin Logged out successfully."));
  } catch (error) {
    next(error);
  }
}

async function adminUpdateCredentials(req, res, next) {
  try {
    const adminId = req.admin._id;
    const { email, password } = req.body;

    if (!adminId) {
      throw new ApiError(401, "Unauthorized access.");
    }

    console.log(email, password);
    const updates = {};
    if (email) updates.email = email;
    if (password) updates.password = bcryptjs.hashSync(password, 12);

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { $set: updates },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(updatedAdmin, "Credentials updated successfully."));
  } catch (error) {
    next(error);
  }
}

// Add new admin
const addAdmin = async (req, res, next) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new ApiError(401, "Unauthorized access.");
    }
    if (admin.title !== "superadmin") {
      throw new ApiError(
        403,
        "You are not authorized to perform this action. only superadmin can add new admin."
      );
    }
    const { email, password } = req.body;
    console.log(email, password);
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      throw new ApiError(400, "Admin with this email already exists");
    }

    // Create new admin
    const newAdmin = await Admin.create({ email, password });

    // Return without password
    const adminData = await Admin.findById(newAdmin._id).select("-password");

    return res
      .status(201)
      .json(new ApiResponse(adminData, "Admin created successfully"));
  } catch (error) {
    next(error);
  }
};

// Get all admins
const getAllAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find().select("-password");
    return res
      .status(200)
      .json(new ApiResponse(admins, "Admins retrieved successfully"));
  } catch (error) {
    next(error);
  }
};

// app insight controller for admin
const AppDashboardInformation = async (req, res) => {
  try {
    // Fetch products and orders for the seller
    const products = await Product.find().populate("categories", "name"); // Populate 'categories' and select only 'name'

    const orders = await Order.find().populate("orderBy", "name email"); // Populate buyer details

    // Calculate total sales by summing up the totalAmount of all orders
    const totalSales = orders.reduce(
      (total, order) => total + order.totalAmount,
      0
    );

    // Calculate total number of customers (unique customers who placed orders)
    const uniqueCustomers = new Set(
      orders.map((order) => order.orderBy._id.toString())
    );
    const totalSellerCustomers = uniqueCustomers.size;

    // Calculate number of products and orders
    const totalOrders = orders.length;
    const totalProducts = products.length;

    // Extract data for charts
    const salesDataArray = extractSalesData(orders);
    const productDataArray = extractProductData(orders, products);
    const orderStatusDataArray = extractOrderStatusData(orders);
    const userActivityDataArray = extractUserActivityData(orders);
    const productCategoryDataArray = extractProductCategoryData(
      orders,
      products
    );
    const totalSellerProductCategories =
      extractTotalSellerProductCategoryData(products);

    res.json({
      totalProducts,
      totalOrders,
      totalSellerCustomers,
      totalSales,
      salesDataArray,
      productDataArray,
      orderStatusDataArray,
      userActivityDataArray,
      productCategoryDataArray,
      totalSellerProductCategories,
      orders, // Return orders directly (no suborders)
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//Helper functions for data extraction
const extractSalesData = (orders) => {
  const salesData = orders.reduce((acc, order) => {
    const month = new Date(order.createdAt).toLocaleString("default", {
      month: "short",
    });
    acc[month] = (acc[month] || 0) + order.totalAmount;
    return acc;
  }, {});
  return Object.keys(salesData).map((month) => ({
    name: month,
    sales: salesData[month],
  }));
};

const extractProductData = (orders, products) => {
  const productSales = orders.reduce((acc, order) => {
    order.orderItems.forEach((item) => {
      const product = products.find(
        (p) => p._id.toString() === item.product.toString()
      );
      if (product) {
        acc[product.name] = (acc[product.name] || 0) + item.quantity;
      }
    });
    return acc;
  }, {});
  return Object.keys(productSales).map((productName) => ({
    name: productName,
    sales: productSales[productName],
  }));
};
const extractOrderStatusData = (orders) => {
  const orderStatusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  return Object.keys(orderStatusCounts).map((status) => ({
    name: status,
    value: orderStatusCounts[status],
  }));
};
const extractUserActivityData = (orders) => {
  const userActivityData = orders.reduce((acc, order) => {
    const month = new Date(order.createdAt).toLocaleString("default", {
      month: "short",
    });
    acc[month] = acc[month] || new Set();
    acc[month].add(order.orderBy._id.toString());
    return acc;
  }, {});
  return Object.keys(userActivityData).map((month) => ({
    name: month,
    activeUsers: userActivityData[month].size,
  }));
};

const extractTotalSellerProductCategoryData = (sellerProducts) => {
  const categorySales = sellerProducts.reduce((acc, product) => {
    const mergedCategory = product.categories
      .map((c) => c.name) // Extract category names
      .join(" > "); // Join with " > " separator
    acc[mergedCategory] = (acc[mergedCategory] || 0) + 1; // Count each product in the category
    return acc;
  }, {});

  return Object.keys(categorySales).map((category) => ({
    name: category,
    value: categorySales[category],
  }));
};

const extractProductCategoryData = (orders, products) => {
  const categorySales = orders.reduce((acc, order) => {
    order.orderItems.forEach((item) => {
      const product = products.find(
        (p) => p._id.toString() === item.product.toString()
      );
      if (product) {
        const mergedCategory = product.categories
          .map((c) => c.name) // Extract category names
          .join(" > "); // Join with " > " separator
        acc[mergedCategory] = (acc[mergedCategory] || 0) + item.quantity;
      }
    });
    return acc;
  }, {});

  return Object.keys(categorySales).map((category) => ({
    name: category,
    value: categorySales[category],
  }));
};

async function getSingleAdmin(req, res, next) {
  try {
    const adminId = req.admin;
    if (!adminId) {
      throw new ApiError(401, "Unauthorized request.");
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new ApiError(401, "Unauthorized request.");
    }
    res.status(200).json(new ApiResponse(admin, "Admin get successfully."));
  } catch (error) {
    next(error);
  }
}
export {
  adminLogin,
  adminLogout,
  adminUpdateCredentials,
  getAllAdmins,
  addAdmin,
  getSingleAdmin,
};
