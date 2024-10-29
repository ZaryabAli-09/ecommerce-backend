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

const router = express.Router();

// product routes
router.post(
  "/create",
  uploadFileUsingMulter.array("images", 10),
  createProduct
);
router.put("/update/:productId", updateProduct);
router.delete("/delete/:productId", deleteProduct);

router.get("/all", getAllProducts);
router.get("/single/:productId", getSingleProduct);

// review routes
router.post("/review/add/:userId/:productId", addReview);
router.delete("/review/delete/:reviewId", deleteReview);
router.get("/review/all", getReviews);

// categories routes
router.post("/create-categories", createCategories);
router.get("/categories", getAllCategories);

export default router;
