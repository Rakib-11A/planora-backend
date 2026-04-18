import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../types";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  acceptInvitationService,
  cancelInvitationService,
  declineInvitationService,
  getEventInvitationsService,
  getMyInvitationsService,
  sendInvitationService,
} from "./invitation.service";
import {
  eventIdParamSchema,
  eventInvitationsQuerySchema,
  invitationIdParamSchema,
  inviteBodySchema,
} from "./invitation.validation";

function requireUserId(req: Request): string {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  return userId;
}

export const sendInvitation = asyncHandler(async (req: Request, res: Response) => {
  const inviterId = requireUserId(req);
  const { eventId } = eventIdParamSchema.parse(req.params);
  const { inviteeId } = inviteBodySchema.parse(req.body);
  const result = await sendInvitationService(eventId, inviterId, inviteeId);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const getMyInvitations = asyncHandler(async (req: Request, res: Response) => {
  const inviteeId = requireUserId(req);
  const data = await getMyInvitationsService(inviteeId);
  res.status(200).json(new ApiResponse(200, data, "Invitations fetched successfully"));
});

export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { invitationId } = invitationIdParamSchema.parse(req.params);
  const result = await acceptInvitationService(invitationId, userId);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const declineInvitation = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { invitationId } = invitationIdParamSchema.parse(req.params);
  const result = await declineInvitationService(invitationId, userId);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const cancelInvitation = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { invitationId } = invitationIdParamSchema.parse(req.params);
  const result = await cancelInvitationService(invitationId, userId);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const getEventInvitations = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = requireUserId(req);
  const { eventId } = eventIdParamSchema.parse(req.params);
  const { status } = eventInvitationsQuerySchema.parse(req.query);
  const data = await getEventInvitationsService(eventId, ownerId, status);
  res.status(200).json(new ApiResponse(200, data, "Event invitations fetched successfully"));
});

