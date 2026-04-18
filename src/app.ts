import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";

import authRouter from "./modules/auth/auth.routes";
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

  // Trust first proxy hop (X-Forwarded-For) for req.ip in login/register metadata
  app.set("trust proxy", 1);

  // Section: Security headers (Helmet)
  app.use(helmet());

  // Section: Cross-Origin Resource Sharing (CORS)
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  app.use(
    cors({
      origin: frontendUrl,
      credentials: true,
    }),
  );

  // Section: Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Cookies must be parsed before any route that reads req.cookies
  app.use(cookieParser());

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

  // Section: API routes
  app.use("/api/auth", authRouter);
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
