import type { AuthProvider, Otp, OtpType, Prisma, RefreshToken, User } from "@prisma/client";

import prisma from "../../config/database";

export type UserPublic = {
  id: string;
  name: string;
  email: string;
  role: User["role"];
  avatar: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  authProvider: AuthProvider;
  createdAt: Date;
};

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  isActive: true,
  isEmailVerified: true,
  authProvider: true,
  createdAt: true,
} as const;

const userPublicWithGoogleSelect = {
  ...userPublicSelect,
  googleId: true,
} as const;

export type UserPublicWithTimestamps = UserPublic & {
  googleId: string | null;
  updatedAt: Date;
};

// Input for registering a local or OAuth-backed user row. 
export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  authProvider?: AuthProvider;
};

export type CreateRefreshTokenInput = {
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
};

export type CreateOtpInput = {
  userId: string;
  code: string;
  type: OtpType;
  expiresAt: Date;
};

// RefreshToken row with joined user (safe projection).
export type RefreshTokenWithUser = RefreshToken & {
  user: UserPublic;
};

// Lookup by email; includes `password` for credential checks.

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

// Lookup by id; excludes `password`.
export async function findUserById(id: string): Promise<UserPublic | null> {
  return prisma.user.findUnique({
    where: { id },
    select: userPublicSelect,
  });
}

// Lookup by id including password (for changePassword / internal checks only).
export async function findUserByIdWithPassword(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

// Insert user; returns created row without `password`.

export async function createUser(data: CreateUserInput): Promise<UserPublic> {
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: data.password,
      authProvider: data.authProvider ?? "EMAIL",
    },
    select: userPublicSelect,
  });
}

// Patch user by id; returns updated scalars without `password`.

export async function updateUserById(
  id: string,
  data: Prisma.UserUpdateInput,
): Promise<UserPublicWithTimestamps> {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      ...userPublicWithGoogleSelect,
      updatedAt: true,
    },
  });
}

// Lookup Google-linked account; includes `password`.

export async function findUserByGoogleId(googleId: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { googleId } });
}


// Persist a hashed refresh token row.

export async function createRefreshToken(
  data: CreateRefreshTokenInput,
): Promise<RefreshToken> {
  return prisma.refreshToken.create({
    data: {
      userId: data.userId,
      token: data.token,
      expiresAt: data.expiresAt,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });
}

// Find session by hashed token; includes user safe fields.

export async function findRefreshToken(
  hashedToken: string,
): Promise<RefreshTokenWithUser | null> {
  return prisma.refreshToken.findUnique({
    where: { token: hashedToken },
    include: {
      user: { select: userPublicSelect },
    },
  });
}

// Remove a single refresh session by hashed token.

export async function deleteRefreshToken(hashedToken: string): Promise<RefreshToken> {
  return prisma.refreshToken.delete({
    where: { token: hashedToken },
  });
}

// Revoke every refresh session for a user (logout all devices).

export async function deleteAllUserRefreshTokens(userId: string): Promise<Prisma.BatchPayload> {
  return prisma.refreshToken.deleteMany({
    where: { userId },
  });
}


// Invalidate prior unused OTPs of the same type, then insert a new code row.

export async function createOtp(data: CreateOtpInput): Promise<Otp> {
  await prisma.otp.updateMany({
    where: {
      userId: data.userId,
      type: data.type,
      isUsed: false,
    },
    data: { isUsed: true },
  });

  return prisma.otp.create({
    data: {
      userId: data.userId,
      code: data.code,
      type: data.type,
      expiresAt: data.expiresAt,
    },
  });
}

// Latest non-expired, unused OTP for user + type.

export async function findValidOtp(
  userId: string,
  type: OtpType,
): Promise<Otp | null> {
  return prisma.otp.findFirst({
    where: {
      userId,
      type,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Mark an OTP consumed after successful verification.

export async function markOtpAsUsed(id: string): Promise<Otp> {
  return prisma.otp.update({
    where: { id },
    data: { isUsed: true },
  });
}
