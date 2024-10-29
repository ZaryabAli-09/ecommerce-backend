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

router.get("/get-all-users", getAllUsers);
router.get("/get-single-user/:userId", getSingleUser);

router.post("/logout", logOut);
router.put("/update/:userId", verifyUser, updateUser);
router.delete("/delete/:userId", verifyUser, deleteUser);

router.post("/add-to-cart/:productId", verifyUser, addToCartItems);
router.post("/remove-from-cart/:productId", verifyUser, removeFromCart);

router.post("/add-to-wishlist/:productId", verifyUser, addIItemToWishlist);
router.post("/remove-from-wishlist/:productId", verifyUser, removeFromWhislist);

export default router;
