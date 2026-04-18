import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { cacheMyNotifications } from "../../middlewares/cache.middleware";
import {
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
} from "../../middlewares/rateLimiter";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.controller";

const router = Router();

router.use(authMiddleware, authenticatedGeneralLimiter);

router.get("/me/notifications", cacheMyNotifications, getMyNotifications);
router.patch("/notifications/:id/read", authenticatedWriteLimiter, markNotificationRead);
router.patch("/notifications/read-all", authenticatedWriteLimiter, markAllNotificationsRead);

export default router;

