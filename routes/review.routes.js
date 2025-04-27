import express from "express";
import {
  addReview,
  deleteReview,
  getSellerReviews,
  sellerReplyToReview,
  getAllReviews,
} from "../controllers/review.controllers.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import { verifyUser } from "../middlwares/verifyUser.js";
import { verifySeller } from "../middlwares/verifySeller.js";

// review routes
const router = express.Router();
// admin routes
router.get("/review/all", verifyAdmin, getAllReviews);
router.delete("/review/delete/:reviewId", verifyAdmin, deleteReview);

// seller routes
router.get("/review/seller/:sellerId", getSellerReviews);
router.post(
  "/review/seller/reply/:reviewId",
  verifySeller,
  sellerReplyToReview
);

// user / buyer routes
router.post("/review/add/:productId", verifyUser, addReview);

export default router;
