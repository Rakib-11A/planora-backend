import { ApiError } from "../../utils/ApiError";
import {
  createReview,
  deleteReviewById,
  findApprovedParticipation,
  findEventByIdForReview,
  findReviewByUserAndEvent,
  getEventRatingSummary,
  listEventReviews,
  updateReviewById,
} from "./review.repository";
import type { CreateReviewInput, UpdateReviewInput } from "./review.validation";

export async function createReviewService(
  eventId: string,
  userId: string,
  input: CreateReviewInput,
): Promise<{ message: string }> {
  const event = await findEventByIdForReview(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const participation = await findApprovedParticipation(userId, eventId);
  if (!participation) {
    throw new ApiError(403, "Only approved participants can review this event");
  }

  const existing = await findReviewByUserAndEvent(userId, eventId);
  if (existing) {
    throw new ApiError(409, "You have already reviewed this event");
  }

  await createReview({
    userId,
    eventId,
    rating: input.rating,
    comment: input.comment,
  });

  return { message: "Review created successfully" };
}

export async function updateReviewService(
  eventId: string,
  userId: string,
  input: UpdateReviewInput,
): Promise<{ message: string }> {
  const event = await findEventByIdForReview(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const review = await findReviewByUserAndEvent(userId, eventId);
  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  await updateReviewById(review.id, {
    rating: input.rating,
    comment: input.comment,
  });

  return { message: "Review updated successfully" };
}

export async function deleteReviewService(
  eventId: string,
  userId: string,
): Promise<{ message: string }> {
  const event = await findEventByIdForReview(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const review = await findReviewByUserAndEvent(userId, eventId);
  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  await deleteReviewById(review.id);
  return { message: "Review deleted successfully" };
}

export async function getEventReviewsService(eventId: string) {
  const event = await findEventByIdForReview(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  return listEventReviews(eventId);
}

export async function getEventReviewSummaryService(eventId: string) {
  const event = await findEventByIdForReview(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  return getEventRatingSummary(eventId);
}

