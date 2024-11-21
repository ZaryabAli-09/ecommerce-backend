import express from "express";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import {
  newOrder,
  myOrders,
  getSingleOrder,
  allOrders,
  updateOrder,
  deleteOrder,
} from "../controllers/order.controllers.js";

const router = express.Router();

router.post("/new", newOrder);

router.get("/my/:userId", myOrders);

router.get("/single/:orderId", getSingleOrder);

// admin routes
router.get("/all", verifyAdmin, allOrders);

router.put("/update", verifyAdmin, updateOrder);

router.delete("/delete", verifyAdmin, deleteOrder);

export default router;
