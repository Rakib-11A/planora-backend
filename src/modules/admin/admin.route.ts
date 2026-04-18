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

const router = Router();

router.use(authMiddleware, requireRole("ADMIN"));

router.get("/admin/users", getAllUsers);
router.patch("/admin/users/:userId/ban", banUser);
router.patch("/admin/users/:userId/unban", unbanUser);

router.get("/admin/events", getAllEvents);
router.delete("/admin/events/:eventId", deleteEvent);

router.get("/admin/reviews", getAllReviews);
router.delete("/admin/reviews/:reviewId", deleteReview);

router.get("/admin/cache/stats", getCacheStats);

router.get("/admin/rate-limits", getRateLimitStats);

export default router;

