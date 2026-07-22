import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Recipes powering the "شنو نطبخ اليوم؟" helper. Each recipe has a name and a
// list of ingredient keywords; the app matches those keywords against a store's
// products so a customer can add a whole recipe's ingredients to the cart with
// one tap. Managed by the admin (add/edit/delete + edit the ingredient list),
// replacing the old hard-coded constant list.
export const recipesTable = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // Ingredient keywords, e.g. ["بصل", "طماطة", "بطاطا"].
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  // Lower sort values appear first.
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertRecipeSchema = createInsertSchema(recipesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipesTable.$inferSelect;
