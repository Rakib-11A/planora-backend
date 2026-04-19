import { ApiError } from "../../utils/ApiError";
import {
  createReview,
  findAnyReviewByUserAndEvent,
  deleteReviewById,
  findApprovedParticipation,
  findEventByIdForReview,
  findReviewByUserAndEvent,
  getEventRatingSummary,
  listEventReviews,
  listMyReviews,
  updateReviewById,
} from "./review.repository";
import type { CreateReviewInput, MyReviewsQueryInput, UpdateReviewInput } from "./review.validation";
import { paginate } from "../../shared/utils/pagination";
import { invalidateEventAndReviewCaches } from "../../shared/utils/cache";

function assertWithinReviewEditWindow(event: { dateTime: Date }): void {
  const raw = Number(process.env.REVIEW_EDIT_WINDOW_HOURS ?? "336");
  const hours = Number.isFinite(raw) && raw > 0 ? raw : 336;
  const deadlineMs = event.dateTime.getTime() + hours * 60 * 60 * 1000;
  if (Date.now() > deadlineMs) {
    throw new ApiError(400, "The review edit period for this event has ended");
  }
}

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

  const existing = await findAnyReviewByUserAndEvent(userId, eventId);
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

  assertWithinReviewEditWindow(event);

  await updateReviewById(review.id, {
    rating: input.rating,
    comment: input.comment,
  });

  void invalidateEventAndReviewCaches(eventId);

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

  assertWithinReviewEditWindow(event);

  await deleteReviewById(review.id);
  void invalidateEventAndReviewCaches(eventId);
  return { message: "Review deleted successfully" };
}

export async function getEventReviewsService(
  eventId: string,
  page: number,
  limit: number,
) {
  const event = await findEventByIdForReview(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  const { items, total } = await listEventReviews(eventId, page, limit);
  return paginate({ page, limit }, total, items);
}

export async function getEventReviewSummaryService(eventId: string) {
  const event = await findEventByIdForReview(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  return getEventRatingSummary(eventId);
}

export async function getMyReviewsService(userId: string, query: MyReviewsQueryInput) {
  const { items, total } = await listMyReviews(userId, query.page, query.limit);
  return paginate({ page: query.page, limit: query.limit }, total, items);
}

