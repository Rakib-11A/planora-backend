import type {
  CreatePaymentProviderInput,
  CreatePaymentProviderResult,
  PaymentProvider,
  VerifyPaymentProviderInput,
  VerifyPaymentProviderResult,
} from "./payment.provider";

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(
    data: CreatePaymentProviderInput,
  ): Promise<CreatePaymentProviderResult> {
    return {
      paymentUrl: `https://mock-pay.planora.dev/pay/${encodeURIComponent(data.paymentId)}`,
      transactionId: `mock_txn_${Date.now()}`,
    };
  }

  async verifyPayment(
    data: VerifyPaymentProviderInput,
  ): Promise<VerifyPaymentProviderResult> {
    return {
      status: "SUCCESS",
      transactionId: data.transactionId ?? `mock_txn_${Date.now()}`,
    };
  }
}

export const mockPaymentProvider = new MockPaymentProvider();

