import { InvitationStatus, ParticipationStatus } from "@prisma/client";

import { ApiError } from "../../utils/ApiError";
import {
  createParticipation,
  findParticipationByUserAndEvent,
  updateParticipationStatus,
} from "../participation/participation.repository";
import {
  createInvitation,
  findEventByIdForInvitation,
  findInvitationByEventAndInvitee,
  findInvitationById,
  findUserForNotification,
  listEventInvitations,
  listMyInvitations,
  updateInvitationById,
  updateInvitationStatus,
} from "./invitation.repository";
import { emitNotificationEvent } from "../notification/notification.trigger";
import { NOTIFICATION_TYPES } from "../notification/notification.types";

function deriveParticipationStatus(
  isPublic: boolean,
  isPaid: boolean,
): ParticipationStatus {
  if (isPublic && !isPaid) {
    return ParticipationStatus.APPROVED;
  }
  return ParticipationStatus.PENDING;
}

function assertPendingInvitation(status: InvitationStatus): void {
  if (status === InvitationStatus.ACCEPTED) {
    throw new ApiError(409, "Invitation already accepted");
  }
  if (status === InvitationStatus.DECLINED) {
    throw new ApiError(409, "Invitation already declined");
  }
  if (status === InvitationStatus.CANCELLED) {
    throw new ApiError(409, "Invitation was cancelled");
  }
}

export async function sendInvitationService(
  eventId: string,
  inviterId: string,
  inviteeId: string,
): Promise<{ message: string; status: InvitationStatus }> {
  const event = await findEventByIdForInvitation(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  if (event.createdById !== inviterId) {
    throw new ApiError(403, "Only event owner can send invitations");
  }
  if (inviterId === inviteeId) {
    throw new ApiError(400, "You cannot invite yourself");
  }

  const participation = await findParticipationByUserAndEvent(inviteeId, eventId);
  if (participation?.status === ParticipationStatus.APPROVED) {
    throw new ApiError(409, "User already joined this event");
  }
  if (participation?.status === ParticipationStatus.PENDING) {
    throw new ApiError(409, "User already has a pending participation");
  }

  const existing = await findInvitationByEventAndInvitee(eventId, inviteeId);
  if (existing) {
    if (existing.status === InvitationStatus.PENDING) {
      throw new ApiError(409, "Invitation already pending");
    }
    if (existing.status === InvitationStatus.ACCEPTED) {
      throw new ApiError(409, "Invitation already accepted");
    }

    const reopened = await updateInvitationById(existing.id, {
      inviterId,
      status: InvitationStatus.PENDING,
    });

    const invitee = await findUserForNotification(inviteeId);
    if (invitee) {
      await emitNotificationEvent({
        userId: invitee.id,
        type: NOTIFICATION_TYPES.INVITATION_RECEIVED,
        title: "New event invitation",
        message: `You received an invitation for "${event.title}".`,
        metadata: { eventId, inviterId },
        email: {
          to: invitee.email,
          subject: "Planora: New Invitation Received",
          html: `<p>Hello ${invitee.name},</p><p>You received an invitation for <strong>${event.title}</strong>.</p>`,
        },
      });
    }

    return { message: "Invitation sent", status: reopened.status };
  }

  const created = await createInvitation({
    eventId,
    inviterId,
    inviteeId,
    status: InvitationStatus.PENDING,
  });

  const invitee = await findUserForNotification(inviteeId);
  if (invitee) {
    await emitNotificationEvent({
      userId: invitee.id,
      type: NOTIFICATION_TYPES.INVITATION_RECEIVED,
      title: "New event invitation",
      message: `You received an invitation for "${event.title}".`,
      metadata: { eventId, inviterId },
      email: {
        to: invitee.email,
        subject: "Planora: New Invitation Received",
        html: `<p>Hello ${invitee.name},</p><p>You received an invitation for <strong>${event.title}</strong>.</p>`,
      },
    });
  }

  return { message: "Invitation sent", status: created.status };
}

export async function getMyInvitationsService(inviteeId: string) {
  return listMyInvitations(inviteeId);
}

export async function acceptInvitationService(
  invitationId: string,
  userId: string,
): Promise<{ message: string; invitationStatus: InvitationStatus; participationStatus: ParticipationStatus }> {
  const invitation = await findInvitationById(invitationId);
  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }
  if (invitation.inviteeId !== userId) {
    throw new ApiError(403, "Only invitee can accept this invitation");
  }
  assertPendingInvitation(invitation.status);

  const existingParticipation = await findParticipationByUserAndEvent(
    userId,
    invitation.eventId,
  );

  if (
    existingParticipation?.status === ParticipationStatus.APPROVED ||
    existingParticipation?.status === ParticipationStatus.PENDING
  ) {
    await updateInvitationStatus(invitation.id, InvitationStatus.DECLINED);
    throw new ApiError(409, "User already has participation for this event");
  }

  const targetStatus = deriveParticipationStatus(
    invitation.event.isPublic,
    invitation.event.isPaid,
  );

  if (
    existingParticipation?.status === ParticipationStatus.CANCELLED ||
    existingParticipation?.status === ParticipationStatus.REJECTED
  ) {
    await updateParticipationStatus(existingParticipation.id, targetStatus);
  } else if (!existingParticipation) {
    await createParticipation({
      userId,
      eventId: invitation.eventId,
      status: targetStatus,
    });
  }

  await updateInvitationStatus(invitation.id, InvitationStatus.ACCEPTED);

  const inviter = await findUserForNotification(invitation.inviterId);
  if (inviter) {
    await emitNotificationEvent({
      userId: inviter.id,
      type: NOTIFICATION_TYPES.INVITATION_ACCEPTED,
      title: "Invitation accepted",
      message: `Your invitation was accepted for "${invitation.event.title}".`,
      metadata: { eventId: invitation.eventId, inviteeId: userId },
      email: {
        to: inviter.email,
        subject: "Planora: Invitation Accepted",
        html: `<p>Hello ${inviter.name},</p><p>Your invitation for <strong>${invitation.event.title}</strong> was accepted.</p>`,
      },
    });
  }

  return {
    message: "Invitation accepted",
    invitationStatus: InvitationStatus.ACCEPTED,
    participationStatus: targetStatus,
  };
}

