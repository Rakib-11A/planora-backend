import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { cacheMyParticipations } from "../../middlewares/cache.middleware";
import {
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
} from "../../middlewares/rateLimiter";
import {
  approveParticipant,
  cancelParticipation,
  getEventParticipants,
  getMyParticipations,
  joinEvent,
  rejectParticipant,
} from "./participation.controller";

const router = Router();

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

export default router;

