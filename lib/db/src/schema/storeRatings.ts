import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// A customer's 1–5 star rating of a store for a specific delivered order.
// Keyed uniquely by orderId so a customer can rate each order exactly once
// (the "rate your order" link they get on WhatsApp after delivery leads here).
// The store's aggregate (storesTable.ratingSum / ratingCount) is updated
// alongside inserts so the average shown to shoppers is cheap to read.
export const storeRatingsTable = pgTable("store_ratings", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().unique(),
  storeId: integer("store_id").notNull(),
  customerPhone: text("customer_phone").notNull(),
  // 1..5 stars.
  stars: integer("stars").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertStoreRatingSchema = createInsertSchema(
  storeRatingsTable,
).omit({ id: true, createdAt: true });
export type InsertStoreRating = z.infer<typeof insertStoreRatingSchema>;
export type StoreRating = typeof storeRatingsTable.$inferSelect;
