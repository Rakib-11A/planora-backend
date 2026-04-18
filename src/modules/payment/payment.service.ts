import { ParticipationStatus, PaymentStatus } from "@prisma/client";

import { mockPaymentProvider } from "../../lib/payment/mock.provider";
import type { PaymentProvider } from "../../lib/payment/payment.provider";
import { ApiError } from "../../utils/ApiError";
import { emitNotificationEvent } from "../notification/notification.trigger";
import { NOTIFICATION_TYPES } from "../notification/notification.types";
import {
  createPayment,
  findEventParticipationByUser,
  findPaymentById,
  findPaymentByParticipationId,
  listUserPayments,
  updateParticipationStatusById,
  updatePaymentById,
} from "./payment.repository";
import type { InitiatePaymentResult, VerifyPaymentResult } from "./payment.types";

const PROVIDER_NAME = "mock";

function decimalToNumber(v: { toString(): string }): number {
  return Number(v.toString());
}

export async function initiatePaymentService(
  eventId: string,
  userId: string,
  provider: PaymentProvider = mockPaymentProvider,
): Promise<InitiatePaymentResult> {
  const participation = await findEventParticipationByUser(eventId, userId);
  if (!participation) {
    throw new ApiError(404, "Participation not found for this event");
  }
  if (!participation.event.isPaid) {
    throw new ApiError(400, "Cannot pay for a free event");
  }
  if (participation.status !== ParticipationStatus.PENDING) {
    throw new ApiError(400, "Payment can only be initiated for pending participation");
  }

  const existing = await findPaymentByParticipationId(participation.id);
  if (existing && existing.status === PaymentStatus.SUCCESS) {
    throw new ApiError(409, "Payment already completed for this participation");
  }
  if (existing && existing.status === PaymentStatus.INITIATED) {
    throw new ApiError(409, "Payment already initiated for this participation");
  }

  const amount = decimalToNumber(participation.event.fee);
  if (amount <= 0) {
    throw new ApiError(400, "Invalid payable amount");
  }

  let paymentId: string;
  if (existing && existing.status === PaymentStatus.PENDING) {
    const reset = await updatePaymentById(existing.id, {
      status: PaymentStatus.INITIATED,
      provider: PROVIDER_NAME,
      transactionId: null,
    });
    paymentId = reset.id;
  } else {
    const created = await createPayment({
      userId,
      eventId,
      participationId: participation.id,
      amount,
      status: PaymentStatus.INITIATED,
      provider: PROVIDER_NAME,
      transactionId: null,
    });
    paymentId = created.id;
  }

  const providerResult = await provider.createPayment({
    paymentId,
    amount,
    currency: "BDT",
    metadata: { userId, eventId, participationId: participation.id },
  });

  await updatePaymentById(paymentId, {
    transactionId: providerResult.transactionId ?? null,
    provider: PROVIDER_NAME,
  });

  return {
    paymentId,
    paymentUrl: providerResult.paymentUrl,
    status: PaymentStatus.INITIATED,
  };
}

export async function verifyPaymentService(
  paymentId: string,
  userId: string,
  provider: PaymentProvider = mockPaymentProvider,
): Promise<VerifyPaymentResult> {
  const payment = await findPaymentById(paymentId);
  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }
  if (payment.userId !== userId) {
    throw new ApiError(403, "Forbidden");
  }
  if (payment.status === PaymentStatus.SUCCESS) {
    throw new ApiError(409, "Payment already verified");
  }
  if (payment.status !== PaymentStatus.INITIATED) {
    throw new ApiError(400, "Only initiated payments can be verified");
  }

  const providerResult = await provider.verifyPayment({
    paymentId: payment.id,
    transactionId: payment.transactionId ?? undefined,
  });

  if (providerResult.status === "SUCCESS") {
    await updatePaymentById(payment.id, {
      status: PaymentStatus.SUCCESS,
      transactionId: providerResult.transactionId ?? payment.transactionId,
    });

    const nextParticipationStatus = payment.event.isPublic
      ? ParticipationStatus.APPROVED
      : ParticipationStatus.PENDING;

    await updateParticipationStatusById(
      payment.participation.id,
      nextParticipationStatus,
    );

    await emitNotificationEvent({
      userId: payment.user.id,
      type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
      title: "Payment successful",
      message: `Payment completed for "${payment.event.title}".`,
      metadata: {
        paymentId: payment.id,
        eventId: payment.eventId,
        transactionId: providerResult.transactionId ?? payment.transactionId,
      },
      email: {
        to: payment.user.email,
        subject: "Planora: Payment Success",
        html: `<p>Hello ${payment.user.name},</p><p>Your payment for <strong>${payment.event.title}</strong> was successful.</p>`,
      },
    });

    return {
      paymentId: payment.id,
      status: PaymentStatus.SUCCESS,
      participationStatus: nextParticipationStatus,
    };
  }

  await updatePaymentById(payment.id, {
    status: PaymentStatus.PENDING,
    transactionId: providerResult.transactionId ?? payment.transactionId,
  });

  return {
    paymentId: payment.id,
    status: PaymentStatus.PENDING,
    participationStatus: payment.participation.status,
  };
}

export async function getMyPaymentsService(userId: string) {
  return listUserPayments(userId);
}

