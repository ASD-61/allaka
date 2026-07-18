import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// One pending OTP code per phone number. A new request overwrites the
// previous code (upsert on phone).
export const otpCodesTable = pgTable("otp_codes", {
  phone: text("phone").primaryKey(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OtpCode = typeof otpCodesTable.$inferSelect;
