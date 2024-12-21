import express from "express";
import {
  getAllBuyers,
  updateBuyer,
  deleteBuyer,
  getSingleBuyer,
} from "../controllers/buyer.controllers.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import { verifyUser } from "../middlwares/verifyUser.js";

const router = express.Router();

// Admin routes
// ... change middleware to  verifyAdmin after testing
router.get("/all", verifyAdmin, getAllBuyers);
router.delete("/delete/:buyerId", verifyAdmin, deleteBuyer);

// Buyer routes
router.get("/single/:buyerId", verifyUser, getSingleBuyer);
router.put("/update/:buyerId", verifyUser, updateBuyer);

export default router;
//
