export type CreatePaymentProviderInput = {
  paymentId: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
};

export type CreatePaymentProviderResult = {
  paymentUrl: string;
  transactionId?: string;
};

export type VerifyPaymentProviderInput = {
  paymentId: string;
  transactionId?: string;
};

export type VerifyPaymentProviderResult = {
  status: "SUCCESS" | "FAILED";
  transactionId?: string;
};

export interface PaymentProvider {
  createPayment(
    data: CreatePaymentProviderInput,
  ): Promise<CreatePaymentProviderResult>;
  verifyPayment(
    data: VerifyPaymentProviderInput,
  ): Promise<VerifyPaymentProviderResult>;
}

