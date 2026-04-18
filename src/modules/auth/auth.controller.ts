import type { CookieOptions } from "express";
import type { Request, Response } from "express";

import { config } from "../../config/env";
import type { AuthenticatedRequest } from "../../types";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  changePassword as changeUserPassword,
  forgotPassword as requestPasswordReset,
  getMe as fetchCurrentUser,
  loginUser,
  logout as revokeSession,
  refreshAccessToken,
  registerUser,
  resendVerificationOtp as sendVerificationOtpAgain,
  resetPassword as applyPasswordReset,
  verifyEmail as confirmEmail,
} from "./auth.service";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation";

/**
 * HttpOnly refresh-token cookie defaults (7 days, strict same-site).
 */
export function getCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie("refreshToken", {
    path: "/",
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
  });
}

// -----------------------------------------------------------------------------
// Registration & verification
// -----------------------------------------------------------------------------

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);
  const ip = req.ip ?? req.socket.remoteAddress ?? undefined;
  const userAgent = req.get("user-agent") ?? undefined;
  const result = await registerUser(data, { ip, userAgent });
  res.status(201).json(new ApiResponse(201, result, result.message));
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = verifyEmailSchema.parse(req.body);
  const result = await confirmEmail(email, otp);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const resendVerificationOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = resendOtpSchema.parse(req.body);
  const result = await sendVerificationOtpAgain(email);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

// -----------------------------------------------------------------------------
// Session
// -----------------------------------------------------------------------------

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);
  const ip = req.ip ?? req.socket.remoteAddress ?? undefined;
  const userAgent = req.get("user-agent") ?? undefined;
  const { accessToken, refreshToken: refresh, user } = await loginUser(data, {
    ip,
    userAgent,
  });
  res.cookie("refreshToken", refresh, getCookieOptions());
  res
    .status(200)
    .json(
      new ApiResponse(200, { user, accessToken }, "Login successful"),
    );
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.refreshToken;
  if (raw === undefined || raw === "") {
    throw new ApiError(401, "No refresh token");
  }
  const { accessToken, refreshToken: nextRefresh } = await refreshAccessToken(raw);
  res.cookie("refreshToken", nextRefresh, getCookieOptions());
  res.status(200).json(new ApiResponse(200, { accessToken }, "Token refreshed"));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.refreshToken;
  const result =
    raw !== undefined && raw !== ""
      ? await revokeSession(raw)
      : { message: "Logged out successfully" };
  clearRefreshCookie(res);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

// -----------------------------------------------------------------------------
// Password
// -----------------------------------------------------------------------------

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const result = await requestPasswordReset(email);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = resetPasswordSchema.parse(req.body);
  const result = await applyPasswordReset(email, otp, newPassword);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

// -----------------------------------------------------------------------------
// Profile
// -----------------------------------------------------------------------------

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (userId === undefined) {
    throw new ApiError(401, "Unauthorized");
  }
  const user = await fetchCurrentUser(userId);
  res.status(200).json(new ApiResponse(200, user, "Profile loaded"));
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (userId === undefined) {
    throw new ApiError(401, "Unauthorized");
  }
  const body = changePasswordSchema.parse(req.body);
  const result = await changeUserPassword(userId, {
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  });
  clearRefreshCookie(res);
  res.status(200).json(new ApiResponse(200, result, result.message));
});
