import express from "express";
import {
  addToCartItems,
  removeFromCart,
  addIItemToWishlist,
  removeFromWhislist,
  decrementCartItemQuantity,
  getWishList,
  getCartItems,
} from "../controllers/cart-wishlist.controllers.js";
import { verifyUser } from "../middlwares/verifyUser.js";

const router = express.Router();

// cart routes
router.post("/cart/add/:productId/:variantId", verifyUser, addToCartItems);
router.post("/cart/remove/:cartId", verifyUser, removeFromCart);
router.put("/cart/decrement", verifyUser, decrementCartItemQuantity);
router.get("/cart", verifyUser, getCartItems);

// wishlist routes
router.post(
  "/wishlist/add/:productId/:variantId",
  verifyUser,
  addIItemToWishlist
);
router.post(
  "/wishlist/remove/:productId/:variantId",
  verifyUser,
  removeFromWhislist
);
router.get("/wishlist", verifyUser, getWishList);

export default router;
