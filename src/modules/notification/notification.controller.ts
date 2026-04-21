import type { Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../../types";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  NOTIFICATION_TYPE_LIST,
  setNotificationPreferences,
} from "./notification.preferences";
import {
  getMyNotificationsService,
  markAllNotificationsReadService,
  markNotificationReadService,
} from "./notification.service";

const notificationIdParamSchema = z.object({
  id: z.string().cuid({ message: "Invalid notification id" }),
});

const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const notificationTypeEnum = z.enum(
  NOTIFICATION_TYPE_LIST as [string, ...string[]],
);

const updatePreferencesSchema = z
  .object({
    emailEnabled: z.boolean().optional(),
    mutedTypes: z.array(notificationTypeEnum).max(50).optional(),
  })
  .strict();

function requireUserId(req: Request): string {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }
  return userId;
}

export const getMyNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const query = notificationQuerySchema.parse(req.query);
    const data = await getMyNotificationsService(userId, query);
    res
      .status(200)
      .json(new ApiResponse(200, data, "Notifications fetched successfully"));
  },
);

export const markNotificationRead = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { id } = notificationIdParamSchema.parse(req.params);
    const result = await markNotificationReadService(id, userId);
    res.status(200).json(new ApiResponse(200, result, result.message));
  },
);

export const markAllNotificationsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const result = await markAllNotificationsReadService(userId);
    res.status(200).json(new ApiResponse(200, result, result.message));
  },
);

export const getMyNotificationPreferences = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const prefs = await getNotificationPreferences(userId);
    res.status(200).json(
      new ApiResponse(
        200,
        { preferences: prefs, availableTypes: NOTIFICATION_TYPE_LIST, defaults: DEFAULT_NOTIFICATION_PREFERENCES },
        "Notification preferences fetched",
      ),
    );
  },
);

export const updateMyNotificationPreferences = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const patch = updatePreferencesSchema.parse(req.body);
    const current = await getNotificationPreferences(userId);
    const next = await setNotificationPreferences(userId, {
      emailEnabled: patch.emailEnabled ?? current.emailEnabled,
      mutedTypes: (patch.mutedTypes ?? current.mutedTypes) as typeof current.mutedTypes,
    });
    res
      .status(200)
      .json(new ApiResponse(200, { preferences: next }, "Notification preferences updated"));
  },
);

