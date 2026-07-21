import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, storeFollowsTable, storesTable } from "@workspace/db";
import { requireCustomer } from "../middlewares/customerAuth";

const router: IRouter = Router();

// GET /follows — the stores the authenticated customer follows, returned as
// full store rows (newest-followed first) so the "stores I follow" screen can
// render them like the normal store list.
router.get(
  "/follows",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const phone = req.customerPhone!;
    const rows = await db
      .select({ store: storesTable })
      .from(storeFollowsTable)
      .innerJoin(storesTable, eq(storeFollowsTable.storeId, storesTable.id))
      .where(eq(storeFollowsTable.customerPhone, phone))
      .orderBy(desc(storeFollowsTable.createdAt));
    res.json(rows.map((r) => r.store));
  },
);

// POST /stores/:id/follow — follow a store (idempotent: following an already
// followed store just succeeds).
router.post(
  "/stores/:id/follow",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const phone = req.customerPhone!;
    const storeId = parseInt(String(req.params.id), 10);
    if (Number.isNaN(storeId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [store] = await db
      .select({ id: storesTable.id })
      .from(storesTable)
      .where(eq(storesTable.id, storeId));
    if (!store) {
      res.status(404).json({ error: "المتجر غير موجود" });
      return;
    }
    await db
      .insert(storeFollowsTable)
      .values({ customerPhone: phone, storeId })
      .onConflictDoNothing({
        target: [
          storeFollowsTable.customerPhone,
          storeFollowsTable.storeId,
        ],
      });
    res.status(201).json({ storeId, following: true });
  },
);

// DELETE /stores/:id/follow — unfollow a store.
router.delete(
  "/stores/:id/follow",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const phone = req.customerPhone!;
    const storeId = parseInt(String(req.params.id), 10);
    if (Number.isNaN(storeId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .delete(storeFollowsTable)
      .where(
        and(
          eq(storeFollowsTable.customerPhone, phone),
          eq(storeFollowsTable.storeId, storeId),
        ),
      );
    res.json({ storeId, following: false });
  },
);

export default router;
