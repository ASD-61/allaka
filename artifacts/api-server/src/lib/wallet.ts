import { eq, sql } from "drizzle-orm";
import { customersTable, customerStoreWalletsTable } from "@workspace/db";

// A drizzle transaction (or the base db) — kept loose so callers can pass
// whichever they hold without a hard type dependency.
type Tx = any;

/**
 * Credits a customer's PER-STORE wallet (used for quality-refund compensation),
 * so the balance can only be spent at the same store. Falls back to the general
 * wallet when the order isn't tied to a store. Atomic upsert (no race).
 */
export async function creditStoreWallet(
  tx: Tx,
  customerPhone: string,
  storeId: number | null | undefined,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  if (storeId == null) {
    await tx
      .update(customersTable)
      .set({
        walletBalance: sql`${customersTable.walletBalance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(customersTable.phone, customerPhone));
    return;
  }
  await tx
    .insert(customerStoreWalletsTable)
    .values({ customerPhone, storeId, balance: amount })
    .onConflictDoUpdate({
      target: [
        customerStoreWalletsTable.customerPhone,
        customerStoreWalletsTable.storeId,
      ],
      set: {
        balance: sql`${customerStoreWalletsTable.balance} + ${amount}`,
        updatedAt: new Date(),
      },
    });
}
