import type { NextFunction, Request, Response } from "express";

export function responseTimeMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();
  const originalEnd = res.end.bind(res);

  res.end = ((...args: unknown[]) => {
    const duration = Date.now() - startTime;
    if (!res.headersSent) {
      res.setHeader("X-Response-Time", `${duration}ms`);
    }
    return originalEnd(...(args as []));
  }) as Response["end"];

  next();
}
