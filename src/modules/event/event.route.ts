import { Router } from "express";

import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../../middlewares/auth.middleware";
import {
  cacheEventsDetail,
  cacheEventsList,
} from "../../middlewares/cache.middleware";
import {
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
  publicReadLimiter,
} from "../../middlewares/rateLimiter";
import {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  updateEvent,
} from "./event.controller";

const router = Router();

/**
 * @openapi
 * /api/events:
 *   get:
 *     tags: [Event]
 *     summary: List events
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isPaid
 *         schema:
 *           type: boolean
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
 *         description: Events fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponseEnvelope'
 *   post:
 *     tags: [Event]
 *     summary: Create event
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventCreateRequest'
 *     responses:
 *       201:
 *         description: Event created
 *       401:
 *         description: Unauthorized
 * /api/events/{id}:
 *   get:
 *     tags: [Event]
 *     summary: Get event by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details fetched
 *   patch:
 *     tags: [Event]
 *     summary: Update event
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventUpdateRequest'
 *     responses:
 *       200:
 *         description: Event updated
 *   delete:
 *     tags: [Event]
 *     summary: Delete event
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted
 */

// Public browsing
router.get("/", publicReadLimiter, cacheEventsList, getEvents);
router.get(
  "/:id",
  publicReadLimiter,
  optionalAuthMiddleware,
  cacheEventsDetail,
  getEventById,
);

// Authenticated actions
router.post(
  "/",
  authMiddleware,
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
  createEvent,
);
router.patch(
  "/:id",
  authMiddleware,
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
  updateEvent,
);
router.delete(
  "/:id",
  authMiddleware,
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
  deleteEvent,
);

export default router;

