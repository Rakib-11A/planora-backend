import type {
  CreatePaymentProviderInput,
  CreatePaymentProviderResult,
  PaymentProvider,
  VerifyPaymentProviderInput,
  VerifyPaymentProviderResult,
} from "./payment.provider";

/**
 * Local / demo payments — redirects to the real frontend (`/payment-return`) instead of a fake host,
 * so checkout works offline and matches SSLCommerz “dev redirect” behavior.
 */
export class MockPaymentProvider implements PaymentProvider {
  async createPayment(
    data: CreatePaymentProviderInput,
  ): Promise<CreatePaymentProviderResult> {
    const baseUrl = (data.metadata?.frontendBaseUrl ?? process.env.FRONTEND_URL ?? "").replace(
      /\/$/,
      "",
    );
    if (baseUrl === "") {
      throw new Error(
        "[mock payment] FRONTEND_URL or frontendBaseUrl metadata is required to build checkout URL",
      );
    }

    const eventId = (data.metadata?.eventId ?? "").trim();
    const qs = new URLSearchParams({
      provider: "mock",
      paymentId: data.paymentId,
    });
    if (eventId !== "") {
      qs.set("eventId", eventId);
    }

    const transactionId = `mock_txn_${data.paymentId}_${Date.now()}`;

    return {
      paymentUrl: `${baseUrl}/payment-return?${qs.toString()}`,
      transactionId,
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
