import { createHash } from "node:crypto";

import jwt, { type SignOptions, type VerifyOptions } from "jsonwebtoken";

import { config } from "../config/env";
import type { JwtPayload } from "../types";

const accessSignOpts: SignOptions = {
  expiresIn: config.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
};

const refreshSignOpts: SignOptions = {
  expiresIn: config.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
};

/** Tolerate small clock drift between app servers and clients (seconds). */
const JWT_VERIFY_OPTIONS: VerifyOptions = {
  clockTolerance: 60,
};

/**
 * Parse JWT-style duration strings (`15m`, `7d`, `24h`, `3600` seconds as plain number)
 * into milliseconds for DB `expiresAt` and refresh-cookie `maxAge`.
 */
export function parseDurationToMilliseconds(spec: string): number {
  const s = spec.trim();
  if (s === "") {
    return 7 * 24 * 60 * 60 * 1000;
  }
  if (/^\d+(\.\d+)?$/.test(s)) {
    const seconds = Number(s);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return 7 * 24 * 60 * 60 * 1000;
    }
    return Math.floor(seconds * 1000);
  }
  const m = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)$/i.exec(s);
  if (m === null || m[1] === undefined || m[2] === undefined) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 7 * 86_400_000,
  };
  const base = mult[unit];
  if (base === undefined || !Number.isFinite(n) || n <= 0) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  return Math.floor(n * base);
}

export function getRefreshDurationMs(): number {
  return parseDurationToMilliseconds(config.JWT_REFRESH_EXPIRES_IN);
}

/** Cookie `maxAge` for refresh token — aligned with JWT refresh TTL. */
export function getRefreshCookieMaxAgeMs(): number {
  return getRefreshDurationMs();
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, accessSignOpts);
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, refreshSignOpts);
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, JWT_VERIFY_OPTIONS);
  if (typeof decoded === "string") {
    throw new Error("Invalid access token payload");
  }
  return decoded as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET, JWT_VERIFY_OPTIONS);
  if (typeof decoded === "string") {
    throw new Error("Invalid refresh token payload");
  }
  return decoded as JwtPayload;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** DB `expiresAt` for a new refresh session — aligned with `JWT_REFRESH_EXPIRES_IN`. */
export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + getRefreshDurationMs());
}
