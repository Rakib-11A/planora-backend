import "dotenv/config";

type NodeEnv = "development" | "production" | "test";

function requiredString(key: string): string {
  const raw = process.env[key] as string | undefined;
  if (raw === undefined || raw.trim() === "") {
    throw new Error(
      `[env] Missing or empty required environment variable: ${key}. Check .env against .env.example.`,
    );
  }
  return raw.trim();
}

function optionalString(key: string, defaultValue: string): string {
  const raw = process.env[key] as string | undefined;
  if (raw === undefined || raw.trim() === "") {
    return defaultValue;
  }
  return raw.trim();
}

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

function parseSmtpPort(): number {
  const raw = process.env.SMTP_PORT as string | undefined;
  if (raw === undefined || raw.trim() === "") {
    return 587;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1 || n > 65535) {
    throw new Error(`[env] Invalid SMTP_PORT: "${raw}".`);
  }
  return n;
}

function parseRedisPort(): number {
  const raw = process.env.REDIS_PORT as string | undefined;
  if (raw === undefined || raw.trim() === "") {
    return 6379;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1 || n > 65535) {
    throw new Error(`[env] Invalid REDIS_PORT: "${raw}".`);
  }
  return n;
}

function parseRedisDb(): number {
  const raw = process.env.REDIS_DB as string | undefined;
  if (raw === undefined || raw.trim() === "") {
    return 0;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0 || n > 15) {
    throw new Error(`[env] Invalid REDIS_DB: "${raw}". Use 0–15.`);
  }
  return n;
}

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

const JWT_ACCESS_SECRET = requiredString("JWT_ACCESS_SECRET");
const JWT_REFRESH_SECRET = requiredString("JWT_REFRESH_SECRET");
if (JWT_ACCESS_SECRET === JWT_REFRESH_SECRET) {
  throw new Error(
    "[env] JWT_REFRESH_SECRET must be different from JWT_ACCESS_SECRET.",
  );
}

export const config = {
  PORT: parsePort(),
  DATABASE_URL: requiredString("DATABASE_URL"),
  NODE_ENV,
  FRONTEND_URL: requiredString("FRONTEND_URL"),

  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: optionalString("JWT_ACCESS_EXPIRES_IN", "15m"),
  JWT_REFRESH_EXPIRES_IN: optionalString("JWT_REFRESH_EXPIRES_IN", "7d"),

  SMTP_HOST: optionalString("SMTP_HOST", "smtp.gmail.com"),
  SMTP_PORT: parseSmtpPort(),
  SMTP_USER: optionalString("SMTP_USER", ""),
  SMTP_PASS: optionalString("SMTP_PASS", ""),
  SMTP_FROM: optionalString("SMTP_FROM", ""),

  BREVO_API_KEY: optionalString("BREVO_API_KEY", ""),
  BREVO_SENDER_EMAIL: optionalString("BREVO_SENDER_EMAIL", "monsterzx175@gmail.com"),
  BREVO_SENDER_NAME: optionalString("BREVO_SENDER_NAME", "Planora"),

  BETTER_AUTH_SECRET: requiredString("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: requiredString("BETTER_AUTH_URL"),
  GOOGLE_CLIENT_ID: requiredString("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: requiredString("GOOGLE_CLIENT_SECRET"),

  /** Empty REDIS_HOST disables Redis caching (fail-open to DB-only). */
  REDIS_HOST: optionalString("REDIS_HOST", ""),
  REDIS_PORT: parseRedisPort(),
  REDIS_PASSWORD: optionalString("REDIS_PASSWORD", ""),
  REDIS_DB: parseRedisDb(),

  /** Optional; when set, matching `x-bypass-token` header skips rate limits (testing only). */
  RATE_LIMIT_BYPASS_TOKEN: optionalString("RATE_LIMIT_BYPASS_TOKEN", ""),

  /**
   * Refresh-cookie SameSite policy: `lax` | `strict` | `none`.
   * Default: `lax` in development (cross-port localhost) and `strict` in production (same-site subdomains).
   */
  COOKIE_SAME_SITE: ((): "lax" | "strict" | "none" => {
    const raw = optionalString("COOKIE_SAME_SITE", "").toLowerCase();
    if (raw === "lax" || raw === "strict" || raw === "none") {
      return raw;
    }
    return NODE_ENV === "production" ? "strict" : "lax";
  })(),
} as const;

export function isSmtpSecure(): boolean {
  return config.SMTP_PORT === 465;
}

export type AppConfig = typeof config;
