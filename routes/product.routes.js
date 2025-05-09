import express from "express";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getSingleProduct,
  getSellerProducts,
  deleteProductImage,
  getAllProductsWithFilteringAndPagination,
  adminDeleteProduct,
  adminUpdateProduct,
} from "../controllers/product.controllers.js";
import { uploadFileUsingMulter } from "../middlwares/multerMiddleware.js";
import { verifySeller } from "../middlwares/verifySeller.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
const router = express.Router();
// admin routes
router.delete("/admin/delete/:productId", verifyAdmin, adminDeleteProduct);
router.put("/admin/update/:productId", verifyAdmin, adminUpdateProduct);

// seller routes
router.post("/create", uploadFileUsingMulter, verifySeller, createProduct);
router.put("/update/:productId", verifySeller, updateProduct);
router.get("/seller-products/:sellerId", getSellerProducts);

router.delete("/delete/:productId", verifySeller, deleteProduct);
router.delete("/deleteImg/:publicId", verifySeller, deleteProductImage);
// buyer routes
router.get("/all", getAllProducts);
router.get("/all-filter-pagination", getAllProductsWithFilteringAndPagination);
router.get("/single/:productId", getSingleProduct);

export default router;
