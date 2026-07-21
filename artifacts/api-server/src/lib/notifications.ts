import { db, notificationsTable } from "@workspace/db";

// Canonical phone key used for storing/looking up notifications: digits only,
// last 10 (an Iraqi mobile number), so a message created against "07..." is
// still found for a token whose phone is "+9647..." and vice-versa.
export function phoneKey(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\D/g, "").slice(-10);
}

// Best-effort insert of an in-app notification. Never throws — a failed
// notification must not break the action that triggered it (refund decision,
// delivery, etc.).
export async function createNotification(
  recipientPhoneRaw: string | null | undefined,
  opts: {
    type?: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  const recipientPhone = phoneKey(recipientPhoneRaw);
  if (!recipientPhone) return;
  try {
    await db.insert(notificationsTable).values({
      recipientPhone,
      type: opts.type ?? "system",
      title: opts.title,
      body: opts.body,
      data: opts.data ?? null,
    });
  } catch (err) {
    console.warn("Failed to create notification:", err);
  }
}
