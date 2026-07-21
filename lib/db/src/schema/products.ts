import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  unit: text("unit").notNull(),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
  rating: real("rating").notNull().default(4.5),
  isVip: boolean("is_vip").notNull().default(false),
  // Small "منتج محلي" trust badge for locally-grown produce (e.g. طماطة الزبير).
  isLocal: boolean("is_local").notNull().default(false),
  // "تصفية العلوة" end-of-day clearance flag — surfaced in a dedicated
  // clearance section that the app time-gates to open at 6pm.
  isClearance: boolean("is_clearance").notNull().default(false),
  // "قسم الجملة" — sold by sack/box (گونية/صندوق) at a wholesale price.
  isWholesale: boolean("is_wholesale").notNull().default(false),
  // Optional wholesale price for the "قسم الجملة" listing, distinct from the
  // regular retail `price` (e.g. retail 750/kg but 2000 for a 3kg bulk).
  wholesalePrice: integer("wholesale_price"),
  // Free-text pricing note the merchant can add for flexible pricing that a
  // single number can't express, e.g. "٣ كيلو بـ٢٠٠٠" or "الحبة بـ٢٥٠".
  priceNote: text("price_note"),
  discountPercent: integer("discount_percent"),
  // When set, the current `price` is a temporary offer price that expires at
  // this time — the server lazily reverts to `originalPrice` after expiry.
  discountExpiresAt: timestamp("discount_expires_at", { withTimezone: true }),
  inStock: boolean("in_stock").notNull().default(true),
  // Owning store in the multi-vendor marketplace. Nullable for legacy rows;
  // backfilled to the default store.
  storeId: integer("store_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
