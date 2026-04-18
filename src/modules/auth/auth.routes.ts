import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  changePassword,
  forgotPassword,
  getMe,
  login,
  logout,
  refreshToken,
  register,
  resendVerificationOtp,
  resetPassword,
  verifyEmail,
} from "./auth.controller";

const router = Router();

// Public — registration, verification, session, password recovery
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendVerificationOtp);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected — Bearer access token required
router.get("/me", authMiddleware, getMe);
router.post("/logout", authMiddleware, logout);
router.patch("/change-password", authMiddleware, changePassword);

export default router;
