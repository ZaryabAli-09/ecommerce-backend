import express from "express";
import { validateSeller } from "../middlwares/validationMiddlewares/sellerValidationMiddleware.js";
import {
  approveSeller,
  forgotPassword,
  login,
  logout,
  register,
  rejectSeller,
  resendOtp,
  resetPassword,
  verifyEmail,
} from "../controllers/sellerAuth.controllers.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
const router = express.Router();

router.post("/register", validateSeller, register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOtp);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:resetPasswordToken", resetPassword);
router.post("/logout", logout);

// admin routes
router.put("/approve-seller/:sellerId", verifyAdmin, approveSeller);
router.put("/reject-seller/:sellerId", verifyAdmin, rejectSeller);

export default router;
