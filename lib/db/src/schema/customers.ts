import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const customersTable = pgTable("customers", {
  phone: text("phone").primaryKey(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  verified: integer("verified").notNull().default(0),
  points: integer("points").notNull().default(0),
  // In-app wallet balance in IQD, credited by instant quality refunds and
  // spendable at checkout.
  walletBalance: integer("wallet_balance").notNull().default(0),
  // Last known location, captured automatically right after login (silently,
  // best-effort) so the stores list / product search can be sorted
  // nearest-first without asking the customer every single time.
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Customer = typeof customersTable.$inferSelect;
