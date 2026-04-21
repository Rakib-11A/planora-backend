import { ParticipationStatus, PaymentStatus } from "@prisma/client";

import { config } from "../../config/env";
import {
  getActivePaymentProviderForInitiate,
  getPaymentProviderByStoredName,
} from "../../lib/payment/payment.provider.factory";
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
import type { PaymentWithRelations } from "./payment.repository";
import type { InitiatePaymentResult, VerifyPaymentResult } from "./payment.types";
import { paginate } from "../../shared/utils/pagination";
import { invalidateParticipationSideEffects } from "../../shared/utils/cache";

function decimalToNumber(v: { toString(): string }): number {
  return Number(v.toString());
}

/**
 * After a gateway confirms funds, keep participation **PENDING** so the host can approve
 * (paid public + paid private per Planora spec).
 */
export async function finalizePaymentAsSuccessfulFromGateway(
  payment: PaymentWithRelations,
  resolvedTransactionId: string | null,
): Promise<VerifyPaymentResult> {
  if (payment.status === PaymentStatus.SUCCESS) {
    return {
      paymentId: payment.id,
      status: PaymentStatus.SUCCESS,
      participationStatus: payment.participation.status,
    };
  }

  if (payment.status !== PaymentStatus.INITIATED && payment.status !== PaymentStatus.PENDING) {
    throw new ApiError(400, "Payment cannot be finalized in its current state");
  }

  await updatePaymentById(payment.id, {
    status: PaymentStatus.SUCCESS,
    transactionId: resolvedTransactionId ?? payment.transactionId,
  });

  await updateParticipationStatusById(payment.participation.id, ParticipationStatus.PENDING);

  void invalidateParticipationSideEffects(payment.userId, payment.eventId);

  await emitNotificationEvent({
    userId: payment.user.id,
    type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
    title: "Payment successful",
    message: `Payment received for "${payment.event.title}". The organizer will confirm your registration.`,
    metadata: {
      paymentId: payment.id,
      eventId: payment.eventId,
      transactionId: resolvedTransactionId ?? payment.transactionId,
    },
    email: {
      to: payment.user.email,
      subject: "Planora: Payment received",
      html: `<p>Hello ${payment.user.name},</p><p>We received your payment for <strong>${payment.event.title}</strong>.</p><p>The organizer will confirm your registration shortly.</p>`,
    },
  });

  return {
    paymentId: payment.id,
    status: PaymentStatus.SUCCESS,
    participationStatus: ParticipationStatus.PENDING,
  };
}

export async function initiatePaymentService(
  eventId: string,
  userId: string,
  providerOverride?: PaymentProvider,
): Promise<InitiatePaymentResult> {
  const { name: providerName, provider: defaultProvider } = getActivePaymentProviderForInitiate();
  const provider = providerOverride ?? defaultProvider;

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
      provider: providerName,
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
      provider: providerName,
      transactionId: null,
    });
    paymentId = created.id;
  }

  const apiBase = (
    (process.env.PUBLIC_API_URL ?? "").trim() || config.BETTER_AUTH_URL
  ).replace(/\/$/, "");
  const frontendBase = config.FRONTEND_URL.replace(/\/$/, "");

  const providerResult = await provider.createPayment({
    paymentId,
    amount,
    currency: "BDT",
    metadata: {
      userId,
      eventId,
      participationId: participation.id,
      apiBaseUrl: apiBase,
      frontendBaseUrl: frontendBase,
      userName: participation.user.name,
      userEmail: participation.user.email,
      eventTitle: participation.event.title,
    },
  });

  await updatePaymentById(paymentId, {
    transactionId: providerResult.transactionId ?? null,
    provider: providerName,
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
  providerOverride?: PaymentProvider,
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

  const { provider } = providerOverride
    ? { provider: providerOverride }
    : getPaymentProviderByStoredName(payment.provider);

  const providerResult = await provider.verifyPayment({
    paymentId: payment.id,
    transactionId: payment.transactionId ?? undefined,
  });

  if (providerResult.status === "SUCCESS") {
    return finalizePaymentAsSuccessfulFromGateway(payment, providerResult.transactionId ?? null);
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

export async function getMyPaymentsService(
  userId: string,
  page: number,
  limit: number,
) {
  const { items, total } = await listUserPayments(userId, page, limit);
  return paginate({ page, limit }, total, items);
}
