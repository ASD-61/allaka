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
    // In-app notifications feed (refund decisions, delivery updates, …).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id serial PRIMARY KEY,
        recipient_phone text NOT NULL,
        type text NOT NULL DEFAULT 'system',
        title text NOT NULL,
        body text NOT NULL,
        data jsonb,
        read_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON notifications (recipient_phone);`,
    );
    // Extra refund columns: multiple photos + customer note + reject reason.
    await pool.query(
      `ALTER TABLE refunds ADD COLUMN IF NOT EXISTS image_urls jsonb;`,
    );
    await pool.query(`ALTER TABLE refunds ADD COLUMN IF NOT EXISTS note text;`);
    await pool.query(
      `ALTER TABLE refunds ADD COLUMN IF NOT EXISTS reject_reason text;`,
    );
    // Per-store loyalty points (points accumulate independently per store).
    await pool.query(
      `ALTER TABLE customer_store_wallets ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;`,
    );
    // Per-customer store follows (favourites).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_follows (
        id serial PRIMARY KEY,
        customer_phone text NOT NULL,
        store_id integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (customer_phone, store_id)
      );
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS store_follows_customer_idx ON store_follows (customer_phone);`,
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
