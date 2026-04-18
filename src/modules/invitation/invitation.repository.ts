import type {
  Invitation,
  InvitationStatus,
  Prisma,
} from "@prisma/client";

import prisma from "../../config/database";
import { findEventById } from "../event/event.repository";

const myInvitationSelect = {
  id: true,
  eventId: true,
  inviterId: true,
  inviteeId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  event: {
    select: {
      id: true,
      title: true,
      dateTime: true,
      venue: true,
      isPublic: true,
      isPaid: true,
      fee: true,
      createdById: true,
    },
  },
  inviter: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

const eventInvitationSelect = {
  id: true,
  eventId: true,
  inviterId: true,
  inviteeId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  invitee: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
    },
  },
} as const;

const invitationWithEventSelect = {
  id: true,
  eventId: true,
  inviterId: true,
  inviteeId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  event: {
    select: {
      id: true,
      title: true,
      dateTime: true,
      venue: true,
      isPublic: true,
      isPaid: true,
      fee: true,
      createdById: true,
    },
  },
} as const;

export type MyInvitation = Prisma.InvitationGetPayload<{
  select: typeof myInvitationSelect;
}>;

export type EventInvitation = Prisma.InvitationGetPayload<{
  select: typeof eventInvitationSelect;
}>;

export type InvitationWithEvent = Prisma.InvitationGetPayload<{
  select: typeof invitationWithEventSelect;
}>;

export async function findEventByIdForInvitation(eventId: string) {
  return findEventById(eventId);
}

export async function findInvitationByEventAndInvitee(
  eventId: string,
  inviteeId: string,
): Promise<Invitation | null> {
  return prisma.invitation.findUnique({
    where: {
      eventId_inviteeId: { eventId, inviteeId },
    },
  });
}

export async function createInvitation(
  data: Prisma.InvitationUncheckedCreateInput,
): Promise<Invitation> {
  return prisma.invitation.create({ data });
}

export async function updateInvitationStatus(
  id: string,
  status: InvitationStatus,
): Promise<Invitation> {
  return prisma.invitation.update({
    where: { id },
    data: { status },
  });
}

export async function updateInvitationById(
  id: string,
  data: Prisma.InvitationUncheckedUpdateInput,
): Promise<Invitation> {
  return prisma.invitation.update({
    where: { id },
    data,
  });
}

export async function findInvitationById(
  id: string,
): Promise<InvitationWithEvent | null> {
  return prisma.invitation.findUnique({
    where: { id },
    select: invitationWithEventSelect,
  });
}

export async function listMyInvitations(
  inviteeId: string,
): Promise<MyInvitation[]> {
  return prisma.invitation.findMany({
    where: { inviteeId },
    orderBy: { createdAt: "desc" },
    select: myInvitationSelect,
  });
}

export async function listEventInvitations(
  eventId: string,
  status?: InvitationStatus,
): Promise<EventInvitation[]> {
  return prisma.invitation.findMany({
    where: {
      eventId,
      ...(status !== undefined ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: eventInvitationSelect,
  });
}

