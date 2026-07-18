import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Admin-sent announcements shown to every customer in their notifications
// feed (e.g. "وصلت خضار طازجة جديدة").
export const broadcastsTable = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertBroadcastSchema = createInsertSchema(broadcastsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type Broadcast = typeof broadcastsTable.$inferSelect;
