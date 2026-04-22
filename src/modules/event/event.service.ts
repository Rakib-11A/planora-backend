import type { Event } from "@prisma/client";

import { ApiError } from "../../utils/ApiError";
import { findUserById } from "../auth/auth.repository";
import {
  createEvent,
  deleteEventById,
  findEventById,
  listEvents,
  listEventsByCreator,
  updateEventById,
} from "./event.repository";
import type {
  EventQuery,
  EventSafe,
  EventTypeLabel,
  EventWithType,
} from "./event.types";
import type { CreateEventInput, UpdateEventInput } from "./event.validation";
import {
  invalidateEventAndReviewCaches,
  invalidateEventListCaches,
} from "../../shared/utils/cache";
import { clearFeaturedIfMatchesEventId, getFeaturedEventId } from "../site/site-settings.repository";

function toNumberFee(fee: Event["fee"]): number {
  return typeof fee === "number" ? fee : Number(fee.toString());
}

function getEventType(isPublic: boolean, isPaid: boolean): EventTypeLabel {
  if (isPublic && isPaid) return "PUBLIC_PAID";
  if (isPublic && !isPaid) return "PUBLIC_FREE";
  if (!isPublic && isPaid) return "PRIVATE_PAID";
  return "PRIVATE_FREE";
}

export function toEventWithType(event: EventSafe): EventWithType {
  return {
    ...event,
    eventType: getEventType(event.isPublic, event.isPaid),
  };
}

function withEventType(event: EventSafe): EventWithType {
  return toEventWithType(event);
}

function validateFeeRule(isPaid: boolean, fee: number): void {
  if (!isPaid && fee !== 0) {
    throw new ApiError(400, "fee must be 0 when isPaid is false");
  }
  if (isPaid && fee <= 0) {
    throw new ApiError(400, "fee must be greater than 0 when isPaid is true");
  }
}

export async function createEventService(
  input: CreateEventInput,
  createdById: string,
): Promise<EventWithType> {
  const user = await findUserById(createdById);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.isBanned) {
    throw new ApiError(403, "Banned users cannot create events");
  }

  if (input.dateTime <= new Date()) {
    throw new ApiError(400, "dateTime must be in the future");
  }
  validateFeeRule(input.isPaid, input.fee);

  const event = await createEvent({
    title: input.title,
    description: input.description,
    dateTime: input.dateTime,
    venue: input.venue,
    isPublic: input.isPublic,
    isPaid: input.isPaid,
    fee: input.fee,
    createdById,
  });

  void invalidateEventListCaches();

  return withEventType(event);
}

export async function getAllEventsService(
  query: EventQuery & { requesterId?: string },
): Promise<{
  items: EventWithType[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  if (query.isPublic === false && !query.requesterId) {
    throw new ApiError(401, "Sign in to browse private events");
  }
  const { items, total } = await listEvents({
    ...query,
    requesterId: query.requesterId,
  });
  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  return {
    items: items.map((event) => withEventType(event)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}

/** Public homepage featured event: must exist, be public, and not be soft-deleted. */
export async function getFeaturedEventForHome(): Promise<EventWithType | null> {
  const featuredId = await getFeaturedEventId();
  if (!featuredId) {
    return null;
  }
  const event = await findEventById(featuredId);
  if (!event || !event.isPublic) {
    return null;
  }
  return withEventType(event);
}

export async function getMyEventsService(
  userId: string,
  page: number,
  limit: number,
): Promise<{
  items: EventWithType[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { items, total } = await listEventsByCreator(userId, page, limit);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items: items.map((event) => withEventType(event)),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getSingleEventService(
  id: string,
  requesterId?: string,
): Promise<EventWithType> {
  const event = await findEventById(id);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  if (!event.isPublic && requesterId !== event.createdById) {
    throw new ApiError(403, "Forbidden");
  }

  return withEventType(event);
}

export async function updateEventService(
  id: string,
  requesterId: string,
  input: UpdateEventInput,
): Promise<EventWithType> {
  const user = await findUserById(requesterId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.isBanned) {
    throw new ApiError(403, "Banned users cannot update events");
  }

  const existing = await findEventById(id);
  if (!existing) {
    throw new ApiError(404, "Event not found");
  }
  if (existing.createdById !== requesterId) {
    throw new ApiError(403, "Only the owner can update this event");
  }

  if (input.dateTime !== undefined && input.dateTime <= new Date()) {
    throw new ApiError(400, "dateTime must be in the future");
  }

  const mergedIsPaid = input.isPaid ?? existing.isPaid;
  const mergedFee = input.fee ?? toNumberFee(existing.fee);
  validateFeeRule(mergedIsPaid, mergedFee);

  const updated = await updateEventById(id, {
    title: input.title,
    description: input.description,
    dateTime: input.dateTime,
    venue: input.venue,
    isPublic: input.isPublic,
    isPaid: input.isPaid,
    fee: input.fee,
    // Explicitly protect ownership.
    createdById: undefined,
  });

  void invalidateEventAndReviewCaches(id);

  return withEventType(updated);
}

export async function deleteEventService(
  id: string,
  requesterId: string,
  requesterRole?: string,
): Promise<{ message: string }> {
  const existing = await findEventById(id);
  if (!existing) {
    throw new ApiError(404, "Event not found");
  }

  const isOwner = existing.createdById === requesterId;
  const isAdmin = requesterRole === "ADMIN";
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "Only the owner can delete this event");
  }

  await deleteEventById(id);
  void clearFeaturedIfMatchesEventId(id);
  void invalidateEventAndReviewCaches(id);
  return { message: "Event deleted successfully" };
}

