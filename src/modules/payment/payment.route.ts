import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  getMyPayments,
  initiatePayment,
  verifyPayment,
} from "./payment.controller";

const router = Router();

router.post("/events/:eventId/pay", authMiddleware, initiatePayment);
router.post("/payments/:paymentId/verify", authMiddleware, verifyPayment);
router.get("/me/payments", authMiddleware, getMyPayments);

export default router;

