import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { cacheMyNotifications } from "../../middlewares/cache.middleware";
import {
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
} from "../../middlewares/rateLimiter";
import {
  getMyNotificationPreferences,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateMyNotificationPreferences,
} from "./notification.controller";

const router = Router();

router.use(authMiddleware, authenticatedGeneralLimiter);

router.get("/me/notifications", cacheMyNotifications, getMyNotifications);
router.patch("/notifications/:id/read", authenticatedWriteLimiter, markNotificationRead);
router.patch("/notifications/read-all", authenticatedWriteLimiter, markAllNotificationsRead);

// Settings → Notifications: per-user delivery preferences.
router.get("/me/notification-preferences", getMyNotificationPreferences);
router.patch(
  "/me/notification-preferences",
  authenticatedWriteLimiter,
  updateMyNotificationPreferences,
);

export default router;