export async function declineInvitationService(
  invitationId: string,
  userId: string,
): Promise<{ message: string; status: InvitationStatus }> {
  const invitation = await findInvitationById(invitationId);
  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }
  if (invitation.inviteeId !== userId) {
    throw new ApiError(403, "Only invitee can decline this invitation");
  }
  assertPendingInvitation(invitation.status);

  const updated = await updateInvitationStatus(
    invitation.id,
    InvitationStatus.DECLINED,
  );
  return { message: "Invitation declined", status: updated.status };
}

export async function cancelInvitationService(
  invitationId: string,
  userId: string,
): Promise<{ message: string; status: InvitationStatus }> {
  const invitation = await findInvitationById(invitationId);
  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }
  if (invitation.inviterId !== userId) {
    throw new ApiError(403, "Only inviter can cancel this invitation");
  }

  const event = await findEventByIdForInvitation(invitation.eventId);
  if (!event || event.createdById !== userId) {
    throw new ApiError(403, "Only event owner can cancel this invitation");
  }
  if (invitation.status !== InvitationStatus.PENDING) {
    throw new ApiError(400, "Only pending invitations can be cancelled");
  }

  const updated = await updateInvitationStatus(
    invitation.id,
    InvitationStatus.CANCELLED,
  );
  return { message: "Invitation cancelled", status: updated.status };
}

export async function getEventInvitationsService(
  eventId: string,
  ownerId: string,
  status?: InvitationStatus,
) {
  const event = await findEventByIdForInvitation(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  if (event.createdById !== ownerId) {
    throw new ApiError(403, "Only event owner can view invitations");
  }
  return listEventInvitations(eventId, status);
}

