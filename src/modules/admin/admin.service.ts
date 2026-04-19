import { getRedisClient } from "../../config/redis";
import {
  STATS_KEY_HITS,
  STATS_KEY_MISSES,
  STATS_KEY_TOP_KEYS,
} from "../../shared/constants/cache.constants";
import { RATE_LIMIT_BLOCKED_PREFIX } from "../../shared/constants/rateLimit.constants";
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
import {
  invalidateEventAndReviewCaches,
  invalidateEventListCaches,
} from "../../shared/utils/cache";
import { clearFeaturedIfMatchesEventId, getFeaturedEventId, setFeaturedEventId } from "../site/site-settings.repository";
import { findEventById } from "../event/event.repository";
import { toEventWithType } from "../event/event.service";
import type { EventWithType } from "../event/event.types";

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

export async function getSiteFeaturedService(): Promise<{
  featuredEventId: string | null;
  event: EventWithType | null;
  warning: string | null;
}> {
  const featuredEventId = await getFeaturedEventId();
  if (!featuredEventId) {
    return { featuredEventId: null, event: null, warning: null };
  }
  const event = await findEventById(featuredEventId);
  if (!event) {
    return {
      featuredEventId,
      event: null,
      warning: "The featured event no longer exists. Clear the selection or pick another event.",
    };
  }
  const typed = toEventWithType(event);
  if (!event.isPublic) {
    return {
      featuredEventId,
      event: typed,
      warning: "This event is private. The public homepage will not show it until the event is public.",
    };
  }
  return { featuredEventId, event: typed, warning: null };
}

export async function setSiteFeaturedService(eventId: string | null): Promise<{
  featuredEventId: string | null;
  event: EventWithType | null;
}> {
  if (eventId === null) {
    await setFeaturedEventId(null);
    void invalidateEventListCaches();
    return { featuredEventId: null, event: null };
  }

  const event = await findEventById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  if (!event.isPublic) {
    throw new ApiError(400, "Only public events can be featured on the homepage");
  }

  await setFeaturedEventId(eventId);
  void invalidateEventListCaches();
  return { featuredEventId: eventId, event: toEventWithType(event) };
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
  void clearFeaturedIfMatchesEventId(eventId);
  void invalidateEventAndReviewCaches(eventId);
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

  const eventId = review.eventId;
  await softDeleteReviewById(reviewId);
  void invalidateEventAndReviewCaches(eventId);
  return { message: "Review deleted successfully" };
}

export type CacheStatsResult =
  | {
      degraded: true;
      totalKeys: number;
      memoryUsed: string | null;
      hitRatePercent: number | null;
      hits: number;
      misses: number;
      topKeys: { key: string; score: number }[];
    }
  | {
      degraded: false;
      totalKeys: number;
      memoryUsed: string | null;
      hitRatePercent: number | null;
      hits: number;
      misses: number;
      topKeys: { key: string; score: number }[];
    };

export async function getCacheStatsService(): Promise<CacheStatsResult> {
  const redis = getRedisClient();
  const empty: CacheStatsResult = {
    degraded: true,
    totalKeys: 0,
    memoryUsed: null,
    hitRatePercent: null,
    hits: 0,
    misses: 0,
    topKeys: [],
  };

  if (!redis) {
    return empty;
  }

  try {
    const totalKeys = await redis.dbsize();
    const info = await redis.info("memory");
    let memoryUsed: string | null = null;
    const memMatch = info.match(/used_memory_human:([^\r\n]+)/);
    if (memMatch?.[1]) {
      memoryUsed = memMatch[1].trim();
    }

    const hitsRaw = await redis.get(STATS_KEY_HITS);
    const missesRaw = await redis.get(STATS_KEY_MISSES);
    const hits = Number.parseInt(hitsRaw ?? "0", 10);
    const misses = Number.parseInt(missesRaw ?? "0", 10);
    const denom = hits + misses;
    const hitRatePercent =
      denom === 0 ? null : Number(((hits / denom) * 100).toFixed(2));

    const z = await redis.zrevrange(STATS_KEY_TOP_KEYS, 0, 9, "WITHSCORES");
    const topKeys: { key: string; score: number }[] = [];
    for (let i = 0; i < z.length; i += 2) {
      const key = z[i];
      const score = z[i + 1];
      if (key !== undefined && score !== undefined) {
        topKeys.push({ key, score: Number.parseFloat(score) });
      }
    }

    return {
      degraded: false,
      totalKeys,
      memoryUsed,
      hitRatePercent,
      hits,
      misses,
      topKeys,
    };
  } catch {
    return empty;
  }
}

export type RateLimitStatsResult = {
  degraded: boolean;
  fetchedAt: string;
  buckets: { bucket: string; blockedCount: number }[];
};

export async function getRateLimitStatsService(): Promise<RateLimitStatsResult> {
  const redis = getRedisClient();
  const fetchedAt = new Date().toISOString();
  if (!redis) {
    return { degraded: true, fetchedAt, buckets: [] };
  }

  try {
    const buckets: { bucket: string; blockedCount: number }[] = [];
    let cursor = "0";
    const pattern = `${RATE_LIMIT_BLOCKED_PREFIX}:*`;
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        200,
      );
      cursor = next;
      for (const key of keys) {
        const val = await redis.get(key);
        const bucket = key.slice(RATE_LIMIT_BLOCKED_PREFIX.length + 1);
        buckets.push({
          bucket,
          blockedCount: Number.parseInt(val ?? "0", 10),
        });
      }
    } while (cursor !== "0");

    buckets.sort((a, b) => a.bucket.localeCompare(b.bucket));
    return { degraded: false, fetchedAt, buckets };
  } catch {
    return { degraded: true, fetchedAt, buckets: [] };
  }
}

