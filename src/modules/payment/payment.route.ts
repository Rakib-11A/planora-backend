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

/**
 * @openapi
 * /api/events/{eventId}/pay:
 *   post:
 *     tags: [Payment]
 *     summary: Initiate payment for an event
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment initiated
 *       400:
 *         description: Invalid request
 * /api/payments/{paymentId}/verify:
 *   post:
 *     tags: [Payment]
 *     summary: Verify payment status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment verified
 * /api/me/payments:
 *   get:
 *     tags: [Payment]
 *     summary: Get current user's payments
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Payments list fetched
 */

router.use(authMiddleware, authenticatedGeneralLimiter);

router.post("/events/:eventId/pay", authenticatedWriteLimiter, initiatePayment);
router.post("/payments/:paymentId/verify", authenticatedWriteLimiter, verifyPayment);
router.get("/me/payments", getMyPayments);

export default router;

