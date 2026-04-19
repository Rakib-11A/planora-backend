import type {
  CreatePaymentProviderInput,
  CreatePaymentProviderResult,
  PaymentProvider,
  VerifyPaymentProviderInput,
  VerifyPaymentProviderResult,
} from "./payment.provider";

type InitiateJson = {
  status?: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
};

type SessionJson = Record<string, unknown>;

/**
 * SSLCommerz (sandbox/live) session + validation.
 * Set `SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASSWD` (or `SSLCOMMERZ_STORE_PASSWORD`) for real sessions.
 * Without credentials, returns a frontend fallback URL suitable for local demos.
 */
export class SslCommerzPaymentProvider implements PaymentProvider {
  private gatewayHost(): string {
    const live = (process.env.SSLCOMMERZ_LIVE ?? "").trim().toLowerCase() === "true";
    return live ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";
  }

  async createPayment(data: CreatePaymentProviderInput): Promise<CreatePaymentProviderResult> {
    const storeId = (process.env.SSLCOMMERZ_STORE_ID ?? "").trim();
    const storePass = (
      process.env.SSLCOMMERZ_STORE_PASSWD ??
      process.env.SSLCOMMERZ_STORE_PASSWORD ??
      ""
    ).trim();
    const baseUrl = (data.metadata?.frontendBaseUrl ?? process.env.FRONTEND_URL ?? "").replace(/\/$/, "");
    const apiBase = (data.metadata?.apiBaseUrl ?? process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "");

    if (!storeId || !storePass) {
      const paymentUrl = `${baseUrl}/payments?provider=sslcommerz&paymentId=${encodeURIComponent(data.paymentId)}`;
      return {
        paymentUrl,
        transactionId: `sslc_dev_${data.paymentId}`,
      };
    }

    const form = new URLSearchParams();
    form.set("store_id", storeId);
    form.set("store_passwd", storePass);
    form.set("total_amount", data.amount.toFixed(2));
    form.set("currency", data.currency);
    form.set("tran_id", data.paymentId);
    form.set("product_category", "Event");
    form.set("success_url", `${baseUrl}/payments?provider=sslcommerz&status=success&paymentId=${encodeURIComponent(data.paymentId)}`);
    form.set("fail_url", `${baseUrl}/payments?provider=sslcommerz&status=fail&paymentId=${encodeURIComponent(data.paymentId)}`);
    form.set("cancel_url", `${baseUrl}/payments?provider=sslcommerz&status=cancel&paymentId=${encodeURIComponent(data.paymentId)}`);
    form.set("cus_name", data.metadata?.userName ?? "Planora user");
    form.set("cus_email", data.metadata?.userEmail ?? "noreply@planora.local");
    form.set("value_a", data.metadata?.userId ?? "");
    form.set("value_b", data.metadata?.eventId ?? "");
    if (apiBase) {
      form.set("ipn_url", `${apiBase}/api/payments/webhooks/sslcommerz`);
    }

    const res = await fetch(`${this.gatewayHost()}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const json = (await res.json()) as InitiateJson;
    if (json.status !== "SUCCESS" || typeof json.GatewayPageURL !== "string") {
      throw new Error(json.failedreason ?? "SSLCommerz session could not be created");
    }

    return {
      paymentUrl: json.GatewayPageURL,
      transactionId: json.sessionkey ?? data.paymentId,
    };
  }

  async verifyPayment(data: VerifyPaymentProviderInput): Promise<VerifyPaymentProviderResult> {
    const txn = data.transactionId ?? "";
    if (txn.startsWith("sslc_dev_")) {
      return { status: "SUCCESS", transactionId: txn };
    }

    const storeId = (process.env.SSLCOMMERZ_STORE_ID ?? "").trim();
    const storePass = (
      process.env.SSLCOMMERZ_STORE_PASSWD ??
      process.env.SSLCOMMERZ_STORE_PASSWORD ??
      ""
    ).trim();

    if (!storeId || !storePass || txn === "") {
      return { status: "FAILED", transactionId: txn };
    }

    const url = `${this.gatewayHost()}/validator/api/merTransTest.php?sessionkey=${encodeURIComponent(txn)}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(storePass)}&format=json`;
    const res = await fetch(url);
    const json = (await res.json()) as SessionJson;
    const status = typeof json.status === "string" ? json.status : "";
    const ok = status === "VALID" || status === "VALIDATED" || status === "SUCCESS";
    const tranId = typeof json.tran_id === "string" ? json.tran_id : txn;
    return { status: ok ? "SUCCESS" : "FAILED", transactionId: tranId };
  }
}

export const sslCommerzPaymentProvider = new SslCommerzPaymentProvider();

type ValidationServerJson = {
  status?: string;
  tran_id?: string;
  val_id?: string;
};

/**
 * Validates an SSLCommerz IPN `val_id` against the merchant store (production-safe).
 * Use this from the IPN webhook; do not trust POST fields alone.
 */
export async function validateSslCommerzValId(valId: string): Promise<{
  ok: boolean;
  tranId?: string;
  valId?: string;
}> {
  const trimmed = valId.trim();
  if (trimmed === "") {
    return { ok: false };
  }

  const storeId = (process.env.SSLCOMMERZ_STORE_ID ?? "").trim();
  const storePass = (
    process.env.SSLCOMMERZ_STORE_PASSWD ??
    process.env.SSLCOMMERZ_STORE_PASSWORD ??
    ""
  ).trim();
  if (!storeId || !storePass) {
    return { ok: false };
  }

  const live = (process.env.SSLCOMMERZ_LIVE ?? "").trim().toLowerCase() === "true";
  const host = live ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";
  const url =
    `${host}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(trimmed)}` +
    `&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(storePass)}&v=1&format=json`;

  const res = await fetch(url);
  const json = (await res.json()) as ValidationServerJson | ValidationServerJson[];
  const row = Array.isArray(json) ? json[0] : json;
  if (row === undefined) {
    return { ok: false };
  }

  const status = typeof row.status === "string" ? row.status : "";
  const ok = status === "VALID" || status === "VALIDATED" || status === "SUCCESS";
  const tranId = typeof row.tran_id === "string" ? row.tran_id : undefined;
  const outValId = typeof row.val_id === "string" ? row.val_id : trimmed;

  return ok ? { ok: true, tranId, valId: outValId } : { ok: false };
}
