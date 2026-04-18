import type { Request, Response } from "express";

import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  banUserService,
  deleteEventService,
  deleteReviewService,
  getAllEventsService,
  getAllReviewsService,
  getAllUsersService,
  getCacheStatsService,
  getRateLimitStatsService,
  unbanUserService,
} from "./admin.service";
import {
  adminEventsQuerySchema,
  adminReviewsQuerySchema,
  adminUsersQuerySchema,
  eventIdParamSchema,
  reviewIdParamSchema,
  userIdParamSchema,
} from "./admin.validation";

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = adminUsersQuerySchema.parse(req.query);
  const data = await getAllUsersService(query);
  res.status(200).json(new ApiResponse(200, data, "Users fetched successfully"));
});

export const banUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const result = await banUserService(userId);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const unbanUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const result = await unbanUserService(userId);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const getAllEvents = asyncHandler(async (req: Request, res: Response) => {
  const query = adminEventsQuerySchema.parse(req.query);
  const data = await getAllEventsService(query);
  res.status(200).json(new ApiResponse(200, data, "Events fetched successfully"));
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = eventIdParamSchema.parse(req.params);
  const result = await deleteEventService(eventId);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const getAllReviews = asyncHandler(async (req: Request, res: Response) => {
  const query = adminReviewsQuerySchema.parse(req.query);
  const data = await getAllReviewsService(query);
  res.status(200).json(new ApiResponse(200, data, "Reviews fetched successfully"));
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = reviewIdParamSchema.parse(req.params);
  const result = await deleteReviewService(reviewId);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const getCacheStats = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getCacheStatsService();
  res.status(200).json(new ApiResponse(200, data, "Cache stats"));
});

export const getRateLimitStats = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getRateLimitStatsService();
  res.status(200).json(new ApiResponse(200, data, "Rate limit stats"));
});

