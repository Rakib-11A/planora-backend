// Load and validate env first — fails fast if .env is incomplete.
import "./config/env";

import { createApp } from "./app";
import { config } from "./config/env";
import { connectDB } from "./config/database";

/**
 * Boot: DB then HTTP server. Uses validated PORT from config.
 */
async function bootstrap(): Promise<void> {
  await connectDB();

  const app = createApp();
  const port = config.PORT;

  app.listen(port, () => {
    console.log(`planora-backend listening on http://localhost:${port}`);
    console.log(`NODE_ENV=${config.NODE_ENV}`);
  });
}

bootstrap().catch((err: unknown) => {
  console.error("[server] Startup failed:", err);
  process.exit(1);
});
