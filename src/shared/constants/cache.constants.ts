export const CACHE_VERSION = "v1";

/** All application cache entries use this prefix (invalidation targets this, not stats). */
export const CACHE_PREFIX = `cache:${CACHE_VERSION}`;

export const CACHE_STATS_PREFIX = `${CACHE_PREFIX}:stats`;

export const STATS_KEY_HITS = `${CACHE_STATS_PREFIX}:hits`;

export const STATS_KEY_MISSES = `${CACHE_STATS_PREFIX}:misses`;

export const STATS_KEY_TOP_KEYS = `${CACHE_STATS_PREFIX}:key_hits`;

/** TTLs in seconds */
export const TTL_EVENTS_LIST_SEC = 300;

export const TTL_EVENTS_DETAIL_SEC = 120;

export const TTL_REVIEW_SUMMARY_SEC = 600;

export const TTL_MY_PARTICIPATIONS_SEC = 60;

export const TTL_MY_NOTIFICATIONS_SEC = 30;
