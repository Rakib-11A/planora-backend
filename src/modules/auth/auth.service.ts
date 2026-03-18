import { OtpType } from "@prisma/client";
import bcrypt from "bcryptjs";

import { sendEmail } from "../../config/email";
import { otpEmailTemplate, welcomeEmailTemplate } from "../../config/emailTemplates";
import { config } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import {
  generateOtp,
  getOtpExpiry,
  hashOtp,
  verifyOtp,
} from "../../utils/otp.util";
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashToken,
  verifyRefreshToken,
} from "../../utils/token.util";
import type { UserPublic } from "./auth.repository";
import {
  createOtp,
  createRefreshToken,
  createUser,
  deleteAllUserRefreshTokens,
  deleteRefreshToken,
  findRefreshToken,
  findUserByEmail,
  findUserById,
  findUserByIdWithPassword,
  findValidOtp,
  markOtpAsUsed,
  updateUserById,
} from "./auth.repository";

const BCRYPT_PASSWORD_ROUNDS = 12;

// -----------------------------------------------------------------------------
// Input / output types
// -----------------------------------------------------------------------------

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type AuthMeta = {
  ip?: string;
  userAgent?: string;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: UserPublic;
};

export type RefreshResult = {
  accessToken: string;
  refreshToken: string;
};

// -----------------------------------------------------------------------------
// Registration & email verification
// -----------------------------------------------------------------------------

/**
 * Register a new user (EMAIL provider), send verification OTP, never return password.
 */
export async function registerUser(
  data: RegisterInput,
  _meta: AuthMeta = {},
): Promise<{ message: string }> {
  const existing = await findUserByEmail(data.email);
  if (existing) {
    throw new ApiError(409, "Email already registered");
  }

  const hashedPassword = await bcrypt.hash(data.password, BCRYPT_PASSWORD_ROUNDS);
  const user = await createUser({
    name: data.name,
    email: data.email,
    password: hashedPassword,
    authProvider: "EMAIL",
  });

  const plainOtp = generateOtp();
  const hashedOtp = await hashOtp(plainOtp);
  await createOtp({
    userId: user.id,
    code: hashedOtp,
    type: OtpType.EMAIL_VERIFICATION,
    expiresAt: getOtpExpiry(),
  });

  await sendEmail({
    to: data.email,
    subject: "Verify your email — Planora",
    html: otpEmailTemplate(plainOtp, "verification"),
  });

  return { message: "Registration successful. Check email for OTP." };
}

/**
 * Verify email with OTP, mark user verified, optionally send welcome email.
 */
export async function verifyEmail(
  email: string,
  otp: string,
): Promise<{ message: string }> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.isEmailVerified) {
    throw new ApiError(400, "Email already verified");
  }

  const record = await findValidOtp(user.id, OtpType.EMAIL_VERIFICATION);
  if (!record) {
    throw new ApiError(400, "OTP expired or invalid");
  }
  const valid = await verifyOtp(otp, record.code);
  if (!valid) {
    throw new ApiError(400, "Invalid OTP");
  }

  await markOtpAsUsed(record.id);
  await updateUserById(user.id, { isEmailVerified: true });

  await sendEmail({
    to: user.email,
    subject: "Welcome to Planora",
    html: welcomeEmailTemplate(user.name, config.FRONTEND_URL),
  });

  return { message: "Email verified successfully" };
}

/**
 * Resend verification OTP; invalidates previous OTP of same type via repo.
 */
export async function resendVerificationOtp(email: string): Promise<{ message: string }> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.isEmailVerified) {
    throw new ApiError(400, "Email already verified");
  }

  const plainOtp = generateOtp();
  const hashedOtp = await hashOtp(plainOtp);
  await createOtp({
    userId: user.id,
    code: hashedOtp,
    type: OtpType.EMAIL_VERIFICATION,
    expiresAt: getOtpExpiry(),
  });

  await sendEmail({
    to: user.email,
    subject: "Verify your email — Planora",
    html: otpEmailTemplate(plainOtp, "verification"),
  });

  return { message: "OTP sent to your email" };
}

// -----------------------------------------------------------------------------
// Login, refresh, logout
// -----------------------------------------------------------------------------

/**
 * Authenticate with email/password; issue access + refresh tokens and store hashed refresh token.
 */
