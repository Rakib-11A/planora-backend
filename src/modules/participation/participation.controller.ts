import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../types";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  approveParticipantService,
  cancelParticipationService,
  getEventParticipantsService,
  getMyParticipationsService,
  joinEventService,
  rejectParticipantService,
} from "./participation.service";
import {
  eventIdParamSchema,
  myParticipationsQuerySchema,
  participantParamSchema,
  participantsQuerySchema,
} from "./participation.validation";

function requireUserId(req: Request): string {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  return userId;
}

export const joinEvent = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { eventId } = eventIdParamSchema.parse(req.params);
  const result = await joinEventService(eventId, userId);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const cancelParticipation = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { eventId } = eventIdParamSchema.parse(req.params);
    const result = await cancelParticipationService(eventId, userId);
    res.status(200).json(new ApiResponse(200, result, result.message));
  },
);

export const getMyParticipations = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { page, limit } = myParticipationsQuerySchema.parse(req.query);
    const data = await getMyParticipationsService(userId, page, limit);
    res
      .status(200)
      .json(new ApiResponse(200, data, "Participations fetched successfully"));
  },
);

export const getEventParticipants = asyncHandler(
  async (req: Request, res: Response) => {
    const ownerId = requireUserId(req);
    const { eventId } = eventIdParamSchema.parse(req.params);
    const { status } = participantsQuerySchema.parse(req.query);
    const data = await getEventParticipantsService(eventId, ownerId, status);
    res
      .status(200)
      .json(new ApiResponse(200, data, "Participants fetched successfully"));
  },
);

export const approveParticipant = asyncHandler(
  async (req: Request, res: Response) => {
    const ownerId = requireUserId(req);
    const { eventId, userId } = participantParamSchema.parse(req.params);
    const result = await approveParticipantService(eventId, ownerId, userId);
    res.status(200).json(new ApiResponse(200, result, result.message));
  },
);

export const rejectParticipant = asyncHandler(
  async (req: Request, res: Response) => {
    const ownerId = requireUserId(req);
    const { eventId, userId } = participantParamSchema.parse(req.params);
    const result = await rejectParticipantService(eventId, ownerId, userId);
    res.status(200).json(new ApiResponse(200, result, result.message));
  },
);

