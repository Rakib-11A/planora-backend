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
  updateMe,
  verifyEmail,
} from "./auth.controller";

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRegisterRequest'
 *     responses:
 *       201:
 *         description: User registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponseEnvelope'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponseEnvelope'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 * /api/auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email with OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthVerifyEmailRequest'
 *     responses:
 *       200:
 *         description: Email verified
 * /api/auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend verification OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: OTP resent
 * /api/auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token from refresh cookie
 *     responses:
 *       200:
 *         description: Access token refreshed
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: OTP sent
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset account password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successful
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile returned
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 * /api/auth/change-password:
 *   patch:
 *     tags: [Auth]
 *     summary: Change password for authenticated user
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 */

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
router.patch(
  "/me",
  authMiddleware,
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
  updateMe,
);
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
