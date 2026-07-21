import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
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
  // First/primary photo — kept for backward compatibility. The full set of
  // photos the customer attached lives in `imageUrls`.
  imageUrl: text("image_url").notNull(),
  // All photos the customer attached to the report (the customer can now send
  // more than one). Includes `imageUrl` as its first element.
  imageUrls: jsonb("image_urls").$type<string[]>(),
  // Optional free-text note from the customer describing the defect.
  note: text("note"),
  // Credited compensation in IQD. Stays 0 until the merchant approves and sets
  // the amount (which may be partial or the full item price).
  amount: integer("amount").notNull().default(0),
  // "قيد المراجعة" (pending) → "تمت الموافقة" (approved) | "مرفوض" (rejected).
  status: text("status").notNull().default("قيد المراجعة"),
  // Reason the merchant/admin gave when rejecting (shown to the customer).
  rejectReason: text("reject_reason"),
  // When the merchant made the approve/reject decision.
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Refund = typeof refundsTable.$inferSelect;
