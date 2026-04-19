import { PaymentStatus } from "@prisma/client";
import type { Request, Response } from "express";

import { validateSslCommerzValId } from "../../lib/payment/sslcommerz.provider";
import { shurjoPayPaymentProvider } from "../../lib/payment/shurjopay.provider";
import { logger } from "../../lib/logger/logger";
import { asyncHandler } from "../../utils/asyncHandler";
import { findPaymentById, findPaymentByTransactionId } from "./payment.repository";
import { finalizePaymentAsSuccessfulFromGateway } from "./payment.service";

function normalizeProvider(p: string | null | undefined): string {
  return (p ?? "").trim().toLowerCase().replace(/_/g, "");
}

function readShurjoOrderId(body: unknown): string {
  if (body === null || typeof body !== "object") {
    return "";
  }
  const o = body as Record<string, unknown>;
  const fromOrder =
    typeof o.order_id === "string"
      ? o.order_id
      : typeof o.sp_order_id === "string"
        ? o.sp_order_id
        : typeof o.invoice_no === "string"
          ? o.invoice_no
          : "";
  return fromOrder.trim();
}

/** SSLCommerz server-to-server IPN — validates `val_id` then finalizes the payment row. */
export const sslCommerzIpnHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const valId = typeof body.val_id === "string" ? body.val_id.trim() : "";
  const tranFromPost = typeof body.tran_id === "string" ? body.tran_id.trim() : "";

  if (valId === "") {
    res.status(200).type("text/plain").send("INVALID");
    return;
  }

  const validated = await validateSslCommerzValId(valId);
  if (!validated.ok || validated.tranId === undefined || validated.tranId === "") {
    logger.warn("SSLCommerz IPN validation failed", { valId });
    res.status(200).type("text/plain").send("INVALID");
    return;
  }

  if (tranFromPost !== "" && tranFromPost !== validated.tranId) {
    logger.warn("SSLCommerz IPN tran_id mismatch", {
      tranFromPost,
      validatedTranId: validated.tranId,
    });
    res.status(200).type("text/plain").send("INVALID");
    return;
  }

  const payment = await findPaymentById(validated.tranId);
  if (!payment) {
    logger.warn("SSLCommerz IPN: payment not found for tran_id", { tranId: validated.tranId });
    res.status(200).type("text/plain").send("INVALID");
    return;
  }

  const prov = normalizeProvider(payment.provider);
  if (prov !== "sslcommerz") {
    logger.warn("SSLCommerz IPN: provider mismatch", { paymentId: payment.id, provider: payment.provider });
    res.status(200).type("text/plain").send("SUCCESS");
    return;
  }

  try {
    if (payment.status === PaymentStatus.SUCCESS) {
      res.status(200).type("text/plain").send("SUCCESS");
      return;
    }
    await finalizePaymentAsSuccessfulFromGateway(payment, validated.valId ?? valId);
    res.status(200).type("text/plain").send("SUCCESS");
  } catch (err) {
    logger.error("SSLCommerz IPN finalize error", {
      paymentId: payment.id,
      message: err instanceof Error ? err.message : String(err),
    });
    res.status(200).type("text/plain").send("SUCCESS");
  }
});

/**
 * ShurjoPay async notification (configure in dashboard when available).
 * Resolves `Payment` by `transactionId` (order id) then re-checks status with Shurjo API.
 */
export const shurjoPayIpnHandler = asyncHandler(async (req: Request, res: Response) => {
  const orderId = readShurjoOrderId(req.body);
  if (orderId === "") {
    res.status(400).json({ ok: false, error: "order_id required" });
    return;
  }

  const payment = await findPaymentByTransactionId(orderId);
  if (!payment) {
    logger.warn("ShurjoPay IPN: payment not found for order_id", { orderId });
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  const prov = normalizeProvider(payment.provider);
  if (prov !== "shurjopay") {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  if (payment.status === PaymentStatus.SUCCESS) {
    res.status(200).json({ ok: true, duplicate: true });
    return;
  }

  const providerResult = await shurjoPayPaymentProvider.verifyPayment({
    paymentId: payment.id,
    transactionId: payment.transactionId ?? undefined,
  });

  if (providerResult.status !== "SUCCESS") {
    res.status(200).json({ ok: true, pending: true });
    return;
  }

  try {
    await finalizePaymentAsSuccessfulFromGateway(payment, providerResult.transactionId ?? null);
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error("ShurjoPay IPN finalize error", {
      paymentId: payment.id,
      message: err instanceof Error ? err.message : String(err),
    });
    res.status(200).json({ ok: true });
  }
});
