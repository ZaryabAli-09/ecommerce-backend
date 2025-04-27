import express from "express";
import {
  newOrder,
  fetchSellerOrders,
  updateOrderStatus,
  getOrderDetails,
  allOrders,
  myOrders,
} from "../controllers/order.controllers.js";
import { verifyUser } from "../middlwares/verifyUser.js";
import { verifySeller } from "../middlwares/verifySeller.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";

const router = express.Router();

// admin routes
router.get("/all", verifyAdmin, allOrders);
router.patch("/update-status-admin/:orderId", verifyAdmin, updateOrderStatus);

// seller routes
router.get("/seller-orders", verifySeller, fetchSellerOrders);
router.patch("/update-status/:orderId", verifySeller, updateOrderStatus);

// user / buyer routes
router.get("/my", verifyUser, myOrders);
router.post("/new", verifyUser, newOrder);
router.get("/:orderId", getOrderDetails);
export default router;
