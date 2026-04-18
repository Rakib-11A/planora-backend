import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
  forgotPasswordLimiter,
  loginLimiter,
  refreshTokenLimiter,
  registerLimiter,
  resendOtpLimiter,
  resetPasswordLimiter,
  verifyEmailLimiter,
} from "../../middlewares/rateLimiter";
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
router.post("/register", registerLimiter, register);
router.post("/verify-email", verifyEmailLimiter, verifyEmail);
router.post("/resend-otp", resendOtpLimiter, resendVerificationOtp);
router.post("/login", loginLimiter, login);
router.post("/refresh-token", refreshTokenLimiter, refreshToken);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPasswordLimiter, resetPassword);

// Protected — Bearer access token required
router.get("/me", authMiddleware, authenticatedGeneralLimiter, getMe);
router.post(
  "/logout",
  authMiddleware,
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
  logout,
);
router.patch(
  "/change-password",
  authMiddleware,
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
  changePassword,
);

export default router;
