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
import { verifyUser } from "../middlwares/verifyUser.js";

const router = express.Router();

router.post("/new", verifyUser, newOrder);

router.get("/my", verifyUser, myOrders);

router.get("/single/:orderId", verifyUser, getSingleOrder);

// admin routes
router.get("/all", verifyAdmin, allOrders);

router.put("/update/:orderId", verifyAdmin, updateOrder);

router.delete("/delete/:orderId", verifyAdmin, deleteOrder);

export default router;
