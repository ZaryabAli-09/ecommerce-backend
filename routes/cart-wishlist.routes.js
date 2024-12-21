import express from "express";
import {
  addToCartItems,
  removeFromCart,
  addIItemToWishlist,
  removeFromWhislist,
  updateCart,
  getWishList,
  getCartItems,
} from "../controllers/cart-wishlist.controllers.js";
import { verifyUser } from "../middlwares/verifyUser.js";

const router = express.Router();

// cart routes
router.post("/cart/add/:productId", verifyUser, addToCartItems);
router.post("/cart/remove/:productId", verifyUser, removeFromCart);
router.put("/cart/update", verifyUser, updateCart);
router.get("/cart", verifyUser, getCartItems);

// wishlist routes
router.post("/wishlist/add/:productId", verifyUser, addIItemToWishlist);
router.post("/wishlist/remove/:productId", verifyUser, removeFromWhislist);
router.get("/wishlist", verifyUser, getWishList);

export default router;
