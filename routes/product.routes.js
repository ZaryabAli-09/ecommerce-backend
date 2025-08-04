import express from "express";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getSingleProduct,
  getSellerProducts,
  deleteProductImage,
  getAllProductsWithFilteringAndPagination,
  adminDeleteProduct,
  adminUpdateProduct,
  getStoreProducts,
  getProductsByCategory,
  searchProducts,
  getSingleProductForSeller,
  getSimilarProducts,
} from "../controllers/product.controllers.js";
import { uploadFileUsingMulter } from "../middlwares/multerMiddleware.js";
import getBuyer from "../middlwares/getBuyer.js";
import { verifySeller } from "../middlwares/verifySeller.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import Reel from "../models/reel.models.js";
import upload from "../middlwares/videoMulter.js";
import cloudinary from "../config/cloudinaryVideo.js";
import fs from "fs";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Buyer } from "../models/buyer.models.js";
import { Product } from "../models/product.model.js";

const router = express.Router();
// admin routes
router.delete("/admin/delete/:productId", verifyAdmin, adminDeleteProduct);
router.put("/admin/update/:productId", verifyAdmin, adminUpdateProduct);

// seller routes
router.post("/create", uploadFileUsingMulter, verifySeller, createProduct);
router.put("/update/:productId", verifySeller, updateProduct);
router.get("/seller-products/:sellerId", getSellerProducts);

router.delete("/delete/:productId", verifySeller, deleteProduct);
router.delete("/deleteImg/:publicId", verifySeller, deleteProductImage);
// buyer routes
router.get("/all", getBuyer, getAllProducts);
router.get("/all-filter-pagination", getAllProductsWithFilteringAndPagination);
router.get("/single/:productId", getBuyer, getSingleProduct);

// *** NEW SIMILAR PRODUCTS ROUTE ***
router.get("/similar/:productId", getSimilarProducts);

// i need to change my seller frontend code related to this route
router.get("/single/seller/:productId", getSingleProductForSeller);

router.get("/category", getProductsByCategory);
router.get("/search", searchProducts);

router.get("/store-products/:storeId", getStoreProducts);

// post reel
router.post(
  "/reels/upload",
  upload.single("video"),
  verifySeller,

  async (req, res, next) => {
    try {
      const file = req.file;

      // 1. Validate
      if (!req.body.caption) {
        throw new ApiError(400, "ProductId  is required.");
      }
      if (!req.seller) {
        throw new ApiError(401, "Unauthorized. Seller not found.");
      }
      if (!file) {
        throw new ApiError(400, "No video file uploaded.");
      }
      if (!file.mimetype.startsWith("video/")) {
        throw new ApiError(400, "File must be a video.");
      }

      // 2. Upload to Cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: "video",
        folder: "reels",
      });

      // 3. Check duration from Cloudinary metadata
      const duration = result.duration;
      if (duration > 50) {
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(result.public_id, {
          resource_type: "video",
        });
        throw new ApiError(400, "Video duration must be less than 30 seconds.");
      }

      // 4. Save to DB
      const newReel = new Reel({
        videoUrl: result.secure_url,
        uploadedBy: req.seller?._id, // assuming you're using auth middleware
        caption: req.body.caption || "",
      });

      await newReel.save();

      // 5. Delete local file
      fs.unlinkSync(file.path);

      res
        .status(200)
        .json(new ApiResponse({ reel: newReel }, "Reel uploaded successfully"));
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
);

