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
} from "../controllers/product.controllers.js";
import { uploadFileUsingMulter } from "../middlwares/multerMiddleware.js";
import getBuyer from "../middlwares/getBuyer.js";
import { verifySeller } from "../middlwares/verifySeller.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
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
router.get("/all", getAllProducts);
router.get("/all-filter-pagination", getAllProductsWithFilteringAndPagination);
router.get("/single/:productId", getBuyer, getSingleProduct);

// i need to change my seller frontend code related to this route
router.get("/single/seller/:productId", getSingleProductForSeller);

router.get("/category", getProductsByCategory);
router.get("/search", searchProducts);

router.get("/store-products/:storeId", getStoreProducts);

import Reel from "../models/reel.models.js";
import upload from "../middlwares/videoMulter.js";
import cloudinary from "../config/cloudinaryVideo.js";
import fs from "fs";
router.post(
  "/reels/upload",
  upload.single("video"),
  verifySeller,

  async (req, res) => {
    try {
      const file = req.file;

      // 1. Validate
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      // 2. Upload to Cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: "video",
        folder: "reels",
      });

      // 3. Check duration from Cloudinary metadata
      const duration = result.duration;
      if (duration > 30) {
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(result.public_id, {
          resource_type: "video",
        });
        return res
          .status(400)
          .json({ error: "Video must be 30 seconds or less." });
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
        .json({ message: "Reel uploaded successfully!", reel: newReel });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: "Upload failed", details: err.message });
    }
  }
);
// controllers/getReelsController.js

router.get("/reels/get", async (req, res) => {
  try {
    const reels = await Reel.find()
      .populate("uploadedBy", "brandName")
      .sort({ createdAt: -1 }); // Sort by createdAt in descending order // Latest first
    console.log(reels);
    res.status(200).json(reels);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reels" });
  }
});

export default router;
