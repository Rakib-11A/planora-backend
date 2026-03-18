import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "../types";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Requires authMiddleware first. Allows only listed roles (USER / ADMIN).
 */
export const requireRole = (...roles: ("USER" | "ADMIN")[]) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (user === undefined) {
      throw new ApiError(401, "Unauthorized");
    }
    const role = user.role as "USER" | "ADMIN";
    if (!roles.includes(role)) {
      throw new ApiError(403, "Insufficient permissions");
    }
    next();
  });
