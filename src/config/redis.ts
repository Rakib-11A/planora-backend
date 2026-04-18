import Redis from "ioredis";

import { config } from "./env";
import { logger } from "../lib/logger/logger";

let client: Redis | null | undefined;

/**
 * Singleton Redis client. Returns null when REDIS_HOST is empty (caching disabled).
 */
export function getRedisClient(): Redis | null {
  if (!config.REDIS_HOST) {
    return null;
  }
  if (client !== undefined) {
    return client;
  }

  try {
    client = new Redis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD === "" ? undefined : config.REDIS_PASSWORD,
      db: config.REDIS_DB,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      retryStrategy(times: number) {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 150, 2000);
      },
    });

    client.on("error", (err: Error) => {
      logger.error("Redis client error", { message: err.message });
    });
  } catch {
    client = null;
  }

  return client;
}
