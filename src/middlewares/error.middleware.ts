import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";

import { config } from "../config/env";
import { logger } from "../lib/logger/logger";
import type { AuthenticatedRequest } from "../types";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

// Standard error JSON body returned to clients. 
type ErrorBody = {
  success: false;
  message: string;
  errors?: any[];
  stack?: string;
};

const isDev = (): boolean => config.NODE_ENV === "development";

// Shape Zod issues into a stable list for `errors[]`.
function zodIssuesToErrors(err: ZodError): Array<{ path: string; message: string; code: string }> {
  return err.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
    code: issue.code,
  }));
}

// Global Express error handler: ApiError, Prisma, JWT, Zod, and fallback 500.
export const globalErrorHandler: ErrorRequestHandler = (
  err: unknown,
  req,
  res,
  _next,
): void => {
  const request = req as AuthenticatedRequest;
  const requestInfo = {
    requestId: req.requestId ?? null,
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    userId: request.user?.id ?? null,
  };

  const withStack = (body: ErrorBody): ErrorBody =>
    isDev() && err instanceof Error && err.stack !== undefined
      ? { ...body, stack: err.stack }
      : body;

  // 1) Operational API errors
  if (err instanceof ApiError) {
    logger.warn("Handled ApiError", {
      ...requestInfo,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
    const body: ErrorBody = {
      success: false,
      message: err.message,
      ...(err.errors !== undefined && err.errors.length > 0 ? { errors: err.errors } : {}),
    };
    res.status(err.statusCode).json(withStack(body));
    return;
  }

  // 2) Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error("Prisma client error", {
      ...requestInfo,
      code: err.code,
      message: err.message,
      stack: err.stack,
    });
    if (err.code === "P2002") {
      res.status(409).json(
        withStack({
          success: false,
          message: "Already exists",
        }),
      );
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json(
        withStack({
          success: false,
          message: "Record not found",
        }),
      );
      return;
    }
  }

  // 3) JWT
  if (err instanceof TokenExpiredError) {
    logger.warn("Token expired", {
      ...requestInfo,
      message: err.message,
    });
    res.status(401).json(
      withStack({
        success: false,
        message: "Token expired",
      }),
    );
    return;
  }
  if (err instanceof JsonWebTokenError) {
    logger.warn("Invalid token", {
      ...requestInfo,
      message: err.message,
    });
    res.status(401).json(
      withStack({
        success: false,
        message: "Invalid token",
      }),
    );
    return;
  }

  // 4) Zod validation — use ApiResponse for typed envelope, map to wire format
  if (err instanceof ZodError) {
    logger.warn("Validation error", {
      ...requestInfo,
      issues: zodIssuesToErrors(err),
    });
    const issues = zodIssuesToErrors(err);
    const envelope = new ApiResponse(400, issues, "Validation failed");
    res.status(400).json(
      withStack({
        success: false,
        message: envelope.message,
        errors: envelope.data as any[],
      }),
    );
    return;
  }

  // 5) Generic / unexpected — fixed client message; stack only in development
  logger.error("Unhandled error", {
    ...requestInfo,
    message: err instanceof Error ? err.message : "Unknown error",
    stack: err instanceof Error ? err.stack : undefined,
  });
  res.status(500).json(
    withStack({
      success: false,
      message: "Internal server error",
    }),
  );
};
