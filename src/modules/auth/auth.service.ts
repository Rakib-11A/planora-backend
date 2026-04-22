import { OtpType, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { getRedisClient } from "../../config/redis";
import { logger } from "../../lib/logger/logger";
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
const LOGIN_FAIL_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_FAIL_PREFIX = "security:v1:login:fail";
const LOGIN_BLOCK_PREFIX = "security:v1:login:block";
const inMemoryFailedAttempts = new Map<string, { count: number; expiresAt: number }>();
const inMemoryBlockedAttempts = new Map<string, number>();

// Input / output types

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
  requestId?: string;
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

function getLoginAttemptId(email: string, ip?: string): string {
  return `${email.toLowerCase()}|${ip ?? "unknown"}`;
}

function clearInMemoryIfExpired(id: string): void {
  const now = Date.now();
  const failed = inMemoryFailedAttempts.get(id);
  if (failed !== undefined && failed.expiresAt <= now) {
    inMemoryFailedAttempts.delete(id);
  }

  const blockedUntil = inMemoryBlockedAttempts.get(id);
  if (blockedUntil !== undefined && blockedUntil <= now) {
    inMemoryBlockedAttempts.delete(id);
  }
}

async function isLoginBlocked(id: string): Promise<boolean> {
  clearInMemoryIfExpired(id);
  if ((inMemoryBlockedAttempts.get(id) ?? 0) > Date.now()) {
    return true;
  }

  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const blocked = await redis.get(`${LOGIN_BLOCK_PREFIX}:${id}`);
    return blocked === "1";
  } catch {
    return false;
  }
}

async function registerLoginFailure(id: string): Promise<number> {
  clearInMemoryIfExpired(id);
  const now = Date.now();

  const failedLocal = inMemoryFailedAttempts.get(id);
  const nextCount = (failedLocal?.count ?? 0) + 1;
  inMemoryFailedAttempts.set(id, {
    count: nextCount,
    expiresAt: now + LOGIN_BLOCK_WINDOW_MS,
  });
  if (nextCount >= LOGIN_FAIL_MAX_ATTEMPTS) {
    inMemoryFailedAttempts.delete(id);
    inMemoryBlockedAttempts.set(id, now + LOGIN_BLOCK_WINDOW_MS);
  }

  const redis = getRedisClient();
  if (!redis) return nextCount;

  try {
    const failKey = `${LOGIN_FAIL_PREFIX}:${id}`;
    const blockKey = `${LOGIN_BLOCK_PREFIX}:${id}`;
    const failures = await redis.incr(failKey);
    if (failures === 1) {
      await redis.pexpire(failKey, LOGIN_BLOCK_WINDOW_MS);
    }
    if (failures >= LOGIN_FAIL_MAX_ATTEMPTS) {
      await redis.set(blockKey, "1", "PX", LOGIN_BLOCK_WINDOW_MS);
      await redis.del(failKey);
    }
    return failures;
  } catch {
    return nextCount;
  }
}

async function clearLoginFailures(id: string): Promise<void> {
  inMemoryFailedAttempts.delete(id);
  inMemoryBlockedAttempts.delete(id);

  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.del(`${LOGIN_FAIL_PREFIX}:${id}`, `${LOGIN_BLOCK_PREFIX}:${id}`);
  } catch {
    // ignore to avoid breaking auth flow
  }
}

// Registration & email verification

// Register a new user (EMAIL provider), send verification OTP, never return password.

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

  // Fire-and-forget: don't block the response on email delivery.
  sendEmail({
    to: data.email,
    subject: "Verify your email — Planora",
    html: otpEmailTemplate(plainOtp, "verification"),
  }).catch((err: unknown) => {
    logger.error("Failed to send verification email", {
      to: data.email,
      message: err instanceof Error ? err.message : String(err),
    });
  });

  return { message: "Registration successful. Check email for OTP." };
}

// Verify email with OTP, mark user verified, optionally send welcome email.

export type VerifyEmailResult = {
  message: string;
  user: UserPublic;
  accessToken: string;
  refreshToken: string;
};

