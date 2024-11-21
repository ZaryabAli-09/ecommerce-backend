import express from "express";
import {
  getAllUsers,
  logOut,
  updateUser,
  deleteUser,
  getSingleUser,
} from "../controllers/users.controllers.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import { verifyUser } from "../middlwares/verifyUser.js";

const router = express.Router();

// Admin routes
router.get("/all", verifyAdmin, getAllUsers);

// user routes
router.get("/single/:userId", verifyUser, getSingleUser);
router.put("/update/:userId", verifyUser, updateUser);
router.delete("/delete/:userId", verifyUser, deleteUser);
router.post("/logout", logOut);

export default router;
