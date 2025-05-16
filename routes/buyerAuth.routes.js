import express from "express";
import {
  register,
  verifyEmail,
  logout,
  login,
  forgotPassword,
  resetPassword,
  googleAuth,
} from "../controllers/buyerAuth.controllers.js";

const router = express.Router();

// user register and login routes

router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/logout", logout);
router.post("/google", googleAuth);

// password forgot and reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
