import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const customersTable = pgTable("customers", {
  phone: text("phone").primaryKey(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  verified: integer("verified").notNull().default(0),
  points: integer("points").notNull().default(0),
  // In-app wallet balance in IQD, credited by instant quality refunds and
  // spendable at checkout.
  walletBalance: integer("wallet_balance").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Customer = typeof customersTable.$inferSelect;
