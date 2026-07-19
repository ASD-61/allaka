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

// Per-store wallet balance for a customer. Quality-refund credits are added
// here (keyed by the store that issued them) so a customer can only spend that
// credit at the same store they bought from — unlike the general
// customersTable.walletBalance (referral/admin credit) which works anywhere.
export const customerStoreWalletsTable = pgTable(
  "customer_store_wallets",
  {
    id: serial("id").primaryKey(),
    customerPhone: text("customer_phone").notNull(),
    storeId: integer("store_id").notNull(),
    balance: integer("balance").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // One balance row per (customer, store).
    customerStoreUnique: unique().on(t.customerPhone, t.storeId),
  }),
);

export const insertCustomerStoreWalletSchema = createInsertSchema(
  customerStoreWalletsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerStoreWallet = z.infer<
  typeof insertCustomerStoreWalletSchema
>;
export type CustomerStoreWallet =
  typeof customerStoreWalletsTable.$inferSelect;
