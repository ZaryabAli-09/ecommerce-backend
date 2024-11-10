import express from "express";
import {
  login,
  register,
  forgotPassword,
  resetPassword,
  verifyEmail,
  googleAuth,
} from "../controllers/auth.controllers.js";

const router = express.Router();

// confirm email route
router.get("/verify-email", verifyEmail);

// user register and login routes
router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);

// password forgot and reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// refresh token route

export default router;
