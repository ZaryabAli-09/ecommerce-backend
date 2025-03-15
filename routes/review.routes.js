import express from "express";
import {
  addReview,
  getReviews,
  deleteReview,
  getSellerReviews,
  sellerReplyToReview,
} from "../controllers/review.controllers.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import { verifyUser } from "../middlwares/verifyUser.js";
import { verifySeller } from "../middlwares/verifySeller.js";

const router = express.Router();

// review routes
router.get("/review/all", getReviews);
router.get("/review/seller/:sellerId", getSellerReviews);

router.post(
  "/review/seller/reply/:reviewId",
  verifySeller,
  sellerReplyToReview
);
router.post("/review/add/:productId", verifyUser, addReview);
router.delete("/review/delete/:reviewId", verifyAdmin, deleteReview);

export default router;
