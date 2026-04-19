import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../types";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createReviewService,
  deleteReviewService,
  getEventReviewsService,
  getEventReviewSummaryService,
  getMyReviewsService,
  updateReviewService,
} from "./review.service";
import {
  createReviewSchema,
  eventReviewsQuerySchema,
  eventIdParamSchema,
  myReviewsQuerySchema,
  updateReviewSchema,
} from "./review.validation";

function requireUserId(req: Request): string {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }
  return userId;
}

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { eventId } = eventIdParamSchema.parse(req.params);
  const body = createReviewSchema.parse(req.body);
  const result = await createReviewService(eventId, userId, body);
  res.status(201).json(new ApiResponse(201, result, result.message));
});

export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { eventId } = eventIdParamSchema.parse(req.params);
  const body = updateReviewSchema.parse(req.body);
  const result = await updateReviewService(eventId, userId, body);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { eventId } = eventIdParamSchema.parse(req.params);
  const result = await deleteReviewService(eventId, userId);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const getEventReviews = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = eventIdParamSchema.parse(req.params);
  const { page, limit } = eventReviewsQuerySchema.parse(req.query);
  const result = await getEventReviewsService(eventId, page, limit);
  res.status(200).json(new ApiResponse(200, result, "Event reviews fetched successfully"));
});

export const getEventReviewSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const { eventId } = eventIdParamSchema.parse(req.params);
    const result = await getEventReviewSummaryService(eventId);
    res
      .status(200)
      .json(new ApiResponse(200, result, "Event rating summary fetched successfully"));
  },
);

export const getMyReviews = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const query = myReviewsQuerySchema.parse(req.query);
  const result = await getMyReviewsService(userId, query);
  res.status(200).json(new ApiResponse(200, result, "Your reviews fetched successfully"));
});

