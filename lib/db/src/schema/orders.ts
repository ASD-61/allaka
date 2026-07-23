import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export interface OrderItemRecord {
  id: number;
  name: string;
  price: number;
  unit: string;
  qty: number;
  // Merchant's free-text special pricing note (e.g. "٣ قطع بـ٢٠٠٠"). Carried
  // into the order so it reaches the merchant/customer in the WhatsApp message
  // instead of being display-only.
  priceNote?: string | null;
}

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerPhone: text("customer_phone").notNull(),
  items: jsonb("items").notNull().$type<OrderItemRecord[]>(),
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull(),
  deliveryType: text("delivery_type").notNull(),
  discountApplied: integer("discount_applied").notNull().default(0),
  pointsEarned: integer("points_earned").notNull().default(0),
  pointsRedeemed: integer("points_redeemed").notNull().default(0),
  redemptionType: text("redemption_type"),
  // Wallet credit (from quality refunds) applied to this order, in IQD.
  walletApplied: integer("wallet_applied").notNull().default(0),
  // Customer-chosen delivery/pickup window, e.g. "اليوم ٤-٦ عصراً" or "غداً صباحاً".
  pickupTime: text("pickup_time"),
  note: text("note"),
  total: integer("total").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  status: text("status").notNull().default("قيد التحضير"),
  // The store this order was placed with (single-store carts).
  storeId: integer("store_id"),
  // The delivery driver the merchant forwarded this order to (nullable — set
  // once the merchant taps "send to driver"). Used to show which of the
  // store's drivers are currently free vs. out on a delivery.
  assignedDriverId: integer("assigned_driver_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Order = typeof ordersTable.$inferSelect;
