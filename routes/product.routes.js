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
  getStoreProducts,
  getProductsByCategory,
  searchProducts,
  getSingleProductForSeller,
} from "../controllers/product.controllers.js";
import { uploadFileUsingMulter } from "../middlwares/multerMiddleware.js";
import getBuyer from "../middlwares/getBuyer.js";
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
router.get("/single/:productId", getBuyer, getSingleProduct);

// i need to change my seller frontend code related to this route
router.get("/single/seller/:productId", getSingleProductForSeller);

router.get("/category", getProductsByCategory);
router.get("/search", searchProducts);

router.get("/store-products/:storeId", getStoreProducts);

export default router;
