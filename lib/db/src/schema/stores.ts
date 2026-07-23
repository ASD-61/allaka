import {
  pgTable,
  serial,
  text,
  timestamp,
  real,
  integer,
  boolean,
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
  // Precise pin the merchant drops on the map when registering/editing the
  // store, used to send customers a Google Maps link to the store.
  latitude: real("latitude"),
  longitude: real("longitude"),
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
  // Whether this store was created on a free trial (used to cap how many free
  // trials a single phone number may start).
  isTrial: boolean("is_trial").notNull().default(false),
  // The plan (in months: 3/6/12) the MERCHANT picked when registering — a
  // request, not a confirmed activation (only the admin's approval actually
  // sets `subscriptionExpiresAt`, since payment is still collected offline).
  // Lets the admin see what the merchant asked/expects to pay for instead of
  // guessing a duration when approving.
  requestedSubscriptionMonths: integer("requested_subscription_months"),
  // Whether this store offers the "البضاعة بيها خلل؟" quality-refund flow to
  // its customers. Each merchant decides for their own store — some don't want
  // to deal with refund claims at all, so they can turn the customer-facing
  // button off entirely. Defaults on so existing stores keep the feature.
  refundsEnabled: boolean("refunds_enabled").notNull().default(true),
  // Running total of customer star ratings (1–5) and how many were given, so
  // the average = ratingSum / ratingCount can be shown on the store card
  // without scanning a separate table. Updated when a customer rates a
  // delivered order.
  ratingSum: integer("rating_sum").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
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
