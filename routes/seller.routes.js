import express from "express";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import { verifyUser } from "../middlwares/verifyUser.js";
import { verifySeller } from "../middlwares/verifySeller.js";
import {
  deleteSeller,
  getAllSellers,
  getSingleSeller,
  updateSeller,
} from "../controllers/seller.controllers.js";

const router = express.Router();

// Admin routes
// ... change middleware to  verifyAdmin after testing
router.get("/all", verifyUser, getAllSellers);
router.delete("/delete/:sellerId", verifyAdmin, deleteSeller);

// Buyer routes
router.get("/single/:sellerId", verifySeller, getSingleSeller);
router.put("/update/:sellerId", verifySeller, updateSeller);

export default router;
