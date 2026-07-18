import {
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Multi-vendor marketplace stores. Any kind of shop (not only produce): a
// merchant registers a store with a name/address/type/details, an admin
// reviews it, and once "مفعّل" it appears to customers who shop it on its own.
export const storesTable = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  description: text("description"),
  // Kind of shop, free text, e.g. "خضار وفواكه", "بقالة", "لحوم", "مخبز".
  storeType: text("store_type").notNull(),
  // The merchant account (phone) that registered and manages this store.
  ownerPhone: text("owner_phone").notNull(),
  imageUrl: text("image_url"),
  // "قيد المراجعة" (pending) → "مفعّل" (active) | "مرفوض" (rejected).
  status: text("status").notNull().default("قيد المراجعة"),
  // Subscription (100k IQD / 3 months) expiry, set by the admin on approval.
  subscriptionExpiresAt: timestamp("subscription_expires_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertStoreSchema = createInsertSchema(storesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof storesTable.$inferSelect;
