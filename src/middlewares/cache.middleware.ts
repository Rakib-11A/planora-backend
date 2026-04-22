import { createHash } from "crypto";
import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "../types";
import {
  CACHE_PREFIX,
  TTL_EVENTS_DETAIL_SEC,
  TTL_EVENTS_LIST_SEC,
  TTL_MY_NOTIFICATIONS_SEC,
  TTL_MY_PARTICIPATIONS_SEC,
  TTL_REVIEW_SUMMARY_SEC,
} from "../shared/constants/cache.constants";
import { cache } from "../shared/utils/cache";

export type CacheSegment =
  | "events-list"
  | "events-detail"
  | "reviews-summary"
  | "participations-me"
  | "notifications-me";

function normalizeQuery(req: Request): string {
  const q = req.query as Record<string, unknown>;
  return Object.keys(q)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}=${String(q[k] ?? "")}`)
    .join("&");
}

function queryHash(req: Request): string {
  return createHash("sha256").update(normalizeQuery(req)).digest("hex").slice(0, 32);
}

export function buildCacheKey(segment: CacheSegment, req: Request): string {
  const qh = queryHash(req);
  switch (segment) {
    case "events-list": {
      const viewer = (req as AuthenticatedRequest).user?.id ?? "anon";
      return `${CACHE_PREFIX}:events:list:viewer:${viewer}:qh:${qh}`;
    }
    case "events-detail": {
      const id = req.params.id;
      const viewer = (req as AuthenticatedRequest).user?.id ?? "anon";
      return `${CACHE_PREFIX}:events:detail:id:${id}:viewer:${viewer}:qh:${qh}`;
    }
    case "reviews-summary": {
      const eventId = req.params.eventId;
      return `${CACHE_PREFIX}:reviews:summary:event:${eventId}:qh:${qh}`;
    }
    case "participations-me": {
      const uid = (req as AuthenticatedRequest).user?.id ?? "anon";
      return `${CACHE_PREFIX}:participations:me:user:${uid}:qh:${qh}`;
    }
    case "notifications-me": {
      const uid = (req as AuthenticatedRequest).user?.id ?? "anon";
      return `${CACHE_PREFIX}:notifications:me:user:${uid}:qh:${qh}`;
    }
    default: {
      const _exhaustive: never = segment;
      return _exhaustive;
    }
  }
}

type CachedEnvelope = {
  statusCode?: number;
  data?: unknown;
  message?: string;
  success?: boolean;
};

export function cacheMiddleware(ttlSec: number, segment: CacheSegment) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== "GET") {
      next();
      return;
    }

    const key = buildCacheKey(segment, req);

    const cached = await cache.get<CachedEnvelope>(key);
    if (
      cached !== null &&
      typeof cached === "object" &&
      cached.statusCode !== undefined &&
      typeof cached.statusCode === "number"
    ) {
      void cache.recordHit(key).catch(() => undefined);
      res.status(cached.statusCode).json(cached);
      return;
    }

    void cache.recordMiss().catch(() => undefined);

    const originalJson = res.json.bind(res) as Response["json"];
    res.json = function cacheAwareJson(body: unknown) {
      const status = res.statusCode;
      if (status >= 200 && status < 300) {
        void cache
          .set(key, body, ttlSec)
          .then(() => cache.recordKeyWarm(key))
          .catch(() => undefined);
      }
      return originalJson(body);
    };

    next();
  };
}

/** Preset middleware factories (seconds per CACHING_STRATEGY.md). */
export const cacheEventsList = cacheMiddleware(TTL_EVENTS_LIST_SEC, "events-list");
export const cacheEventsDetail = cacheMiddleware(TTL_EVENTS_DETAIL_SEC, "events-detail");
export const cacheReviewSummary = cacheMiddleware(TTL_REVIEW_SUMMARY_SEC, "reviews-summary");
export const cacheMyParticipations = cacheMiddleware(
  TTL_MY_PARTICIPATIONS_SEC,
  "participations-me",
);
export const cacheMyNotifications = cacheMiddleware(
  TTL_MY_NOTIFICATIONS_SEC,
  "notifications-me",
);
