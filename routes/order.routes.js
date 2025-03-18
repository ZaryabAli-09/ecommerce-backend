import express from "express";
// import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import {
  newOrder,
  // myOrders,
  // allOrders,
  fetchSellerOrders,
  updateOrderStatus,
  getOrderDetails,
} from "../controllers/order.controllers.js";
import { verifyUser } from "../middlwares/verifyUser.js";
import { verifySeller } from "../middlwares/verifySeller.js";

const router = express.Router();

router.post("/new", newOrder);

router.get("/seller-orders", verifySeller, fetchSellerOrders);
router.get("/:orderId", verifySeller, getOrderDetails);
router.patch("/update-status/:orderId", verifySeller, updateOrderStatus);

// router.get("/all", verifyAdmin, allOrders);
// router.get("/my", verifyUser, myOrders);
export default router;
