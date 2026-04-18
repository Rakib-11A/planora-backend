import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../types";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  getMyPaymentsService,
  initiatePaymentService,
  verifyPaymentService,
} from "./payment.service";
import { myPaymentsQuerySchema } from "./payment.validation";

function requireUserId(req: Request): string {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  return userId;
}

export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const eventId = req.params.eventId;
  if (!eventId) {
    throw new ApiError(400, "eventId is required");
  }

  const result = await initiatePaymentService(eventId, userId);
  res
    .status(200)
    .json(new ApiResponse(200, result, "Payment initiated successfully"));
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const paymentId = req.params.paymentId;
  if (!paymentId) {
    throw new ApiError(400, "paymentId is required");
  }

  const result = await verifyPaymentService(paymentId, userId);
  res.status(200).json(new ApiResponse(200, result, "Payment verification completed"));
});

export const getMyPayments = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { page, limit } = myPaymentsQuerySchema.parse(req.query);
  const data = await getMyPaymentsService(userId, page, limit);
  res.status(200).json(new ApiResponse(200, data, "Payments fetched successfully"));
});

