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
      if (baseUrl === "") {
        throw new Error(
          "[sslcommerz dev] FRONTEND_URL or frontendBaseUrl metadata is required to build checkout URL",
        );
      }
      const eventId = (data.metadata?.eventId ?? "").trim();
      const qs = new URLSearchParams({
        provider: "sslcommerz",
        paymentId: data.paymentId,
      });
      if (eventId !== "") {
        qs.set("eventId", eventId);
      }
      const paymentUrl = `${baseUrl}/payment-return?${qs.toString()}`;
      return {
        paymentUrl,
        transactionId: `sslc_dev_${data.paymentId}`,
      };
    }

    const eventIdForReturn = (data.metadata?.eventId ?? "").trim();
    // Route success/fail/cancel through the backend so we can receive SSLCommerz's POST,
    // validate val_id server-side, then 302 the browser to the frontend confirmation page.
    const returnUrl = (status: "success" | "fail" | "cancel") => {
      if (apiBase) {
        const qs = new URLSearchParams({ frontendBase: baseUrl });
        if (eventIdForReturn !== "") {
          qs.set("eventId", eventIdForReturn);
        }
        return `${apiBase}/api/payments/webhooks/sslcommerz/return/${status}?${qs.toString()}`;
      }
      // Fallback to frontend page directly (best-effort dev only).
      const qs = new URLSearchParams({
        provider: "sslcommerz",
        paymentId: data.paymentId,
        status,
      });
      if (eventIdForReturn !== "") {
        qs.set("eventId", eventIdForReturn);
      }
      return `${baseUrl}/payment-return?${qs.toString()}`;
    };

    const productName = (data.metadata?.eventTitle ?? "").trim() || "Event registration";

    const form = new URLSearchParams();
    form.set("store_id", storeId);
    form.set("store_passwd", storePass);
    form.set("total_amount", data.amount.toFixed(2));
    form.set("currency", data.currency);
    form.set("tran_id", data.paymentId);
    form.set("success_url", returnUrl("success"));
    form.set("fail_url", returnUrl("fail"));
    form.set("cancel_url", returnUrl("cancel"));
    if (apiBase) {
      form.set("ipn_url", `${apiBase}/api/payments/webhooks/sslcommerz`);
    }
    form.set("emi_option", "0");
    // Customer (required by SSLCommerz) — fall back to safe placeholders if user has no phone/address.
    form.set("cus_name", (data.metadata?.userName ?? "").trim() || "Planora user");
    form.set("cus_email", (data.metadata?.userEmail ?? "").trim() || "noreply@planora.local");
    form.set("cus_add1", "Dhaka");
    form.set("cus_city", "Dhaka");
    form.set("cus_postcode", "1000");
    form.set("cus_country", "Bangladesh");
    form.set("cus_phone", "01700000000");
    // Shipping (NO = digital / non-shipping).
    form.set("shipping_method", "NO");
    form.set("num_of_item", "1");
    form.set("product_name", productName.slice(0, 255));
    form.set("product_category", "Event");
    form.set("product_profile", "non-physical-goods");
    // Pass-through identifiers we want echoed back on IPN/return.
    form.set("value_a", data.metadata?.userId ?? "");
    form.set("value_b", data.metadata?.eventId ?? "");
    form.set("value_c", data.metadata?.participationId ?? "");

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

    if (!storeId || !storePass) {
      return { status: "FAILED", transactionId: txn };
    }

    // Query SSLCommerz by our merchant tran_id (= payment row id). The `sessionkey`
    // stored on transactionId is a one-time session identifier and is not accepted
    // by the transaction-query API; tran_id is the canonical lookup key.
    const tranId = data.paymentId;
    const url =
      `${this.gatewayHost()}/validator/api/merchantTransIDvalidationAPI.php` +
      `?tran_id=${encodeURIComponent(tranId)}` +
      `&store_id=${encodeURIComponent(storeId)}` +
      `&store_passwd=${encodeURIComponent(storePass)}` +
      `&v=1&format=json`;

    const res = await fetch(url);
    const raw = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { status: "FAILED", transactionId: txn };
    }

    const container =
      parsed !== null && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    const elements = Array.isArray(container.element)
      ? (container.element as SessionJson[])
      : Array.isArray(parsed)
        ? (parsed as SessionJson[])
        : [];
    const row = elements[0] ?? (parsed as SessionJson | undefined);
    if (row === undefined || row === null || typeof row !== "object") {
      return { status: "FAILED", transactionId: txn };
    }
    const status = typeof (row as SessionJson).status === "string" ? ((row as SessionJson).status as string) : "";
    const ok = status === "VALID" || status === "VALIDATED" || status === "SUCCESS";
    const resolvedTran =
      typeof (row as SessionJson).tran_id === "string"
        ? ((row as SessionJson).tran_id as string)
        : tranId;
    return { status: ok ? "SUCCESS" : "FAILED", transactionId: resolvedTran };
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
