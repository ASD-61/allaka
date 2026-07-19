import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const customersTable = pgTable("customers", {
  phone: text("phone").primaryKey(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  verified: integer("verified").notNull().default(0),
  points: integer("points").notNull().default(0),
  // GENERAL in-app wallet balance in IQD (referral bonuses / admin credit),
  // spendable at ANY store. Store-specific refund credit lives in
  // customer_store_wallets instead so it can only be spent at that store.
  walletBalance: integer("wallet_balance").notNull().default(0),
  // The customer's own share code others enter to credit this customer.
  // Generated lazily on first fetch of the referral screen.
  referralCode: text("referral_code").unique(),
  // The referral code this customer redeemed (set once). Prevents a customer
  // from being referred more than once.
  referredBy: text("referred_by"),
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
