import express from "express";
import { validateSeller } from "../middlwares/validationMiddlewares/sellerValidationMiddleware.js";
import {
  forgotPassword,
  login,
  register,
  resendOtp,
  resetPassword,
  verifyEmail,
} from "../controllers/sellerAuth.controllers.js";
const router = express.Router();

router.post("/register", validateSeller, register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOtp);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:resetPasswordToken", resetPassword);

export default router;
