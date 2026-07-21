import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

// In-app notification feed. A single row is a message delivered to one phone
// number (which may be a customer, a merchant, or both — the app shows the
// feed for whoever is logged in). Used for refund decisions ("تم تعويضك"/
// "رُفض التعويض"), delivery updates ("تم تسليم طلبك، قيّم المتجر"), and any
// future system messages. Kept deliberately generic so new event types don't
// need a schema change.
export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  // Recipient's phone (normalised the same way the rest of the app stores it).
  recipientPhone: text("recipient_phone").notNull(),
  // e.g. "refund" | "delivery" | "system" — lets the UI pick an icon.
  type: text("type").notNull().default("system"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  // Optional deep-link/context payload, e.g. { orderId, storeId, rateUrl }.
  data: jsonb("data").$type<Record<string, unknown>>(),
  // Null until the user opens their notifications list.
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
