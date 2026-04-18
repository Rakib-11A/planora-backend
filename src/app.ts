import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { config } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { globalLimiter } from "./middlewares/rate-limit.middleware";
import { requestLoggerMiddleware } from "./middlewares/request-logger.middleware";
import { responseTimeMiddleware } from "./middlewares/responseTime.middleware";
import { inputSanitizationMiddleware } from "./middlewares/security.middleware";
import authRouter from "./modules/auth/auth.routes";
import adminRouter from "./modules/admin/admin.route";
import eventRouter from "./modules/event/event.route";
import invitationRouter from "./modules/invitation/invitation.route";
import paymentRouter from "./modules/payment/payment.route";
import participationRouter from "./modules/participation/participation.route";
import reviewRouter from "./modules/review/review.route";
import notificationRouter from "./modules/notification/notification.route";
import { globalErrorHandler } from "./middlewares/error.middleware";
import { notFoundHandler } from "./middlewares/notFound.middleware";

export function createApp(): Application {
  const app: Application = express();
  app.disable("x-powered-by");

  // Trust first proxy hop (X-Forwarded-For) for req.ip in login/register metadata
  app.set("trust proxy", 1);

  app.use(requestLoggerMiddleware);
  app.use(responseTimeMiddleware);

  app.use(
    compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );

  // Section: Security headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      xFrameOptions: { action: "deny" },
      xXssProtection: true,
    }),
  );

  // Section: Cross-Origin Resource Sharing (CORS)
  app.use(
    cors({
      origin: config.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // Section: Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(inputSanitizationMiddleware);

  // Cookies must be parsed before any route that reads req.cookies
  app.use(cookieParser());
  app.use(globalLimiter);

  // Section: Root & health
  app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({
      service: "planora-backend",
      message: "API is running",
      health: "/health",
    });
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", service: "planora-backend" });
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/docs.json", (_req: Request, res: Response) => {
    res.status(200).json(swaggerSpec);
  });

  // Section: API routes
  app.use("/api/auth", authRouter);
  app.use("/api", adminRouter);
  app.use("/api/events", eventRouter);
  app.use("/api", invitationRouter);
  app.use("/api", participationRouter);
  app.use("/api", paymentRouter);
  app.use("/api", reviewRouter);
  app.use("/api", notificationRouter);

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
