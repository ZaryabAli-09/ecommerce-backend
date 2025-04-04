import { Seller } from "../models/seller.model.js";
import bcryptjs from "bcryptjs";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import fs from "fs";
import { uploadSingleImageToCloudinary } from "../config/cloudinary.config.js";
import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from "url";
import path from "path";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";

// Get the directory name from the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getAllSellers(req, res, next) {
  try {
    const sellers = await Seller.find();

    if (!sellers || sellers.length === 0) {
      throw new ApiError(404, "No sellers found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(sellers, "All sellers retrieved successfully."));
  } catch (error) {
    next(error);
  }
}

async function getSingleSeller(req, res, next) {
  try {
    const { sellerId } = req.params;

    if (!sellerId) throw new ApiError(404, "Seller id not found.");

    const seller = await Seller.findById(sellerId);

    if (!seller) {
      throw new ApiError(404, "No seller found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(seller, "Single seller retrieved successfully."));
  } catch (error) {
    next(error);
  }
}

async function updateSeller(req, res, next) {
  try {
    const { sellerId } = req.params;
    const {
      password,
      contactNumber,
      brandName,
      brandDescription,
      businessAddress,
      socialLinks,
      bankDetails,
    } = req.body;

    // Update fields only if they are provided
    const updates = {};
    if (password) {
      const hashedPassword = await bcryptjs.hash(password, 12);
      updates.password = hashedPassword;
    }
    if (contactNumber) updates.contactNumber = contactNumber;
    if (brandName) updates.brandName = brandName;
    if (brandDescription) updates.brandDescription = brandDescription;
    if (businessAddress) updates.businessAddress = businessAddress;

    // Validate and update socialLinks object fields if provided
    if (socialLinks) {
      updates.socialLinks = {};
      if (socialLinks.instagram)
        updates.socialLinks.instagram = socialLinks.instagram;
      if (socialLinks.facebook)
        updates.socialLinks.facebook = socialLinks.facebook;
      if (socialLinks.twitter)
        updates.socialLinks.twitter = socialLinks.twitter;
      if (socialLinks.linkedin)
        updates.socialLinks.linkedin = socialLinks.linkedin;
    }

    // Validate and update bankDetails object fields if provided
    if (bankDetails) {
      updates.bankDetails = {};
      if (bankDetails.bankName)
        updates.bankDetails.bankName = bankDetails.bankName;
      if (bankDetails.accountNumber)
        updates.bankDetails.accountNumber = bankDetails.accountNumber;
      if (bankDetails.accountHolderName)
        updates.bankDetails.accountHolderName = bankDetails.accountHolderName;
    }

    const updatedSeller = await Seller.findByIdAndUpdate(
      sellerId,
      {
        $set: updates,
      },
      { new: true }
    );

    if (!updatedSeller) {
      throw new ApiError(404, "Seller not found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(updatedSeller, "Seller updated successfully."));
  } catch (error) {
    next(error);
  }
}

async function deleteSeller(req, res, next) {
  try {
    const { sellerId } = req.params;

    if (!sellerId) {
      throw new ApiError(400, "Seller ID is required.");
    }

    // Fetch seller first
    const sellerToBeDeleted = await Seller.findById(sellerId);
    if (!sellerToBeDeleted) {
      throw new ApiError(404, "Seller not found.");
    }

    const coverImagePublicId = sellerToBeDeleted?.coverImage?.public_id;
    const deleteCoverImage = await cloudinary.uploader.destroy(
      coverImagePublicId
    );
    if (!deleteCoverImage) {
      throw new ApiError(
        400,
        "Failed to delete cover image of seller. Please try again later."
      );
    }

    // Helper function to delete images from Cloudinary
    const deleteImage = async (publicId) => {
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    };

    // Delete cover image & logo if they exist
    await deleteImage(sellerToBeDeleted?.coverImage?.public_id);
    await deleteImage(sellerToBeDeleted?.logo?.public_id);

    // delete seller from DB
    await Seller.findByIdAndDelete(sellerId);

    return res
      .status(200)
      .json(
        new ApiResponse(
          null,
          `Seller ${sellerToBeDeleted.brandName} is successfully deleted.`
        )
      );
  } catch (error) {
    next(error);
  }
}

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, "No file uploaded");

    // Upload to Cloudinary
    const uploadResult = await uploadSingleImageToCloudinary(req.file.path);
    if (!uploadResult) throw new ApiError(500, "Image upload failed");

    // Delete old image from Cloudinary if exists
    if (req.body.oldPublicId) {
      const deleteResult = await cloudinary.uploader.destroy(
        req.body.oldPublicId
      );

      if (deleteResult.result !== "ok") {
        throw new ApiError(500, "Failed to delete old image.");
      }
    }

    // Update seller
    const updatedSeller = await Seller.findByIdAndUpdate(
      req.seller._id,
      {
        [req.imageType]: {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        },
      },
      { new: true }
    );

    if (!updatedSeller) throw new ApiError(404, "Seller not found");

    res
      .status(200)
      .json(
        new ApiResponse(
          updatedSeller[req.imageType],
          `${req.imageType} updated successfully`
        )
      );
  } catch (error) {
    // Cleanup: Delete the local file if error occurs
    if (req.file?.filename) {
      const filePath = path.join(__dirname, "../public", req.file.filename);
      fs.unlink(filePath, (err) => {
        if (err)
          console.error(`Failed to delete Seller image: ${filePath}, err`);
      });
    }
    next(error);
  }
};

const sellerDashboardInformation = async (req, res) => {
  try {
    const sellerId = req.params.sellerId;

    // Fetch products and orders for the seller
    const products = await Product.find({ seller: sellerId }).populate(
      "categories",
      "name"
    ); // Populate 'categories' and select only 'name'

    const orders = await Order.find({ seller: sellerId }).populate(
      "orderBy",
      "name email"
    ); // Populate buyer details

    // Calculate total sales by summing up the totalAmount of all orders
    const totalSellerSales = orders.reduce(
      (total, order) => total + order.totalAmount,
      0
    );

    // Calculate total number of customers (unique customers who placed orders)
    const uniqueCustomers = new Set(
      orders.map((order) => order.orderBy._id.toString())
    );
    const totalSellerCustomers = uniqueCustomers.size;

    // Calculate number of products and orders
    const totalSellerOrders = orders.length;
    const totalSellerProduct = products.length;

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
      totalSellerProduct,
      totalSellerOrders,
      totalSellerCustomers,
      totalSellerSales,
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
export {
  sellerDashboardInformation,
  getAllSellers,
  getSingleSeller,
  updateSeller,
  deleteSeller,
  uploadImage,
};
