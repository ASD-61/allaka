import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

// Lightweight, idempotent startup migration for tables that were added without
// a full drizzle-kit push against the managed DB. Safe to run on every boot.
async function ensureSchema(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key text PRIMARY KEY,
        value text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await pool.query(
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price integer;`,
    );
    await pool.query(
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS price_note text;`,
    );
  } catch (err) {
    logger.warn({ err }, "ensureSchema failed (non-fatal)");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

ensureSchema().finally(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
