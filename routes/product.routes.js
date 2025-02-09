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

// routes talha will work on
// Create Product
// POST /api/products - Authenticated seller creates a product.

// Update Product
// PUT /api/products/:productId - Authenticated seller updates product details.

// Delete Product
// DELETE /api/products/:productId - Authenticated seller deletes a product.

// Get All Products
// GET /api/products - Retrieve all products.

// Get Single Product
// GET /api/products/:productId - Retrieve details of a specific product.

// Get Seller-Specific Products
// GET /api/products/seller - Fetch products created by the authenticated seller.

// ..........................................................

//if you're not using the verifySeller middleware, you must ensure the seller ID is provided in req.params for routes that require seller identification.
// i will then  modify it and will integrate it to verifySller middleware

// ....................................................................
// If you are using verifySeller middleware, ensure you log in with valid seller credentials via Postman.

// logged in with this seller info dont create new seller there some work remaining in seller routes
//  http://localhost:5000/api/seller/auth/login
// email: zaryabkhan248@gmail.com
// password:hello12

// Upon successful login, a JWT token will be set in cookies. Extract this token and set it in the headers
// of requests for routes like "create product," "update product," etc., to authenticate the seller.

// if you are using verifySeller middleware then logged in with these credentials in postman when successfully login a jwt token will be set in cokkies take that token and set in headers in route like create product etc

export default router;
