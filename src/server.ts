import "./config/env";

import { createApp } from "./app";
import { config } from "./config/env";
import { connectDB } from "./config/database";
import { logger } from "./lib/logger/logger";

// Boot: DB then HTTP server. Uses validated PORT from config.

async function bootstrap(): Promise<void> {
  await connectDB();

  const app = createApp();
  const port = config.PORT;

  app.listen(port, () => {
    logger.info("Server started", {
      url: `http://localhost:${port}`,
      nodeEnv: config.NODE_ENV,
    });
  });
}

bootstrap().catch((err: unknown) => {
  logger.error("Server startup failed", {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
