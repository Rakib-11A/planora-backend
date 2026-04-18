import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  approveParticipant,
  cancelParticipation,
  getEventParticipants,
  getMyParticipations,
  joinEvent,
  rejectParticipant,
} from "./participation.controller";

const router = Router();

router.post("/events/:eventId/join", authMiddleware, joinEvent);
router.post("/events/:eventId/cancel", authMiddleware, cancelParticipation);
router.get("/me/participations", authMiddleware, getMyParticipations);
router.get("/events/:eventId/participants", authMiddleware, getEventParticipants);
router.patch(
  "/events/:eventId/participants/:userId/approve",
  authMiddleware,
  approveParticipant,
);
router.patch(
  "/events/:eventId/participants/:userId/reject",
  authMiddleware,
  rejectParticipant,
);

export default router;

