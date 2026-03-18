import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";

import { globalErrorHandler } from "./middlewares/error.middleware";
import { notFoundHandler } from "./middlewares/notFound.middleware";

export function createApp(): Application {
  const app: Application = express();

  // Section: Security headers (Helmet)
  // Sets sensible defaults: X-Content-Type-Options, frameguard, etc.

  app.use(helmet());

  // Section: Cross-Origin Resource Sharing (CORS)
  // Restricts browser requests to FRONTEND_URL; credentials for cookies/auth headers.

  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  app.use(
    cors({
      origin: frontendUrl,
      credentials: true,
    }),
  );

  // Section: Body parsing
  // express.json() for JSON bodies; urlencoded for form posts.

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Section: Root — browser-friendly API landing (avoids "Cannot GET /")
  app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({
      service: "planora-backend",
      message: "API is running",
      health: "/health",
    });
  });

  // Section: Routes — health (liveness for load balancers / ops)
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", service: "planora-backend" });
  });

  // Unknown routes → 404 (must be after all route definitions)
  app.use(notFoundHandler);

  // Central error handler (must be last; 4-arg handler)
  app.use(globalErrorHandler);

  return app;
}
