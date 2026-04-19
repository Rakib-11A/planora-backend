import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import {
  banUser,
  deleteEvent,
  deleteReview,
  getAllEvents,
  getAllReviews,
  getAllUsers,
  getCacheStats,
  getRateLimitStats,
  unbanUser,
} from "./admin.controller";

/**
 * Admin API lives under `/api/admin/*`.
 * Auth must apply only to this subtree — not to the whole `/api` mount — otherwise
 * public routes like `GET /api/events` would hit `authMiddleware` first and return 401.
 */
const router = Router();
const adminRoutes = Router();
adminRoutes.use(authMiddleware, requireRole("ADMIN"));

adminRoutes.get("/users", getAllUsers);
adminRoutes.patch("/users/:userId/ban", banUser);
adminRoutes.patch("/users/:userId/unban", unbanUser);

adminRoutes.get("/events", getAllEvents);
adminRoutes.delete("/events/:eventId", deleteEvent);

adminRoutes.get("/reviews", getAllReviews);
adminRoutes.delete("/reviews/:reviewId", deleteReview);

adminRoutes.get("/cache/stats", getCacheStats);

adminRoutes.get("/rate-limits", getRateLimitStats);

router.use("/admin", adminRoutes);

export default router;

