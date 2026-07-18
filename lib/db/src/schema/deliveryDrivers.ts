import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// A merchant's delivery reps ("مندوبين توصيل"). The merchant adds a driver
// (name + WhatsApp number) for their store; an admin must approve them before
// they're usable, mirroring how stores themselves are reviewed. Once
// approved, the merchant can forward an order's details to the driver's
// WhatsApp with one tap (via a wa.me click-to-chat link — no extra API
// integration needed since the merchant sends it themselves).
export const deliveryDriversTable = pgTable("delivery_drivers", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  // "قيد المراجعة" (pending) → "مفعّل" (approved) | "مرفوض" (rejected).
  status: text("status").notNull().default("قيد المراجعة"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDeliveryDriverSchema = createInsertSchema(
  deliveryDriversTable,
).omit({ id: true, createdAt: true });
export type InsertDeliveryDriver = z.infer<typeof insertDeliveryDriverSchema>;
export type DeliveryDriver = typeof deliveryDriversTable.$inferSelect;
