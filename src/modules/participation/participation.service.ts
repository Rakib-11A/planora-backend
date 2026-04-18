import { ParticipationStatus } from "@prisma/client";

import { ApiError } from "../../utils/ApiError";
import { findUserById } from "../auth/auth.repository";
import { findEventById } from "../event/event.repository";
import {
  createParticipation,
  findParticipationByUserAndEvent,
  findParticipationWithUserByUserAndEvent,
  listEventParticipants,
  listUserParticipations,
  updateParticipationStatus,
} from "./participation.repository";
import { emitNotificationEvent } from "../notification/notification.trigger";
import { NOTIFICATION_TYPES } from "../notification/notification.types";

function deriveInitialStatus(
  isPublic: boolean,
  isPaid: boolean,
): ParticipationStatus {
  if (isPublic && !isPaid) return ParticipationStatus.APPROVED;
  return ParticipationStatus.PENDING;
}

async function assertOwner(eventId: string, requesterId: string): Promise<void> {
  const event = await findEventById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  if (event.createdById !== requesterId) {
    throw new ApiError(403, "Only event owner can perform this action");
  }
}

export async function joinEventService(
  eventId: string,
  userId: string,
): Promise<{ status: ParticipationStatus; message: string }> {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.isBanned) {
    throw new ApiError(403, "Banned users cannot join events");
  }

  const event = await findEventById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  if (event.createdById === userId) {
    throw new ApiError(400, "You cannot join your own event");
  }

  const existing = await findParticipationByUserAndEvent(userId, eventId);
  const targetStatus = deriveInitialStatus(event.isPublic, event.isPaid);

  if (existing) {
    if (existing.status === ParticipationStatus.CANCELLED) {
      const restored = await updateParticipationStatus(existing.id, targetStatus);
      return {
        status: restored.status,
        message:
          restored.status === ParticipationStatus.APPROVED
            ? "Joined successfully"
            : "Join request submitted",
      };
    }
    if (existing.status === ParticipationStatus.APPROVED) {
      throw new ApiError(409, "You have already joined this event");
    }
    if (existing.status === ParticipationStatus.PENDING) {
      throw new ApiError(409, "Join request already pending");
    }
    if (existing.status === ParticipationStatus.REJECTED) {
      throw new ApiError(409, "Your previous request was rejected");
    }
  }

  const participation = await createParticipation({
    userId,
    eventId,
    status: targetStatus,
  });

  return {
    status: participation.status,
    message:
      participation.status === ParticipationStatus.APPROVED
        ? "Joined successfully"
        : "Join request submitted",
  };
}

export async function cancelParticipationService(
  eventId: string,
  userId: string,
): Promise<{ message: string; status: ParticipationStatus }> {
  const participation = await findParticipationByUserAndEvent(userId, eventId);
  if (!participation) {
    throw new ApiError(404, "Participation not found");
  }
  if (
    participation.status !== ParticipationStatus.PENDING &&
    participation.status !== ParticipationStatus.APPROVED
  ) {
    throw new ApiError(400, "Participation cannot be cancelled in current state");
  }

  const updated = await updateParticipationStatus(
    participation.id,
    ParticipationStatus.CANCELLED,
  );
  return { message: "Participation cancelled", status: updated.status };
}

export async function getMyParticipationsService(userId: string) {
  return listUserParticipations(userId);
}

export async function getEventParticipantsService(
  eventId: string,
  ownerId: string,
  status?: ParticipationStatus,
) {
  await assertOwner(eventId, ownerId);
  return listEventParticipants(eventId, status);
}

export async function approveParticipantService(
  eventId: string,
  ownerId: string,
  participantUserId: string,
): Promise<{ message: string; status: ParticipationStatus }> {
  await assertOwner(eventId, ownerId);

  const participation = await findParticipationByUserAndEvent(
    participantUserId,
    eventId,
  );
  if (!participation) {
    throw new ApiError(404, "Participation not found");
  }
  if (participation.status !== ParticipationStatus.PENDING) {
    throw new ApiError(400, "Only pending requests can be approved");
  }

  const updated = await updateParticipationStatus(
    participation.id,
    ParticipationStatus.APPROVED,
  );

  const approved = await findParticipationWithUserByUserAndEvent(
    participantUserId,
    eventId,
  );
  if (approved) {
    await emitNotificationEvent({
      userId: approved.user.id,
      type: NOTIFICATION_TYPES.PARTICIPATION_APPROVED,
      title: "Participation approved",
      message: `Your request was approved for "${approved.event.title}".`,
      metadata: { eventId, participationId: approved.id },
      email: {
        to: approved.user.email,
        subject: "Planora: Participation Approved",
        html: `<p>Hello ${approved.user.name},</p><p>Your participation request for <strong>${approved.event.title}</strong> has been approved.</p>`,
      },
    });
  }

  return { message: "Participant approved", status: updated.status };
}

export async function rejectParticipantService(
  eventId: string,
  ownerId: string,
  participantUserId: string,
): Promise<{ message: string; status: ParticipationStatus }> {
  await assertOwner(eventId, ownerId);

  const participation = await findParticipationByUserAndEvent(
    participantUserId,
    eventId,
  );
  if (!participation) {
    throw new ApiError(404, "Participation not found");
  }
  if (participation.status !== ParticipationStatus.PENDING) {
    throw new ApiError(400, "Only pending requests can be rejected");
  }

  const updated = await updateParticipationStatus(
    participation.id,
    ParticipationStatus.REJECTED,
  );

  const rejected = await findParticipationWithUserByUserAndEvent(
    participantUserId,
    eventId,
  );
  if (rejected) {
    await emitNotificationEvent({
      userId: rejected.user.id,
      type: NOTIFICATION_TYPES.PARTICIPATION_REJECTED,
      title: "Participation rejected",
      message: `Your request was rejected for "${rejected.event.title}".`,
      metadata: { eventId, participationId: rejected.id },
      email: {
        to: rejected.user.email,
        subject: "Planora: Participation Update",
        html: `<p>Hello ${rejected.user.name},</p><p>Your participation request for <strong>${rejected.event.title}</strong> has been rejected.</p>`,
      },
    });
  }

  return { message: "Participant rejected", status: updated.status };
}

