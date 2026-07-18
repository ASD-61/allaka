import { db, ordersTable, storesTable } from "./src/index.ts";
import { eq, desc } from "drizzle-orm";

const rows = await db
  .select({ id: ordersTable.id, storeId: ordersTable.storeId, storeName: storesTable.name, ownerPhone: storesTable.ownerPhone })
  .from(ordersTable)
  .leftJoin(storesTable, eq(storesTable.id, ordersTable.storeId))
  .orderBy(desc(ordersTable.id))
  .limit(15);

console.log(JSON.stringify(rows, null, 2));
process.exit(0);
