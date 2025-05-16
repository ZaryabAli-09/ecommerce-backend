import express from "express";
import {
  getAllBuyers,
  updateBuyer,
  deleteBuyer,
  getSingleBuyer,
  getBuyerProfile,
  updateBuyerProfile,
  addToBuyerBrowsingHistory,
  getBuyerBrowsingHistory,
  deleteFromBuyerBrowsingHistory,
} from "../controllers/buyer.controllers.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import { verifyUser } from "../middlwares/verifyUser.js";

const router = express.Router();

// Admin routes
// ... change middleware to  verifyAdmin after testing
router.get("/all", getAllBuyers);
router.delete("/delete/:buyerId", verifyAdmin, deleteBuyer);

// Buyer routes
router.get("/single/:buyerId", verifyUser, getSingleBuyer);
router.put("/update/:buyerId", verifyUser, updateBuyer);
// route added by talha for frontend
router.get("/profile", verifyUser, getBuyerProfile);
router.put("/profile", verifyUser, updateBuyerProfile);
router.put("/browsing-history", verifyUser, addToBuyerBrowsingHistory);
router.delete("/browsing-history", verifyUser, deleteFromBuyerBrowsingHistory);
router.get("/browsing-history", verifyUser, getBuyerBrowsingHistory);
export default router;
