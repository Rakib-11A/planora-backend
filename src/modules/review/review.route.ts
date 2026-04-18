import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  createReview,
  deleteReview,
  getEventReviews,
  getEventReviewSummary,
  updateReview,
} from "./review.controller";

const router = Router();

router.post("/events/:eventId/reviews", authMiddleware, createReview);
router.patch("/events/:eventId/reviews", authMiddleware, updateReview);
router.delete("/events/:eventId/reviews", authMiddleware, deleteReview);
router.get("/events/:eventId/reviews", getEventReviews);
router.get("/events/:eventId/reviews/summary", getEventReviewSummary);

export default router;

