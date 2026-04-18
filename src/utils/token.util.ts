import { createHash } from "node:crypto";

import jwt, { type SignOptions } from "jsonwebtoken";

import { config } from "../config/env";
import type { JwtPayload } from "../types";

const accessSignOpts: SignOptions = {
  expiresIn: config.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
};

const refreshSignOpts: SignOptions = {
  expiresIn: config.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
};

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, accessSignOpts);
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, refreshSignOpts);
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
  if (typeof decoded === "string") {
    throw new Error("Invalid access token payload");
  }
  return decoded as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET);
  if (typeof decoded === "string") {
    throw new Error("Invalid refresh token payload");
  }
  return decoded as JwtPayload;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}
