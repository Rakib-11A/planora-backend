import { mockPaymentProvider } from "./mock.provider";
import type { PaymentProvider } from "./payment.provider";
import { shurjoPayPaymentProvider } from "./shurjopay.provider";
import { sslCommerzPaymentProvider } from "./sslcommerz.provider";

export type PaymentProviderName = "mock" | "sslcommerz" | "shurjopay";

/** Provider used when initiating a new payment (from `PAYMENT_PROVIDER` env). */
export function getActivePaymentProviderForInitiate(): {
  name: PaymentProviderName;
  provider: PaymentProvider;
} {
  const mode = (process.env.PAYMENT_PROVIDER ?? "mock").trim().toLowerCase();
  if (mode === "sslcommerz" || mode === "ssl_commerz") {
    return { name: "sslcommerz", provider: sslCommerzPaymentProvider };
  }
  if (mode === "shurjopay" || mode === "shurjo") {
    return { name: "shurjopay", provider: shurjoPayPaymentProvider };
  }
  return { name: "mock", provider: mockPaymentProvider };
}

/** Resolve implementation for verification using the value persisted on the payment row. */
export function getPaymentProviderByStoredName(
  name: string | null | undefined,
): { name: PaymentProviderName; provider: PaymentProvider } {
  const n = (name ?? "mock").trim().toLowerCase();
  if (n === "sslcommerz" || n === "ssl_commerz") {
    return { name: "sslcommerz", provider: sslCommerzPaymentProvider };
  }
  if (n === "shurjopay" || n === "shurjo") {
    return { name: "shurjopay", provider: shurjoPayPaymentProvider };
  }
  return { name: "mock", provider: mockPaymentProvider };
}
