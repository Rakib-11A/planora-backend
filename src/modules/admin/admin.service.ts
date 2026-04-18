import { ApiError } from "../../utils/ApiError";
import {
  findEventByIdForAdmin,
  findReviewByIdForAdmin,
  findUserByIdForAdmin,
  isAdminRole,
  listEventsForAdmin,
  listReviewsForAdmin,
  listUsersForAdmin,
  revokeAllRefreshTokens,
  setUserBanState,
  softDeleteEventById,
  softDeleteReviewById,
} from "./admin.repository";
import type {
  AdminEventsQueryInput,
  AdminReviewsQueryInput,
  AdminUsersQueryInput,
} from "./admin.validation";

function paginated<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getAllUsersService(query: AdminUsersQueryInput) {
  const { items, total } = await listUsersForAdmin(query);
  return paginated(items, total, query.page, query.limit);
}

export async function banUserService(userId: string) {
  const user = await findUserByIdForAdmin(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (isAdminRole(user.role)) {
    throw new ApiError(409, "Admin user cannot be banned");
  }
  if (user.isBanned) {
    throw new ApiError(409, "User is already banned");
  }

  const updated = await setUserBanState(userId, true);
  await revokeAllRefreshTokens(userId);

  return { message: "User banned successfully", user: updated };
}

export async function unbanUserService(userId: string) {
  const user = await findUserByIdForAdmin(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (!user.isBanned) {
    throw new ApiError(409, "User is not banned");
  }

  const updated = await setUserBanState(userId, false);
  return { message: "User unbanned successfully", user: updated };
}

export async function getAllEventsService(query: AdminEventsQueryInput) {
  const { items, total } = await listEventsForAdmin(query);
  return paginated(items, total, query.page, query.limit);
}

export async function deleteEventService(eventId: string) {
  const event = await findEventByIdForAdmin(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  if (event.deletedAt) {
    throw new ApiError(409, "Event already deleted");
  }

  await softDeleteEventById(eventId);
  return { message: "Event deleted successfully" };
}

export async function getAllReviewsService(query: AdminReviewsQueryInput) {
  const { items, total } = await listReviewsForAdmin(query);
  return paginated(items, total, query.page, query.limit);
}

export async function deleteReviewService(reviewId: string) {
  const review = await findReviewByIdForAdmin(reviewId);
  if (!review) {
    throw new ApiError(404, "Review not found");
  }
  if (review.deletedAt) {
    throw new ApiError(409, "Review already deleted");
  }

  await softDeleteReviewById(reviewId);
  return { message: "Review deleted successfully" };
}

