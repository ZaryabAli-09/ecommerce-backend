import express from "express";
import {
  createProduct,
  createCategories,
  getAllCategories,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getSingleProduct,
  addReview,
  getReviews,
  deleteReview,
} from "../controllers/product.controllers.js";
import { uploadFileUsingMulter } from "../middlwares/multerMiddleware.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import { verifyUser } from "../middlwares/verifyUser.js";

const router = express.Router();

// product routes

// admin routes
router.post(
  "/create",
  uploadFileUsingMulter.array("images", 10),
  verifyAdmin,
  createProduct
);
router.put("/update/:productId", verifyAdmin, updateProduct);
router.delete("/delete/:productId", verifyAdmin, deleteProduct);

// user routes
router.get("/all", getAllProducts);
router.get("/single/:productId", getSingleProduct);

// review routes
router.get("/review/all", getReviews);
router.post("/review/add/:productId", verifyUser, addReview);
router.delete("/review/delete/:reviewId", verifyAdmin, deleteReview);

// categories routes
router.post("/create-categories", verifyAdmin, createCategories);
router.get("/categories", getAllCategories);

export default router;
