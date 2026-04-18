import type { NextFunction, Request, Response } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import { findUserById } from "../modules/auth/auth.repository";
import type { AuthenticatedRequest, JwtPayload } from "../types";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyAccessToken } from "../utils/token.util";

/**
 * Validates Bearer access token (refresh stays in httpOnly cookie only).
 * Loads current user from DB so deactivated accounts are rejected immediately.
 */
export const authMiddleware = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.get("authorization");
    if (header === undefined || !header.startsWith("Bearer ")) {
      throw new ApiError(401, "Access token required");
    }
    const token = header.slice("Bearer ".length).trim();
    if (token === "") {
      throw new ApiError(401, "Access token required");
    }

    let payload: JwtPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new ApiError(401, "Access token expired. Please refresh.");
      }
      if (err instanceof JsonWebTokenError) {
        throw new ApiError(401, "Invalid access token");
      }
      throw err;
    }

    const userId = payload.sub;
    const user = await findUserById(userId);
    if (user === null) {
      throw new ApiError(401, "User no longer exists");
    }
    if (!user.isActive) {
      throw new ApiError(403, "Account has been deactivated");
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };
    next();
  },
);

/**
 * Optional auth for mixed-access routes.
 * If Bearer token exists and is valid, attaches req.user; otherwise leaves req.user undefined.
 */
export const optionalAuthMiddleware = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.get("authorization");
    if (header === undefined || header.trim() === "") {
      next();
      return;
    }
    if (!header.startsWith("Bearer ")) {
      throw new ApiError(401, "Invalid access token");
    }
    const token = header.slice("Bearer ".length).trim();
    if (token === "") {
      throw new ApiError(401, "Invalid access token");
    }

    let payload: JwtPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new ApiError(401, "Access token expired. Please refresh.");
      }
      if (err instanceof JsonWebTokenError) {
        throw new ApiError(401, "Invalid access token");
      }
      throw err;
    }

    const user = await findUserById(payload.sub);
    if (user !== null && user.isActive) {
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      };
    }

    next();
  },
);
