import express from "express";
import {
  addReview,
  getReviews,
  deleteReview,
} from "../controllers/review.controllers.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import { verifyUser } from "../middlwares/verifyUser.js";

const router = express.Router();

// review routes
router.get("/review/all", getReviews);
router.post("/review/add/:productId", verifyUser, addReview);
router.delete("/review/delete/:reviewId", verifyAdmin, deleteReview);

export default router;
