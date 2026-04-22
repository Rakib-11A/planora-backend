import type { RequestHandler } from "express";

// Catches requests that did not match any registered route 
 
export const notFoundHandler: RequestHandler = (req, res): void => {
  const path = req.originalUrl ?? req.url;
  res.status(404).json({
    success: false,
    message: `Route ${path} not found`,
  });
};
