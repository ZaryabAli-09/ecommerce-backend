import express from "express";
import {
  getAllUsers,
  logOut,
  updateUser,
  deleteUser,
  getSingleUser,
  addToCartItems,
  removeFromCart,
  addIItemToWishlist,
  removeFromWhislist,
} from "../controllers/users.controllers.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import { verifyUser } from "../middlwares/verifyUser.js";

const router = express.Router();

// Admin routes
router.get("/all", verifyAdmin, getAllUsers);
router.get("/single/:userId", verifyAdmin, getSingleUser);

// user routes
router.put("/update/:userId", verifyUser, updateUser);
router.delete("/delete/:userId", verifyUser, deleteUser);
router.post("/logout", logOut);

// to be tested and refactored

// Cart and Wishlist routes
router.post("/cart/add/:productId", verifyUser, addToCartItems);
router.post("/cart/remove/:productId", verifyUser, removeFromCart);
// router.get("/cart", verifyUser, getCartItems);

router.post("/wishlist/add/:productId", verifyUser, addIItemToWishlist);
router.post("/wishlist/remove/:productId", verifyUser, removeFromWhislist);
// router.get("/wishlist", verifyUser, getWishlistItems);

export default router;
