import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.controller";

const router = Router();

router.get("/me/notifications", authMiddleware, getMyNotifications);
router.patch("/notifications/:id/read", authMiddleware, markNotificationRead);
router.patch("/notifications/read-all", authMiddleware, markAllNotificationsRead);

export default router;

