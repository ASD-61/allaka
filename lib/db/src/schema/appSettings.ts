import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Simple key/value store for runtime-changeable server settings that shouldn't
// require a redeploy. Currently used to persist the admin password hash so the
// admin can change their own password from the app's settings.
export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AppSetting = typeof appSettingsTable.$inferSelect;
