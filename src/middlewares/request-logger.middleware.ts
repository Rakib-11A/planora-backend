import { randomUUID } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

import { logger } from "../lib/logger/logger";
import type { AuthenticatedRequest } from "../types";

const SLOW_REQUEST_THRESHOLD_MS = 500;

export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = randomUUID();
  req.requestId = requestId;

  const startNs = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const roundedDurationMs = Math.round(durationMs);
    const userId = (req as AuthenticatedRequest).user?.id;

    const payload = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTimeMs: roundedDurationMs,
      userId: userId ?? null,
    };

    if (roundedDurationMs > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn("Slow request", payload);
      return;
    }

    logger.info("Request completed", payload);
  });

  next();
}
