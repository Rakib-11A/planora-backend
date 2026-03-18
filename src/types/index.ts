import type { Request } from "express";

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
}

/** Populated by auth middleware after access-token + DB checks. */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
  };
}
