import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";

export const addressesTable = pgTable("addresses", {
  id: serial("id").primaryKey(),
  customerPhone: text("customer_phone").notNull(),
  label: text("label").notNull().default("المنزل"),
  details: text("details"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Address = typeof addressesTable.$inferSelect;
