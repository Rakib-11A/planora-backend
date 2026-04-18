import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
} from "../../middlewares/rateLimiter";
import {
  getMyPayments,
  initiatePayment,
  verifyPayment,
} from "./payment.controller";

const router = Router();

router.use(authMiddleware, authenticatedGeneralLimiter);

router.post("/events/:eventId/pay", authenticatedWriteLimiter, initiatePayment);
router.post("/payments/:paymentId/verify", authenticatedWriteLimiter, verifyPayment);
router.get("/me/payments", getMyPayments);

export default router;

