/** Redis keys: `rate:v1:blocked:<bucket>` — incremented on each 429 from limiters. */
export const RATE_LIMIT_BLOCKED_PREFIX = "rate:v1:blocked";
