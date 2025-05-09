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
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;
    const query = { status: { $ne: "pending" } }; // Exclude pending sellers
    if (search) {
      query.$or = [
        { brandName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const sellers = await Seller.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: "products",
        select: "name price sold images",
        options: { sort: { sold: -1 }, limit: 3 },
      });

    const totalSellers = await Seller.countDocuments(query);

    return res.status(200).json(
      new ApiResponse(
        {
          sellers,
          totalPages: Math.ceil(totalSellers / limit),
          currentPage: parseInt(page),
          totalSellers,
        },
        "Sellers retrieved successfully"
      )
    );
  } catch (error) {
    next(error);
  }
}

async function getAllSellersBasicInfo(req, res, next) {
  try {
    const sellers = await Seller.find({}).select(
      "brandName logo coverImage bussinessAddress brandDescription"
    );

    const totalSellers = await Seller.countDocuments({});

    return res.status(200).json(
      new ApiResponse(
        {
          sellers,
          totalSellers,
        },
        "Sellers retrieved successfully"
      )
    );
  } catch (error) {
    next(error);
  }
}

async function getSellerDetailsForAdminPanel(req, res, next) {
  try {
    const { sellerId } = req.params;

    // Get seller basic info
    const seller = await Seller.findById(sellerId).lean();
    if (!seller) {
      throw new ApiError(404, "Seller not found");
    }

    // Get products with proper image handling
    const products = await Product.find({ seller: sellerId })
      .select("name price sold images variants createdAt")
      .sort({ sold: -1, createdAt: -1 })
      .lean();

    // Process products to ensure proper image URLs
    const processedProducts = products.map((product) => {
      // Use first variant's image if no main product image exists
      const mainImage =
        product.images?.[0]?.url ||
        product.variants?.[0]?.images?.[0]?.url ||
        "/placeholder-product.jpg";

      return {
        ...product,
        displayImage: mainImage,
        variants: product.variants.map((variant) => ({
          ...variant,
          displayImage: variant.images?.[0]?.url || mainImage,
        })),
      };
    });

    // Get top 3 selling products
    const topProducts = processedProducts
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 3);

    // Get 3 most recent products
    const recentProducts = processedProducts
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    return res.status(200).json(
      new ApiResponse(
        {
          seller,
          topProducts,
          recentProducts,
          totalProducts: products.length,
        },
        "Seller details retrieved successfully"
      )
    );
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
    const sellerId = req.params.sellerId; // Get seller ID from the request
    if (!sellerId) {
      throw new ApiError(400, "Seller ID is required");
    }
    // Check if seller exists
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      throw new ApiError(404, "Seller not found");
    }

    // Fetch products and non-canceled orders for the seller
    const products = await Product.find({ seller: sellerId }).populate(
      "categories",
      "name"
    );
    const orders = await Order.find({
      seller: sellerId,
      status: { $ne: "canceled" }, // Exclude canceled orders
    })
      .populate("orderBy", "name email")
      .populate("seller");

    // Calculate metrics
    const totalSellerSales = orders.reduce(
      (total, order) => total + order.totalAmount,
      0
    );
    const uniqueCustomers = new Set(
      orders.map((order) => order.orderBy._id.toString())
    );
    const totalSellerCustomers = uniqueCustomers.size;
    const totalSellerOrders = orders.length;
    const totalSellerProduct = products.length;

    // Get top 5 selling products by 'sold' field
    const topSellingProducts = products
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5)
      .map((product) => ({
        id: product._id,
        name: product.name,
        image: product.variants[0]?.images[0]?.url || "",
        sold: product.sold,
        revenue: product.variants.reduce(
          (sum, variant) => sum + variant.price * (variant.sold || 0),
          0
        ),
      }));

    // Extract data for charts
    const monthlySalesData = extractMonthlySalesData(orders);
    const orderStatusData = await extractOrderStatusData(sellerId);
    const productCategoryData = extractProductCategoryData(orders, products);
    const productDistributionData = extractProductDistributionData(products);

    res.json({
      totalSellerProduct,
      totalSellerOrders,
      totalSellerCustomers,
      totalSellerSales,
      topSellingProducts,
      monthlySalesData,
      orderStatusData,
      productCategoryData,
      productDistributionData,
      avgOrderValue:
        totalSellerOrders > 0 ? totalSellerSales / totalSellerOrders : 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper Functions
const extractMonthlySalesData = (orders) => {
  const monthlyData = {};
  orders.forEach((order) => {
    const month = new Date(order.createdAt).toLocaleString("default", {
      month: "short",
    });
    monthlyData[month] = (monthlyData[month] || 0) + order.totalAmount;
  });
  return Object.entries(monthlyData).map(([month, sales]) => ({
    month,
    sales,
    revenue: sales,
  }));
};

const extractProductCategoryData = (orders, products) => {
  const categorySales = {};
  const productMap = products.reduce((map, product) => {
    map[product._id.toString()] = product;
    return map;
  }, {});

  orders.forEach((order) => {
    order.orderItems.forEach((item) => {
      const product = productMap[item.product.toString()];
      if (product) {
        const categoryPath = product.categories?.length
          ? product.categories.map((c) => c.name).join(" > ")
          : "Uncategorized";
        categorySales[categoryPath] =
          (categorySales[categoryPath] || 0) + item.quantity;
      }
    });
  });
  return Object.entries(categorySales).map(([category, quantity]) => ({
    category,
    quantity,
  }));
};

const extractProductDistributionData = (products) => {
  const categoryCount = {};
  products.forEach((product) => {
    const categoryPath = product.categories?.length
      ? product.categories.map((c) => c.name).join(" > ")
      : "Uncategorized";
    categoryCount[categoryPath] = (categoryCount[categoryPath] || 0) + 1;
  });
  return Object.entries(categoryCount).map(([category, count]) => ({
    category,
    count,
  }));
};

const extractOrderStatusData = async (sellerId) => {
  const ordersList = await Order.find({
    seller: sellerId,
  }).populate("orderBy", "name email");

  const statusCount = ordersList.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(statusCount).map(([status, count]) => ({
    status,
    count,
  }));
};

const getSellerBillingInfo = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    let query = { status: { $ne: "pending" } }; // Exclude pending sellers

    if (search) {
      query.$and = [
        { status: { $ne: "pending" } },
        { brandName: { $regex: search, $options: "i" } },
      ];
    }

    const [sellers, total] = await Promise.all([
      Seller.find(query)
        .select("brandName logo bankDetails status") // Include status in selection
        .skip(skip)
        .limit(Number(limit))
        .lean()
        .exec(),
      Seller.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    if (!sellers || sellers.length === 0) {
      return res.status(200).json(
        new ApiResponse(
          {
            data: [],
            totalPages: 0,
            currentPage: Number(page),
            totalItems: 0,
          },
          "No sellers found"
        )
      );
    }

    // Double check to filter out any pending sellers (redundant safety check)
    const filteredSellers = sellers.filter(
      (seller) => seller.status !== "pending"
    );

    res.status(200).json(
      new ApiResponse(
        {
          data: filteredSellers,
          totalPages,
          currentPage: Number(page),
          totalItems: total,
        },
        "Seller billing info retrieved successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

async function getPendingSellers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const pendingSellers = await Seller.find({ status: "pending" })
      .skip(skip)
      .limit(limit)
      .select(
        "-password -verificationOtp -verificationOtpExpiresAt -resetPasswordToken -resetPasswordTokenExpiresAt"
      )
      .sort({ createdAt: -1 });

    const totalPendingSellers = await Seller.countDocuments({
      status: "pending",
    });

    return res.status(200).json(
      new ApiResponse(
        {
          sellers: pendingSellers,
          total: totalPendingSellers,
          page,
          pages: Math.ceil(totalPendingSellers / limit),
          limit,
        },
        "Pending sellers retrieved successfully"
      )
    );
  } catch (error) {
    next(error);
  }
}
export {
  sellerDashboardInformation,
  getAllSellers,
  getSingleSeller,
  updateSeller,
  deleteSeller,
  uploadImage,
  getSellerBillingInfo,
  getPendingSellers,
  getSellerDetailsForAdminPanel,
  getAllSellersBasicInfo,
};
