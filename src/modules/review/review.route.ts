import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { cacheReviewSummary } from "../../middlewares/cache.middleware";
import {
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
  publicReadLimiter,
} from "../../middlewares/rateLimiter";
import {
  createReview,
  deleteReview,
  getEventReviews,
  getEventReviewSummary,
  updateReview,
} from "./review.controller";

const router = Router();

router.post(
  "/events/:eventId/reviews",
  authMiddleware,
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
  createReview,
);
router.patch(
  "/events/:eventId/reviews",
  authMiddleware,
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
  updateReview,
);
router.delete(
  "/events/:eventId/reviews",
  authMiddleware,
  authenticatedGeneralLimiter,
  authenticatedWriteLimiter,
  deleteReview,
);
router.get("/events/:eventId/reviews", publicReadLimiter, getEventReviews);
router.get(
  "/events/:eventId/reviews/summary",
  publicReadLimiter,
  cacheReviewSummary,
  getEventReviewSummary,
);

export default router;

