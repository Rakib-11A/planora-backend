import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  acceptInvitation,
  cancelInvitation,
  declineInvitation,
  getEventInvitations,
  getMyInvitations,
  sendInvitation,
} from "./invitation.controller";

const router = Router();

router.post("/events/:eventId/invite", authMiddleware, sendInvitation);
router.get("/me/invitations", authMiddleware, getMyInvitations);
router.post("/invitations/:invitationId/accept", authMiddleware, acceptInvitation);
router.post("/invitations/:invitationId/decline", authMiddleware, declineInvitation);
router.post("/invitations/:invitationId/cancel", authMiddleware, cancelInvitation);
router.get("/events/:eventId/invitations", authMiddleware, getEventInvitations);

export default router;

