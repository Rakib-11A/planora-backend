import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/ApiError";

type JsonLike = Record<string, unknown> | unknown[] | string | number | boolean | null;

const DISALLOWED_KEY_PATTERN = /^(\$|__proto__$|prototype$|constructor$)/i;
const SCRIPT_TAG_PATTERN = /<\s*script\b/i;

export type ClientMetadata = {
  ip?: string;
  userAgent?: string;
};

export function getClientMetadata(req: Request): ClientMetadata {
  return {
    ip: req.ip ?? req.socket.remoteAddress ?? undefined,
    userAgent: req.get("user-agent") ?? undefined,
  };
}

function sanitizeValue(value: JsonLike): JsonLike {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item as JsonLike));
  }

  if (value !== null && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [rawKey, rawVal] of Object.entries(value as Record<string, unknown>)) {
      if (DISALLOWED_KEY_PATTERN.test(rawKey) || rawKey.includes(".")) {
        throw new ApiError(400, "Invalid input payload");
      }
      output[rawKey] = sanitizeValue(rawVal as JsonLike);
    }
    return output;
  }

  if (typeof value === "string") {
    const sanitized = value.replace(/\0/g, "").trim();
    if (SCRIPT_TAG_PATTERN.test(sanitized)) {
      throw new ApiError(400, "Invalid input payload");
    }
    return sanitized;
  }

  return value;
}

export function inputSanitizationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.body = sanitizeValue(req.body as JsonLike) as Request["body"];
  req.query = sanitizeValue(req.query as unknown as JsonLike) as Request["query"];
  req.params = sanitizeValue(req.params as unknown as JsonLike) as Request["params"];
  next();
}
