import express from "express";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getSingleProduct,
} from "../controllers/product.controllers.js";
import { uploadFileUsingMulter } from "../middlwares/multerMiddleware.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";

const router = express.Router();

// admin routes
router.post(
  "/create",
  uploadFileUsingMulter.array("images", 10),
  verifyAdmin,
  createProduct
);
router.put("/update/:productId", verifyAdmin, updateProduct);
router.delete("/delete/:productId", verifyAdmin, deleteProduct);

// consumer routes
router.get("/all", getAllProducts);
router.get("/single/:productId", getSingleProduct);

export default router;
