import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../types";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createEventService,
  deleteEventService,
  getAllEventsService,
  getSingleEventService,
  updateEventService,
} from "./event.service";
import {
  createEventSchema,
  eventIdParamSchema,
  getEventsQuerySchema,
  updateEventSchema,
} from "./event.validation";

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const body = createEventSchema.parse(req.body);
  const event = await createEventService(body, userId);
  res.status(201).json(new ApiResponse(201, event, "Event created successfully"));
});

export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const query = getEventsQuerySchema.parse(req.query);
  const data = await getAllEventsService(query);
  res.status(200).json(new ApiResponse(200, data, "Events fetched successfully"));
});

export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = eventIdParamSchema.parse(req.params);
  const requesterId = (req as AuthenticatedRequest).user?.id;
  const event = await getSingleEventService(id, requesterId);
  res.status(200).json(new ApiResponse(200, event, "Event fetched successfully"));
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { id } = eventIdParamSchema.parse(req.params);
  const body = updateEventSchema.parse(req.body);
  const event = await updateEventService(id, userId, body);
  res.status(200).json(new ApiResponse(200, event, "Event updated successfully"));
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { id } = eventIdParamSchema.parse(req.params);
  const result = await deleteEventService(id, userId, authReq.user?.role);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

