import express from "express";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getSingleProduct,
  getSellerProducts,
  deleteProductImage,
} from "../controllers/product.controllers.js";
import { uploadFileUsingMulter } from "../middlwares/multerMiddleware.js";
import { verifySeller } from "../middlwares/verifySeller.js";
const router = express.Router();

// seller routes
router.post("/create", uploadFileUsingMulter, verifySeller, createProduct);
router.put("/update/:productId", verifySeller, updateProduct);
router.get("/seller-products", verifySeller, getSellerProducts);
router.delete("/delete/:productId", verifySeller, deleteProduct);
router.delete("/deleteImg/:publicId", verifySeller, deleteProductImage);
// buyer routes
router.get("/all", getAllProducts);
router.get("/single/:productId", getSingleProduct);

export default router;
