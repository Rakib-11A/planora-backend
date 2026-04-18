import type { PaymentStatus } from "@prisma/client";

export type InitiatePaymentResult = {
  paymentId: string;
  paymentUrl: string;
  status: PaymentStatus;
};

export type VerifyPaymentResult = {
  paymentId: string;
  status: PaymentStatus;
  participationStatus: "PENDING" | "APPROVED";
};

