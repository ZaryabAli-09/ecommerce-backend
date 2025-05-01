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
      .cookie("admin_access_token", access_token, {
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
      .clearCookie("admin_access_token", {
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

const AppDashboardInformation = async (req, res) => {
  try {
    // Fetch all products and orders (excluding canceled orders)
    const products = await Product.find()
      .populate("categories", "name")
      .populate("seller", "brandName");
    const orders = await Order.find({ status: { $ne: "canceled" } }).populate(
      "orderBy",
      "name email"
    );

    // 1. Product distribution by category
    const productDistributionByCategory =
      getProductDistributionByCategory(products);

    // 2. Product sales data by category (excluding canceled orders)
    const productSalesByCategory = getProductSalesByCategory(orders, products);

    // 3. Revenue/sales data (excluding canceled orders)
    const revenueData = getRevenueData(orders);

    // 4. Buying customers data
    const customerData = getCustomerData(orders);

    // 5. Order status data (including canceled for completeness, but filtered out elsewhere)
    const orderStatusData = getOrderStatusData(await Order.find());

    // 6. Top selling products (from product.sold field)
    const topSellingProducts = getTopSellingProducts(products);

    // 7. Totals (excluding canceled orders)
    const totals = {
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      totalCustomers: new Set(
        orders.map((order) => order.orderBy._id.toString())
      ).size,
    };

    const customerAcquisition = getCustomerAcquisitionData(orders);

    res.json({
      // Core metrics
      ...totals,

      // Detailed data
      productDistributionByCategory,
      productSalesByCategory,
      revenueData,
      customerData,
      orderStatusData,
      topSellingProducts,
      customerAcquisition,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper Functions
// 1. Product distribution by category
function getProductDistributionByCategory(products) {
  const categorySales = products.reduce((acc, product) => {
    const mergedCategory = product.categories
      ? product.categories.map((c) => c.name).join(" > ")
      : "Uncategorized";
    acc[mergedCategory] = (acc[mergedCategory] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(categorySales).map(([category, productCount]) => ({
    category,
    productCount,
  }));
}

function getProductSalesByCategory(orders, products) {
  const categoryCounts = {};

  // Create a product map with categories
  const productMap = products.reduce((map, product) => {
    map[product._id.toString()] = {
      categories: product.categories || [],
      variants: (product.variants || []).map((v) => ({
        ...v,
        _id: v._id.toString(),
      })),
    };
    return map;
  }, {});

  orders.forEach((order) => {
    order.orderItems.forEach((item) => {
      const product = productMap[item.product];
      if (product) {
        // Get category path or default to "Uncategorized"
        const categoryPath = product.categories.length
          ? product.categories.map((c) => c.name).join(" > ")
          : "Uncategorized";

        // Add the quantity sold to this category
        categoryCounts[categoryPath] =
          (categoryCounts[categoryPath] || 0) + (item.quantity || 0);
      }
    });
  });

  // Convert to array with name and value (count)
  return Object.entries(categoryCounts).map(([name, value]) => ({
    name,
    value,
  }));
}
// 3. Revenue data
function getRevenueData(orders) {
  const monthlyRevenue = {};
  const dailyRevenue = {};

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const month = date.toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
    const day = date.toLocaleString("default", {
      day: "numeric",
      month: "short",
    });

    // Monthly
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + order.totalAmount;

    // Daily
    dailyRevenue[day] = (dailyRevenue[day] || 0) + order.totalAmount;
  });

  return {
    monthly: Object.entries(monthlyRevenue).map(([period, amount]) => ({
      period,
      amount,
    })),
    daily: Object.entries(dailyRevenue).map(([period, amount]) => ({
      period,
      amount,
    })),
  };
}

// 4. Customer data
function getCustomerData(orders) {
  const customers = {};
  const customerOrders = {};
  const firstPurchaseDates = {};
  const lastPurchaseDates = {};

  orders.forEach((order) => {
    const customerId = order.orderBy._id.toString();
    const customerEmail = order.orderBy.email;

    // Track order count
    customerOrders[customerId] = (customerOrders[customerId] || 0) + 1;

    // Track first and last purchase dates
    const orderDate = new Date(order.createdAt);
    if (
      !firstPurchaseDates[customerId] ||
      orderDate < new Date(firstPurchaseDates[customerId])
    ) {
      firstPurchaseDates[customerId] = order.createdAt;
    }
    if (
      !lastPurchaseDates[customerId] ||
      orderDate > new Date(lastPurchaseDates[customerId])
    ) {
      lastPurchaseDates[customerId] = order.createdAt;
    }

    // Track customer details
    if (!customers[customerId]) {
      customers[customerId] = {
        id: customerId,
        name: order.orderBy.name,
        email: customerEmail,
        totalSpent: 0,
        orderCount: 0,
      };
    }
    customers[customerId].totalSpent += order.totalAmount;
    customers[customerId].orderCount = customerOrders[customerId];
  });

  // Add first/last purchase dates to customer data
  Object.keys(customers).forEach((customerId) => {
    customers[customerId].firstPurchase = firstPurchaseDates[customerId];
    customers[customerId].lastPurchase = lastPurchaseDates[customerId];
  });

  return {
    totalCustomers: Object.keys(customers).length,
    repeatCustomers: Object.values(customerOrders).filter((count) => count > 1)
      .length,
    customerLifetimeValue:
      Object.values(customers).reduce(
        (sum, customer) => sum + customer.totalSpent,
        0
      ) / Object.keys(customers).length,
    customerDetails: Object.values(customers),
  };
}

// 5. Order status data
function getOrderStatusData(orders) {
  const statusCounts = {};

  orders.forEach((order) => {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  });

  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    percentage: ((count / orders.length) * 100).toFixed(2) + "%",
  }));
}
function getCustomerAcquisitionData(orders) {
  const acquisitionData = {};

  orders.forEach((order) => {
    const month = new Date(order.createdAt).toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
    acquisitionData[month] = acquisitionData[month] || new Set();
    acquisitionData[month].add(order.orderBy._id.toString());
  });

  return Object.entries(acquisitionData).map(([month, customerSet]) => ({
    month,
    newCustomers: customerSet.size,
  }));
}
// 6. Top selling products
function getTopSellingProducts(products) {
  return products
    .filter((product) => product.sold > 0)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 20) // Top 20
    .map((product) => ({
      id: product._id,
      name: product.name,
      sold: product.sold,
      brand: product.seller?.brandName,
      image: product.variants[0]?.images[0]?.url || [], // Assuming images are in the first variant
      revenue: product.sold * (product.variants?.[0]?.price || 0), // Approximate revenue
    }));
}

export {
  adminLogin,
  adminLogout,
  adminUpdateCredentials,
  getAllAdmins,
  addAdmin,
  getSingleAdmin,
  AppDashboardInformation,
};
