import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { cacheMyParticipations } from "../../middlewares/cache.middleware";
import {
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
} from "../../middlewares/rateLimiter";
import {
  approveParticipant,
  banParticipant,
  cancelParticipation,
  getEventParticipants,
  getMyParticipations,
  joinEvent,
  rejectParticipant,
} from "./participation.controller";

const router = Router();

/**
 * @openapi
 * /api/events/{eventId}/join:
 *   post:
 *     tags: [Participation]
 *     summary: Join an event
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
 *         description: Join request created
 * /api/events/{eventId}/cancel:
 *   post:
 *     tags: [Participation]
 *     summary: Cancel participation request
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
 *         description: Participation cancelled
 * /api/me/participations:
 *   get:
 *     tags: [Participation]
 *     summary: Get my participations
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
 *         description: Participation list fetched
 * /api/events/{eventId}/participants:
 *   get:
 *     tags: [Participation]
 *     summary: Get participants for an event
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *     responses:
 *       200:
 *         description: Event participants fetched
 * /api/events/{eventId}/participants/{userId}/approve:
 *   patch:
 *     tags: [Participation]
 *     summary: Approve participant
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Participant approved
 * /api/events/{eventId}/participants/{userId}/reject:
 *   patch:
 *     tags: [Participation]
 *     summary: Reject participant
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Participant rejected
 */

router.use(authMiddleware, authenticatedGeneralLimiter);

router.post("/events/:eventId/join", authenticatedWriteLimiter, joinEvent);
router.post("/events/:eventId/cancel", authenticatedWriteLimiter, cancelParticipation);
router.get("/me/participations", cacheMyParticipations, getMyParticipations);
router.get("/events/:eventId/participants", getEventParticipants);
router.patch(
  "/events/:eventId/participants/:userId/approve",
  authenticatedWriteLimiter,
  approveParticipant,
);
router.patch(
  "/events/:eventId/participants/:userId/reject",
  authenticatedWriteLimiter,
  rejectParticipant,
);
router.patch(
  "/events/:eventId/participants/:userId/ban",
  authenticatedWriteLimiter,
  banParticipant,
);

export default router;

