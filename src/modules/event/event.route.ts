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

