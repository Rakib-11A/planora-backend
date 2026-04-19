import type {
  CreatePaymentProviderInput,
  CreatePaymentProviderResult,
  PaymentProvider,
  VerifyPaymentProviderInput,
  VerifyPaymentProviderResult,
} from "./payment.provider";

type TokenResponse = { token?: string; message?: string };
type PayResponse = { checkout_url?: string; sp_order_id?: string; message?: string };
type VerifyResponse = { status?: string; message?: string; invoice_no?: string };

const SANDBOX = "https://sandbox.shurjopayment.com";

/**
 * ShurjoPay sandbox/live token + payment session.
 * Configure `SHURJOPAY_USERNAME`, `SHURJOPAY_PASSWORD`, optional `SHURJOPAY_PREFIX` (invoice prefix).
 * Without credentials, returns a frontend demo URL (same pattern as SSLCommerz dev mode).
 */
export class ShurjoPayPaymentProvider implements PaymentProvider {
  private base(): string {
    const live = (process.env.SHURJOPAY_LIVE ?? "").trim().toLowerCase() === "true";
    return live ? "https://engine.shurjopayment.com" : SANDBOX;
  }

  async createPayment(data: CreatePaymentProviderInput): Promise<CreatePaymentProviderResult> {
    const username = (process.env.SHURJOPAY_USERNAME ?? "").trim();
    const password = (process.env.SHURJOPAY_PASSWORD ?? "").trim();
    const baseUrl = (data.metadata?.frontendBaseUrl ?? process.env.FRONTEND_URL ?? "").replace(/\/$/, "");

    if (!username || !password) {
      const paymentUrl = `${baseUrl}/payments?provider=shurjopay&paymentId=${encodeURIComponent(data.paymentId)}`;
      return {
        paymentUrl,
        transactionId: `shurjo_dev_${data.paymentId}`,
      };
    }

    const tokenRes = await fetch(`${this.base()}/api/get_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const tokenJson = (await tokenRes.json()) as TokenResponse;
    if (!tokenJson.token) {
      throw new Error(tokenJson.message ?? "ShurjoPay token request failed");
    }

    const prefix = (process.env.SHURJOPAY_PREFIX ?? "PLN").trim() || "PLN";
    const orderId = `${prefix}-${data.paymentId}`.slice(0, 40);

    const payload = {
      token: tokenJson.token,
      store_id: 1,
      prefix,
      currency: data.currency,
      return_url: `${baseUrl}/payments?provider=shurjopay&status=return&paymentId=${encodeURIComponent(data.paymentId)}`,
      cancel_url: `${baseUrl}/payments?provider=shurjopay&status=cancel&paymentId=${encodeURIComponent(data.paymentId)}`,
      amount: data.amount,
      order_id: orderId,
      discamt: 0,
      customer_address: "Planora",
      customer_name: data.metadata?.userName ?? "Planora user",
      customer_phone: data.metadata?.userPhone ?? "01700000000",
      customer_city: "Dhaka",
      customer_post_code: "1000",
      client_ip: data.metadata?.clientIp ?? "127.0.0.1",
      value1: data.metadata?.userId ?? "",
      value2: data.metadata?.eventId ?? "",
    };

    const payRes = await fetch(`${this.base()}/api/secret-pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const payJson = (await payRes.json()) as PayResponse;
    if (typeof payJson.checkout_url !== "string") {
      throw new Error(payJson.message ?? "ShurjoPay checkout session failed");
    }

    return {
      paymentUrl: payJson.checkout_url,
      transactionId: payJson.sp_order_id ?? orderId,
    };
  }

  async verifyPayment(data: VerifyPaymentProviderInput): Promise<VerifyPaymentProviderResult> {
    const txn = data.transactionId ?? "";
    if (txn.startsWith("shurjo_dev_")) {
      return { status: "SUCCESS", transactionId: txn };
    }

    const username = (process.env.SHURJOPAY_USERNAME ?? "").trim();
    const password = (process.env.SHURJOPAY_PASSWORD ?? "").trim();
    if (!username || !password || txn === "") {
      return { status: "FAILED", transactionId: txn };
    }

    const tokenRes = await fetch(`${this.base()}/api/get_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const tokenJson = (await tokenRes.json()) as TokenResponse;
    if (!tokenJson.token) {
      return { status: "FAILED", transactionId: txn };
    }

    const verifyRes = await fetch(`${this.base()}/api/payment-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenJson.token, order_id: txn }),
    });
    const verifyJson = (await verifyRes.json()) as VerifyResponse;
    const ok = (verifyJson.status ?? "").toUpperCase() === "SUCCESS";
    return {
      status: ok ? "SUCCESS" : "FAILED",
      transactionId: verifyJson.invoice_no ?? txn,
    };
  }
}

export const shurjoPayPaymentProvider = new ShurjoPayPaymentProvider();
