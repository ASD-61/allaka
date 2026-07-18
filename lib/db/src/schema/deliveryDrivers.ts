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
// (name + WhatsApp number + vehicle type) for their store and it's usable
// immediately — the merchant IS the approver here (not the admin), since
// they're vouching for someone they personally work with. The same phone
// number can be added by multiple different stores (a driver is free to
// deliver for more than one merchant), each as its own independent row.
// The merchant can forward an order's details to the driver's WhatsApp with
// one tap (via a wa.me click-to-chat link — no extra API integration needed
// since the merchant sends it themselves).
export const deliveryDriversTable = pgTable("delivery_drivers", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  // e.g. "دراجة نارية", "سيارة", "دراجة هوائية".
  vehicleType: text("vehicle_type").notNull().default(""),
  // "مفعّل" (active) is the only status new drivers get today; "موقوف" is kept
  // for an admin to disable an abusive driver without deleting their record.
  status: text("status").notNull().default("مفعّل"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDeliveryDriverSchema = createInsertSchema(
  deliveryDriversTable,
).omit({ id: true, createdAt: true });
export type InsertDeliveryDriver = z.infer<typeof insertDeliveryDriverSchema>;
export type DeliveryDriver = typeof deliveryDriversTable.$inferSelect;
