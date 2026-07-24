import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { RECIPE_SEED } from "./lib/recipeSeed";

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
    // Multiple product images (gallery). imageUrl stays the primary/first one.
    await pool.query(
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls jsonb;`,
    );
    // Free-trial flag on stores (caps how many free trials one phone can start).
    await pool.query(
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false;`,
    );
    // Merchant-written delivery-coverage note (which areas the listed delivery
    // prices cover, and that anywhere else costs 5,000). Shown in the cart.
    await pool.query(
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS delivery_note text;`,
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
    // Driver KYC documents (personal photo + unified ID card + residence card).
    await pool.query(
      `ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS photo_url text;`,
    );
    await pool.query(
      `ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS id_card_url text;`,
    );
    await pool.query(
      `ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS residence_card_url text;`,
    );
    // Recipes for the "شنو نطبخ اليوم؟" helper — now admin-managed in the DB.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id serial PRIMARY KEY,
        name text NOT NULL,
        keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    // Seed the initial recipe list only once (when the table is still empty),
    // so the admin has the full list to edit from day one.
    const { rows: recipeCount } = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM recipes;`,
    );
    if (Number(recipeCount[0]?.count ?? 0) === 0) {
      let i = 0;
      for (const r of RECIPE_SEED) {
        await pool.query(
          `INSERT INTO recipes (name, keywords, sort_order) VALUES ($1, $2::jsonb, $3);`,
          [r.name, JSON.stringify(r.keywords), i],
        );
        i += 1;
      }
      logger.info({ seeded: RECIPE_SEED.length }, "Seeded recipes table");
    }
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
