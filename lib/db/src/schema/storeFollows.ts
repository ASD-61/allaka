import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// A customer "following" (favouriting) a store. Lets the customer keep a
// personal list of the stores they care about and reach them quickly.
export const storeFollowsTable = pgTable(
  "store_follows",
  {
    id: serial("id").primaryKey(),
    customerPhone: text("customer_phone").notNull(),
    storeId: integer("store_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // A customer can follow a given store at most once.
    customerStoreUnique: unique().on(t.customerPhone, t.storeId),
  }),
);

export const insertStoreFollowSchema = createInsertSchema(
  storeFollowsTable,
).omit({ id: true, createdAt: true });
export type InsertStoreFollow = z.infer<typeof insertStoreFollowSchema>;
export type StoreFollow = typeof storeFollowsTable.$inferSelect;
