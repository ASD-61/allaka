import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

// Instant "تعويض الجودة" quality-refund requests. When a customer reports a
// damaged item, its price is credited to their in-app wallet immediately and a
// record is kept here (with the photo) for the merchant's review.
export const refundsTable = pgTable("refunds", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  customerPhone: text("customer_phone").notNull(),
  productName: text("product_name").notNull(),
  imageUrl: text("image_url").notNull(),
  // Credited compensation in IQD. Stays 0 until the merchant approves and sets
  // the amount (which may be partial or the full item price).
  amount: integer("amount").notNull().default(0),
  // "قيد المراجعة" (pending) → "تمت الموافقة" (approved) | "مرفوض" (rejected).
  status: text("status").notNull().default("قيد المراجعة"),
  // When the merchant made the approve/reject decision.
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Refund = typeof refundsTable.$inferSelect;
