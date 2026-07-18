import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Curated list of store types/categories shown on the customer landing as
// image cards (e.g. "خضار وفواكه", "بقالة", "لحوم", "مخبز"). The admin manages
// this list and uploads a real photo for each one. Stores reference a type by
// its name (stores.store_type), so the card image is looked up by name.
export const storeTypesTable = pgTable("store_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  imageUrl: text("image_url"),
  // Lower sort values appear first on the landing.
  sortOrder: integer("sort_order").notNull().default(0),
  // When true, stores of this type show the "شنو نطبخ اليوم؟" recipe helper
  // (only makes sense for produce/grocery types, not pharmacies/flowers/etc.),
  // so the admin decides per type where it appears.
  showRecipes: boolean("show_recipes").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertStoreTypeSchema = createInsertSchema(storeTypesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStoreType = z.infer<typeof insertStoreTypeSchema>;
export type StoreType = typeof storeTypesTable.$inferSelect;
