import type Redis from "ioredis";

import { getRedisClient } from "../../config/redis";
import {
  CACHE_PREFIX,
  STATS_KEY_HITS,
  STATS_KEY_MISSES,
  STATS_KEY_TOP_KEYS,
} from "../constants/cache.constants";

const SCAN_COUNT = 200;

function getClient(): Redis | null {
  return getRedisClient();
}

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const redis = getClient();
    if (!redis) return null;
    try {
      const raw = await redis.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const redis = getClient();
    if (!redis) return;
    try {
      const payload = JSON.stringify(value);
      await redis.setex(key, ttlSeconds, payload);
    } catch {
      // fail open
    }
  }

  async del(keys: string | string[]): Promise<void> {
    const redis = getClient();
    if (!redis) return;
    const list = Array.isArray(keys) ? keys : [keys];
    if (list.length === 0) return;
    try {
      await redis.del(...list);
    } catch {
      // fail open
    }
  }

  /**
   * Deletes keys matching `pattern` using SCAN (not KEYS).
   */
  async delPattern(pattern: string): Promise<void> {
    const redis = getClient();
    if (!redis) return;
    try {
      let cursor = "0";
      do {
        const [next, batch] = await redis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          SCAN_COUNT,
        );
        cursor = next;
        if (batch.length > 0) {
          await redis.del(...batch);
        }
      } while (cursor !== "0");
    } catch {
      // fail open
    }
  }

  async recordHit(cacheKey: string): Promise<void> {
    const redis = getClient();
    if (!redis) return;
    try {
      await redis
        .multi()
        .incr(STATS_KEY_HITS)
        .zincrby(STATS_KEY_TOP_KEYS, 1, cacheKey)
        .exec();
    } catch {
      // ignore
    }
  }

  async recordMiss(): Promise<void> {
    const redis = getClient();
    if (!redis) return;
    try {
      await redis.incr(STATS_KEY_MISSES);
    } catch {
      // ignore
    }
  }

  async recordKeyWarm(cacheKey: string): Promise<void> {
    const redis = getClient();
    if (!redis) return;
    try {
      await redis.zincrby(STATS_KEY_TOP_KEYS, 1, cacheKey);
    } catch {
      // ignore
    }
  }
}

export const cache = new CacheService();

/** Invalidate all public event list caches. */
export async function invalidateEventListCaches(): Promise<void> {
  await cache.delPattern(`${CACHE_PREFIX}:events:list:*`);
}

/** Invalidate cached event detail for one event (all viewers). */
export async function invalidateEventDetailCaches(eventId: string): Promise<void> {
  await cache.delPattern(`${CACHE_PREFIX}:events:detail:id:${eventId}:*`);
}

/** Invalidate review summary for one event. */
export async function invalidateReviewSummaryCaches(eventId: string): Promise<void> {
  await cache.delPattern(`${CACHE_PREFIX}:reviews:summary:event:${eventId}:*`);
}

export async function invalidateUserParticipationCaches(userId: string): Promise<void> {
  await cache.delPattern(`${CACHE_PREFIX}:participations:me:user:${userId}:*`);
}

export async function invalidateUserNotificationCaches(userId: string): Promise<void> {
  await cache.delPattern(`${CACHE_PREFIX}:notifications:me:user:${userId}:*`);
}

/** After event/review mutations that affect ratings or list cards. */
export async function invalidateEventAndReviewCaches(eventId: string): Promise<void> {
  await Promise.all([
    invalidateEventListCaches(),
    invalidateEventDetailCaches(eventId),
    invalidateReviewSummaryCaches(eventId),
  ]);
}

/** Participation or payment changed membership for an event. */
export async function invalidateParticipationSideEffects(
  userId: string,
  eventId: string,
): Promise<void> {
  await Promise.all([
    invalidateUserParticipationCaches(userId),
    invalidateEventListCaches(),
    invalidateEventDetailCaches(eventId),
  ]);
}
