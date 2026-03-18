import "dotenv/config";

type NodeEnv = "development" | "production" | "test";

/**
 * Read a required string env var; throws before the app boots if missing or blank.
 */
function requiredString(key: string): string {
  const raw = process.env[key] as string | undefined;
  if (raw === undefined || raw.trim() === "") {
    throw new Error(
      `[env] Missing or empty required environment variable: ${key}. Check .env against .env.example.`,
    );
  }
  return raw.trim();
}

/*
* Parse PORT; defaults to 5000 when unset (matches server convention).
*/
function parsePort(): number {
  const raw = process.env.PORT as string | undefined;
  if (raw === undefined || raw.trim() === "") {
    return 5000;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1 || n > 65535) {
    throw new Error(`[env] Invalid PORT: "${raw}". Use an integer 1–65535.`);
  }
  return n;
}

/*
* Ensure NODE_ENV is one of the standard values.
*/
function parseNodeEnv(): NodeEnv {
  const v = requiredString("NODE_ENV").toLowerCase() as string;
  if (v !== "development" && v !== "production" && v !== "test") {
    throw new Error(
      `[env] NODE_ENV must be "development", "production", or "test"; got "${v}".`,
    );
  }
  return v as NodeEnv;
}

const NODE_ENV = parseNodeEnv();

/**
 * Central, validated configuration (single source of truth after dotenv).
 */
export const config = {
  PORT: parsePort(),
  DATABASE_URL: requiredString("DATABASE_URL"),
  JWT_SECRET: requiredString("JWT_SECRET"),
  JWT_EXPIRES_IN: requiredString("JWT_EXPIRES_IN"),
  NODE_ENV,
  FRONTEND_URL: requiredString("FRONTEND_URL"),
} as const;

export type AppConfig = typeof config;