export async function loginUser(
  data: LoginInput,
  meta: AuthMeta = {},
): Promise<LoginResult> {
  const user = await findUserByEmail(data.email);
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (user.authProvider === "GOOGLE") {
    throw new ApiError(400, "Use Google login");
  }
  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify email first");
  }
  if (!user.isActive) {
    throw new ApiError(403, "Account deactivated");
  }

  const passwordMatch = await bcrypt.compare(data.password, user.password);
  if (!passwordMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  const hashed = hashToken(refreshToken);

  await createRefreshToken({
    userId: user.id,
    token: hashed,
    expiresAt: getRefreshTokenExpiry(),
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  const safeUser: UserPublic = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    authProvider: user.authProvider,
    createdAt: user.createdAt,
  };

  return {
    accessToken,
    refreshToken,
    user: safeUser,
  };
}

/**
 * Rotate refresh token: verify, delete old, issue new access + refresh tokens.
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  let payload: { sub: string; email: string; role?: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  const hashed = hashToken(refreshToken);
  const record = await findRefreshToken(hashed);
  if (!record) {
    throw new ApiError(401, "Invalid refresh token");
  }
  if (record.expiresAt <= new Date()) {
    throw new ApiError(401, "Refresh token expired");
  }

  await deleteRefreshToken(hashed);

  const newPayload = { sub: payload.sub, email: payload.email, role: payload.role };
  const accessToken = generateAccessToken(newPayload);
  const newRefreshToken = generateRefreshToken(newPayload);
  const newHashed = hashToken(newRefreshToken);

  await createRefreshToken({
    userId: payload.sub,
    token: newHashed,
    expiresAt: getRefreshTokenExpiry(),
  });

  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * Revoke one refresh session by token; idempotent if token already invalid.
 */
export async function logout(refreshToken: string): Promise<{ message: string }> {
  const hashed = hashToken(refreshToken);
  const record = await findRefreshToken(hashed);
  if (record) {
    await deleteRefreshToken(hashed);
  }
  return { message: "Logged out successfully" };
}

// -----------------------------------------------------------------------------
// Password reset & change
// -----------------------------------------------------------------------------

/**
 * If email exists and is verified/active, send password-reset OTP. Never reveal existence of email.
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const user = await findUserByEmail(email);
  if (user && user.isActive && user.isEmailVerified) {
    const plainOtp = generateOtp();
    const hashedOtp = await hashOtp(plainOtp);
    await createOtp({
      userId: user.id,
      code: hashedOtp,
      type: OtpType.PASSWORD_RESET,
      expiresAt: getOtpExpiry(),
    });
    await sendEmail({
      to: user.email,
      subject: "Reset your password — Planora",
      html: otpEmailTemplate(plainOtp, "reset"),
    });
  }
  return { message: "If email exists, OTP has been sent" };
}

/**
 * Reset password with OTP; invalidate all refresh sessions for the user.
 */
export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
): Promise<{ message: string }> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(400, "Invalid request");
  }

  const record = await findValidOtp(user.id, OtpType.PASSWORD_RESET);
  if (!record) {
    throw new ApiError(400, "OTP expired or invalid");
  }
  const valid = await verifyOtp(otp, record.code);
  if (!valid) {
    throw new ApiError(400, "Invalid OTP");
  }

  await markOtpAsUsed(record.id);
  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_PASSWORD_ROUNDS);
  await updateUserById(user.id, { password: hashedPassword });
  await deleteAllUserRefreshTokens(user.id);

  return { message: "Password reset successful. Please login." };
}

/**
 * Change password when user knows current password; invalidate all other sessions.
 */
export async function changePassword(
  userId: string,
  data: ChangePasswordInput,
): Promise<{ message: string }> {
  const user = await findUserByIdWithPassword(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const match = await bcrypt.compare(data.currentPassword, user.password);
  if (!match) {
    throw new ApiError(401, "Invalid current password");
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, BCRYPT_PASSWORD_ROUNDS);
  await updateUserById(userId, { password: hashedPassword });
  await deleteAllUserRefreshTokens(userId);

  return { message: "Password changed successfully" };
}

// -----------------------------------------------------------------------------
// Profile
// -----------------------------------------------------------------------------

/**
 * Return current user by id (safe fields only).
 */
export async function getMe(userId: string): Promise<UserPublic> {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
}
