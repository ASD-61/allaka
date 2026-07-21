import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, gt, or, desc } from "drizzle-orm";
import {
  db,
  customersTable,
  customerStoreWalletsTable,
  storesTable,
} from "@workspace/db";
import { requireCustomer } from "../middlewares/customerAuth";

const router: IRouter = Router();

// GET /wallet — the customer's wallet screen: the general balance (referral /
// admin credit, spendable anywhere) plus a per-store breakdown of refund credit
// (each spendable only at that store).
router.get(
  "/wallet",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const phone = req.customerPhone!;

    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.phone, phone));

    const rows = await db
      .select({
        storeId: customerStoreWalletsTable.storeId,
        balance: customerStoreWalletsTable.balance,
        points: customerStoreWalletsTable.points,
        storeName: storesTable.name,
        storeImageUrl: storesTable.imageUrl,
      })
      .from(customerStoreWalletsTable)
      .leftJoin(
        storesTable,
        eq(customerStoreWalletsTable.storeId, storesTable.id),
      )
      .where(
        and(
          eq(customerStoreWalletsTable.customerPhone, phone),
          // Show a store row if the customer has either wallet credit OR
          // loyalty points there.
          or(
            gt(customerStoreWalletsTable.balance, 0),
            gt(customerStoreWalletsTable.points, 0),
          ),
        ),
      )
      .orderBy(desc(customerStoreWalletsTable.balance));

    res.json({
      generalBalance: customer?.walletBalance ?? 0,
      stores: rows.map((r) => ({
        storeId: r.storeId,
        storeName: r.storeName ?? "متجر",
        storeImageUrl: r.storeImageUrl ?? null,
        balance: r.balance,
        points: r.points ?? 0,
      })),
    });
  },
);

// GET /wallet/store/:storeId — how much wallet credit the customer can spend on
// an order from this store: the store's own balance + the general balance.
router.get(
  "/wallet/store/:storeId",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const phone = req.customerPhone!;
    const storeId = parseInt(String(req.params.storeId), 10);
    if (Number.isNaN(storeId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.phone, phone));

    const [sw] = await db
      .select()
      .from(customerStoreWalletsTable)
      .where(
        and(
          eq(customerStoreWalletsTable.customerPhone, phone),
          eq(customerStoreWalletsTable.storeId, storeId),
        ),
      );

    res.json({
      storeBalance: sw?.balance ?? 0,
      storePoints: sw?.points ?? 0,
      generalBalance: customer?.walletBalance ?? 0,
    });
  },
);

export default router;
