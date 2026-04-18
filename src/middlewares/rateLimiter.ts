import type { NextFunction, Request, Response } from "express";
import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";

import { config } from "../config/env";
import { getRedisClient } from "../config/redis";
import { RATE_LIMIT_BLOCKED_PREFIX } from "../shared/constants/rateLimit.constants";
import type { AuthenticatedRequest } from "../types";

export async function incrementRateLimitBlocked(bucket: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.incr(`${RATE_LIMIT_BLOCKED_PREFIX}:${bucket}`);
  } catch {
    // ignore
  }
}

function shouldBypass(req: Request): boolean {
  const t = config.RATE_LIMIT_BYPASS_TOKEN;
  if (t === "") return false;
  return req.get("x-bypass-token") === t;
}

function ipKeyFromRequest(req: Request): string {
  return ipKeyGenerator(req.ip ?? "0.0.0.0");
}

function userIdOrIpKey(req: Request): string {
  const id = (req as AuthenticatedRequest).user?.id;
  if (id) return `uid:${id}`;
  return ipKeyFromRequest(req);
}

function redisStore(redisKeyPrefix: string): RedisStore | undefined {
  const redis = getRedisClient();
  if (!redis) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]) => {
      const [command, ...commandArgs] = args;
      if (command === undefined) {
        return Promise.reject(new Error("Redis command required"));
      }
      return redis.call(command, ...commandArgs) as Promise<RedisReply>;
    },
    prefix: `rl:${redisKeyPrefix}:`,
  });
}

type CreateLimiterParams = {
  windowMs: number;
  limit: number;
  message: string;
  redisPrefix: string;
  blockCounterBucket: string;
  keyGenerator: Options["keyGenerator"];
};

function createRateLimiter(params: CreateLimiterParams): ReturnType<typeof rateLimit> {
  const store = redisStore(params.redisPrefix);
  return rateLimit({
    windowMs: params.windowMs,
    limit: params.limit,
    message: params.message,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    ...(store !== undefined ? { store } : {}),
    keyGenerator: params.keyGenerator,
    skip: (req: Request) => shouldBypass(req),
    handler: (
      _req: Request,
      res: Response,
      _next: NextFunction,
      _optionsUsed: unknown,
    ) => {
      void incrementRateLimitBlocked(params.blockCounterBucket);
      const retryAfter = res.getHeader("Retry-After");
      res.status(429).json({
        error: "Too Many Requests",
        message: params.message,
        retryAfter: retryAfter ?? undefined,
      });
    },
  });
}

/** Global API budget — 100 / 15 min / IP */
export const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: "Too many requests. Please try again later.",
  redisPrefix: "global",
  blockCounterBucket: "global",
  keyGenerator: (req) => ipKeyFromRequest(req),
});

/** POST /api/auth/login — 5 / 15 min / IP */
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many login attempts. Please try again later.",
  redisPrefix: "auth:login",
  blockCounterBucket: "auth:login",
  keyGenerator: (req) => ipKeyFromRequest(req),
});

/** POST /api/auth/register — 5 / 15 min / IP */
export const registerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many accounts created. Please try again later.",
  redisPrefix: "auth:register",
  blockCounterBucket: "auth:register",
  keyGenerator: (req) => ipKeyFromRequest(req),
});

function createAuthSensitiveLimiter(
  segment: string,
  message = "Too many requests. Please try again later.",
): ReturnType<typeof rateLimit> {
  return createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message,
    redisPrefix: `auth:${segment}`,
    blockCounterBucket: `auth:${segment}`,
    keyGenerator: (req) => ipKeyFromRequest(req),
  });
}

export const verifyEmailLimiter = createAuthSensitiveLimiter("verify-email");
export const resendOtpLimiter = createAuthSensitiveLimiter("resend-otp");
export const refreshTokenLimiter = createAuthSensitiveLimiter("refresh-token");
export const forgotPasswordLimiter = createAuthSensitiveLimiter("forgot-password");
export const resetPasswordLimiter = createAuthSensitiveLimiter("reset-password");

/**
 * Shared budget for unauthenticated public reads (events + review listings/summary).
 * 100 / 15 min / IP
 */
export const publicReadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: "Too many requests. Please try again later.",
  redisPrefix: "public:read",
  blockCounterBucket: "public:read",
  keyGenerator: (req) => ipKeyFromRequest(req),
});

/** Authenticated routes — 100 / 15 min / user (fallback IP) */
export const authenticatedGeneralLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: "Too many requests. Please slow down.",
  redisPrefix: "user:general",
  blockCounterBucket: "user:general",
  keyGenerator: (req) => userIdOrIpKey(req),
});

/** Authenticated writes — 30 / 15 min / user */
export const authenticatedWriteLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many write operations. Please slow down.",
  redisPrefix: "user:write",
  blockCounterBucket: "user:write",
  keyGenerator: (req) => userIdOrIpKey(req),
});
