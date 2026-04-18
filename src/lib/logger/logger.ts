import fs from "node:fs";
import path from "node:path";

import { createLogger, format, transports } from "winston";

import { config } from "../../config/env";

const logsDir = path.resolve(process.cwd(), "logs");
fs.mkdirSync(logsDir, { recursive: true });

const loggerInstance = createLogger({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.metadata({
      fillExcept: ["timestamp", "level", "message", "stack"],
    }),
    format.json(),
  ),
  transports: [
    new transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      handleExceptions: true,
    }),
    new transports.File({
      filename: path.join(logsDir, "combined.log"),
      handleExceptions: true,
    }),
  ],
  exitOnError: false,
});

if (config.NODE_ENV !== "production") {
  loggerInstance.add(
    new transports.Console({
      handleExceptions: true,
      format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ timestamp, level, message, metadata, stack }) => {
          const meta = metadata !== undefined ? ` ${JSON.stringify(metadata)}` : "";
          const stackText = typeof stack === "string" && stack !== "" ? `\n${stack}` : "";
          return `[${timestamp}] ${level}: ${message}${meta}${stackText}`;
        }),
      ),
    }),
  );
}

loggerInstance.on("error", () => {
  // Logging failures must never crash request handling.
});

type LogMeta = Record<string, unknown>;
type Level = "error" | "warn" | "info" | "debug";

function safeLog(level: Level, message: string, meta?: LogMeta): void {
  try {
    loggerInstance.log(level, message, meta ?? {});
  } catch {
    // swallow: logger failure must not break app flow
  }
}

export const logger = {
  error: (message: string, meta?: LogMeta) => safeLog("error", message, meta),
  warn: (message: string, meta?: LogMeta) => safeLog("warn", message, meta),
  info: (message: string, meta?: LogMeta) => safeLog("info", message, meta),
  debug: (message: string, meta?: LogMeta) => safeLog("debug", message, meta),
};