export async function verifyEmail(
  email: string,
  otp: string,
): Promise<VerifyEmailResult> {
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

  sendEmail({
    to: user.email,
    subject: "Welcome to Planora",
    html: welcomeEmailTemplate(user.name, config.FRONTEND_URL),
  }).catch((err: unknown) => {
    logger.error("Failed to send welcome email", {
      to: user.email,
      message: err instanceof Error ? err.message : String(err),
    });
  });

  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await createRefreshToken({
    userId: user.id,
    token: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiry(),
  });

  const safeUser: UserPublic = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isActive: user.isActive,
    isBanned: (user as { isBanned?: boolean }).isBanned ?? false,
    bannedAt: (user as { bannedAt?: Date | null }).bannedAt ?? null,
    isEmailVerified: true,
    authProvider: user.authProvider,
    createdAt: user.createdAt,
  };

  return { message: "Email verified. Welcome to Planora!", user: safeUser, accessToken, refreshToken };
}

// Resend verification OTP; invalidates previous OTP of same type via repo.

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

// Login, refresh, logout

// Authenticate with email/password; issue access + refresh tokens and store hashed refresh token.

export async function loginUser(
  data: LoginInput,
  meta: AuthMeta = {},
): Promise<LoginResult> {
  const attemptId = getLoginAttemptId(data.email, meta.ip);
  if (await isLoginBlocked(attemptId)) {
    logger.warn("Login blocked due to brute-force protection", {
      email: data.email.toLowerCase(),
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
    throw new ApiError(429, "Too many failed login attempts. Try again later.");
  }

  const user = await findUserByEmail(data.email);
  if (!user) {
    const failures = await registerLoginFailure(attemptId);
    logger.warn("Login failed: user not found", {
      email: data.email.toLowerCase(),
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
      failures,
    });
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
  if ((user as { isBanned?: boolean }).isBanned === true) {
    throw new ApiError(403, "Account is banned");
  }

  const passwordMatch = await bcrypt.compare(data.password, user.password);
  if (!passwordMatch) {
    const failures = await registerLoginFailure(attemptId);
    logger.warn("Login failed: invalid credentials", {
      userId: user.id,
      email: data.email.toLowerCase(),
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
      failures,
    });
    throw new ApiError(401, "Invalid email or password");
  }

  await clearLoginFailures(attemptId);

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

  logger.info("Login successful", {
    userId: user.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    requestId: meta.requestId,
  });

  const safeUser: UserPublic = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isActive: user.isActive,
    isBanned: (user as { isBanned?: boolean }).isBanned ?? false,
    bannedAt: (user as { bannedAt?: Date | null }).bannedAt ?? null,
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

/** Coalesces concurrent refresh calls using the same refresh JWT (multi-tab / burst 401s). */
const refreshTokenRotationLocks = new Map<string, Promise<RefreshResult>>();

/**
 * Rotate refresh token: verify, delete old, issue new access + refresh tokens.
 * Concurrent requests with the same refresh cookie share one rotation (avoids false 401 races).
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  const lockKey = hashToken(refreshToken);
  const inflight = refreshTokenRotationLocks.get(lockKey);
  if (inflight !== undefined) {
    return inflight;
  }

  const task = performRefreshTokenRotation(refreshToken).finally(() => {
    refreshTokenRotationLocks.delete(lockKey);
  });
  refreshTokenRotationLocks.set(lockKey, task);
  return task;
}

async function performRefreshTokenRotation(refreshToken: string): Promise<RefreshResult> {
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
  if (!record.user.isActive) {
    throw new ApiError(403, "Account has been deactivated");
  }
  if (record.user.isBanned) {
    throw new ApiError(403, "Account is banned");
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

  logger.info("Refresh token rotated", { userId: payload.sub });

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

export type UpdateProfileInput = {
  name?: string;
  avatar?: string | null;
};

/**
 * Patch the signed-in user's mutable profile fields. Email and role are not
 * editable here (email change requires verification, role is admin-only).
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileInput,
): Promise<UserPublic> {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const patch: Prisma.UserUpdateInput = {};
  if (data.name !== undefined) {
    patch.name = data.name;
  }
  if (data.avatar !== undefined) {
    patch.avatar = data.avatar;
  }
  const updated = await updateUserById(userId, patch);
  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    avatar: updated.avatar,
    isActive: updated.isActive,
    isBanned: updated.isBanned,
    bannedAt: updated.bannedAt,
    isEmailVerified: updated.isEmailVerified,
    authProvider: updated.authProvider,
    createdAt: updated.createdAt,
  };
}