// not refactored
router.delete("/reels/:reelId", verifySeller, async (req, res, next) => {
  try {
    const { reelId } = req.params;

    const reel = await Reel.findById(reelId);
    if (!reel) throw new ApiError(404, "Reel not found.");

    // Only the seller who uploaded it can delete it
    if (reel.uploadedBy.toString() !== req.seller._id.toString()) {
      throw new ApiError(
        403,
        "You can't delete this reel. Unauthorized action."
      );
    }

    // Extract public_id from Cloudinary URL
    const publicId = reel.videoUrl.split("/").pop().split(".")[0];

    // Correct Cloudinary path: folderName/publicId
    const fullPublicId = `reels/${publicId}`;
    // Delete from Cloudinary
    const deleteFromCloud = await cloudinary.uploader.destroy(fullPublicId, {
      resource_type: "video",
    });

    // Delete from DB
    await reel.deleteOne();

    res.status(200).json(new ApiResponse(null, "🗑️ Reel deleted successfully"));
  } catch (err) {
    next(err);
  }
});
// GET /reels/get - Personalized or random reels with pagination
router.get("/reels/get", async (req, res, next) => {
  try {
    const { buyerId } = req.query;

    // Optimized database queries
    if (!buyerId) {
      // Get all random reels at once
      const randomReels = await Reel.aggregate([
        {
          $lookup: {
            from: "sellers",
            localField: "uploadedBy",
            foreignField: "_id",
            as: "uploadedBy",
            pipeline: [{ $project: { brandName: 1 } }],
          },
        },
        { $unwind: { path: "$uploadedBy", preserveNullAndEmptyArrays: true } },
        { $sample: { size: 100 } }, // Limit maximum number of random reels
      ]);

      if (!randomReels.length) {
        return res.status(200).json(new ApiResponse([], "No reels found"));
      }

      return res
        .status(200)
        .json(new ApiResponse(randomReels, "🎲 Random reels fetched"));
    }

    // Personalized reels
    const buyer = await Buyer.findById(buyerId);
    if (!buyer) {
      throw new ApiError(401, "❌ Buyer not found");
    }

    // Get liked reel IDs
    const likedIds = buyer.likedReels
      .filter((item) => item.reel)
      .map((item) => item.reel.toString());

    // Get all personalized reels at once
    const personalizedReels = await Reel.aggregate([
      {
        $lookup: {
          from: "sellers",
          localField: "uploadedBy",
          foreignField: "_id",
          as: "uploadedBy",
          pipeline: [{ $project: { brandName: 1 } }],
        },
      },
      { $unwind: { path: "$uploadedBy", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          isLiked: { $in: ["$_id", likedIds] },
        },
      },
      { $sort: { isLiked: -1, likes: -1 } },
      { $limit: 100 }, // Limit maximum number of reels
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(personalizedReels, "✅ Personalized reels fetched")
      );
  } catch (error) {
    next(error);
  }
});

router.get("/seller/reels", verifySeller, async (req, res, next) => {
  try {
    const sellerId = req.seller._id;
    // Fetch all reels uploaded by the seller
    const reels = await Reel.find({ uploadedBy: sellerId })
      .populate("uploadedBy", "brandName")
      .sort({ createdAt: -1 }); // Sort by createdAt in descending order // Latest first

    if (!reels || reels.length === 0) {
      throw new ApiError(404, "No reels found for this seller");
    }
    // Ensure reels are populated with uploadedBy brandName
    reels.forEach((reel) => {
      reel.uploadedBy = reel.uploadedBy || { brandName: "Unknown" }; // Fallback if no brandName
    });

    return res
      .status(200)
      .json(new ApiResponse(reels, "Reels fetched successfully"));
  } catch (error) {
    next(error);
  }
});
// get liked reels for users
router.get("/reels/liked", getBuyer, async (req, res, next) => {
  try {
    const buyer = await Buyer.findById(req.buyer._id).populate(
      "likedReels.reel"
    );

    if (!buyer) {
      throw new ApiError(401, "Unauthorized. Buyer not found.");
    }

    // Filter out only existing reels (non-null after population)
    const validLikedReels = buyer.likedReels.filter(
      (item) => item.reel !== null
    );

    // Remove invalid liked reels from DB
    if (validLikedReels.length !== buyer.likedReels.length) {
      buyer.likedReels = validLikedReels;
      await buyer.save();
    }

    const likedReels = validLikedReels.map((item) => item.reel);

    return res
      .status(200)
      .json(new ApiResponse(likedReels, "✅ Liked reels fetched"));
  } catch (error) {
    next(error);
  }
});

// LIKE a reel
router.post("/reels/like/:reelId", getBuyer, async (req, res, next) => {
  try {
    const { reelId } = req.params;
    const buyer = await Buyer.findById(req.buyer._id);

    if (!buyer) {
      throw new ApiError(401, "Unauthorized. Buyer not found.");
    }

    const reel = await Reel.findById(reelId);
    if (!reel) {
      throw new ApiError(404, "Reel not found.");
    }

    const alreadyLiked = buyer.likedReels?.some(
      (item) => item.reel.toString() === reelId
    );

    if (!alreadyLiked) {
      // Ensure it's a number before incrementing
      reel.likes = typeof reel.likes === "number" ? reel.likes + 1 : 1;

      buyer.likedReels = buyer.likedReels || [];
      buyer.likedReels.push({ reel: reelId });

      await reel.save();
      await buyer.save();
    }

    return res.status(200).json(new ApiResponse(null, "❤️ Liked"));
  } catch (error) {
    next(error);
  }
});

// UNLIKE a reel
router.delete("/reels/like/:reelId", getBuyer, async (req, res, next) => {
  try {
    const { reelId } = req.params;
    const buyer = await Buyer.findById(req.buyer._id);

    if (!buyer) {
      throw new ApiError(401, "Unauthorized. Buyer not found.");
    }

    const reel = await Reel.findById(reelId);
    if (!reel) {
      throw new ApiError(404, "Reel not found.");
    }

    const likedIndex = buyer.likedReels?.findIndex(
      (item) => item.reel.toString() === reelId
    );

    if (likedIndex !== -1) {
      reel.likes -= 1;
      if (reel.likes < 0) reel.likes = 0; // Ensure likes don't go negative
      buyer.likedReels.splice(likedIndex, 1);

      await reel.save();
      await buyer.save();
    }

    return res.status(200).json(new ApiResponse(null, "💔 Unliked"));
  } catch (error) {
    next(error);
  }
});

// get reels for admins
router.get("/reels/admin", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const total = await Reel.countDocuments();
    const reels = await Reel.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("uploadedBy", "brandName");

    const reelsWithProductInfo = await Promise.all(
      reels.map(async (reel) => {
        let productName = null;
        try {
          const product = await Product.findById(reel.caption);
          productName = product ? product.name : null;
        } catch {
          productName = null;
        }

        return {
          ...reel.toObject(),
          productName,
        };
      })
    );

    return res
      .status(200)
      .json(
        new ApiResponse({ data: reelsWithProductInfo, total }, "Reels fetched")
      );
  } catch (err) {
    next(err);
  }
});

export default router;
