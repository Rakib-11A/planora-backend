import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
} from "../../middlewares/rateLimiter";
import {
  acceptInvitation,
  cancelInvitation,
  declineInvitation,
  getEventInvitations,
  getMyInvitations,
  sendInvitation,
} from "./invitation.controller";

const router = Router();

router.use(authMiddleware, authenticatedGeneralLimiter);

router.post("/events/:eventId/invite", authenticatedWriteLimiter, sendInvitation);
router.get("/me/invitations", getMyInvitations);
router.post("/invitations/:invitationId/accept", authenticatedWriteLimiter, acceptInvitation);
router.post("/invitations/:invitationId/decline", authenticatedWriteLimiter, declineInvitation);
router.post("/invitations/:invitationId/cancel", authenticatedWriteLimiter, cancelInvitation);
router.get("/events/:eventId/invitations", getEventInvitations);

export default router;

