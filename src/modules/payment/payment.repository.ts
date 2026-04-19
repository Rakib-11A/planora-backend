import type { Payment, Prisma } from "@prisma/client";

import prisma from "../../config/database";

const paymentWithEventSelect = {
  id: true,
  userId: true,
  eventId: true,
  participationId: true,
  amount: true,
  status: true,
  provider: true,
  transactionId: true,
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

const paymentWithRelationsSelect = {
  id: true,
  userId: true,
  eventId: true,
  participationId: true,
  amount: true,
  status: true,
  provider: true,
  transactionId: true,
  createdAt: true,
  updatedAt: true,
  event: {
    select: {
      id: true,
      title: true,
      isPublic: true,
      isPaid: true,
      fee: true,
      createdById: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  participation: {
    select: {
      id: true,
      userId: true,
      eventId: true,
      status: true,
    },
  },
} as const;

export type PaymentWithEvent = Prisma.PaymentGetPayload<{
  select: typeof paymentWithEventSelect;
}>;

export type PaymentWithRelations = Prisma.PaymentGetPayload<{
  select: typeof paymentWithRelationsSelect;
}>;

export async function findPaymentByParticipationId(
  participationId: string,
): Promise<Payment | null> {
  return prisma.payment.findUnique({ where: { participationId } });
}

export async function createPayment(
  data: Prisma.PaymentUncheckedCreateInput,
): Promise<Payment> {
  return prisma.payment.create({ data });
}

export async function updatePaymentById(
  id: string,
  data: Prisma.PaymentUncheckedUpdateInput,
): Promise<Payment> {
  return prisma.payment.update({ where: { id }, data });
}

export async function findPaymentById(
  id: string,
): Promise<PaymentWithRelations | null> {
  return prisma.payment.findUnique({
    where: { id },
    select: paymentWithRelationsSelect,
  });
}

export async function findPaymentByTransactionId(
  transactionId: string,
): Promise<PaymentWithRelations | null> {
  return prisma.payment.findFirst({
    where: { transactionId },
    select: paymentWithRelationsSelect,
  });
}

export async function listUserPayments(
  userId: string,
  page: number,
  limit: number,
): Promise<{ items: PaymentWithEvent[]; total: number }> {
  const skip = (page - 1) * limit;
  const where: Prisma.PaymentWhereInput = { userId };

  const [items, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: paymentWithEventSelect,
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, total };
}

export async function updateParticipationStatusById(
  participationId: string,
  status: "PENDING" | "APPROVED",
): Promise<void> {
  await prisma.participation.update({
    where: { id: participationId },
    data: { status },
  });
}

export async function findEventParticipationByUser(
  eventId: string,
  userId: string,
): Promise<{
  id: string;
  status: string;
  event: { id: string; isPaid: boolean; isPublic: boolean; fee: Prisma.Decimal };
} | null> {
  return prisma.participation.findUnique({
    where: { userId_eventId: { userId, eventId } },
    select: {
      id: true,
      status: true,
      event: {
        select: {
          id: true,
          isPaid: true,
          isPublic: true,
          fee: true,
        },
      },
    },
  });
}

