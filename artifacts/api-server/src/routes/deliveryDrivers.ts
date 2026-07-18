import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, deliveryDriversTable, storesTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";
import { isAdminRequest, getCustomerPhone } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const PENDING = "قيد المراجعة";
const APPROVED = "مفعّل";
const REJECTED = "مرفوض";

const DriverBody = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
});

const ReviewBody = z.object({
  action: z.enum(["approve", "reject"]),
});

// Shared guard: the caller must be an admin or the store's own owner.
async function loadOwnedStore(
  req: Request,
  res: Response,
  id: number,
): Promise<typeof storesTable.$inferSelect | null> {
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return null;
  }
  const [store] = await db
    .select()
    .from(storesTable)
    .where(eq(storesTable.id, id));
  if (!store) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return null;
  }
  const admin = isAdminRequest(req);
  const phone = getCustomerPhone(req);
  if (!admin && store.ownerPhone !== phone) {
    res.status(401).json({ error: "لا تملك صلاحية الوصول لهذا المتجر" });
    return null;
  }
  return store;
}

// GET /stores/:id/drivers — the owner (or admin) sees this store's delivery
// reps, in any status, so the merchant can track pending approvals.
router.get(
  "/stores/:id/drivers",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    const store = await loadOwnedStore(req, res, id);
    if (!store) return;
    const rows = await db
      .select()
      .from(deliveryDriversTable)
      .where(eq(deliveryDriversTable.storeId, id))
      .orderBy(desc(deliveryDriversTable.createdAt));
    res.json(rows);
  },
);

// POST /stores/:id/drivers — the owner (or admin) adds a new delivery rep;
// it always starts pending until an admin approves it.
router.post(
  "/stores/:id/drivers",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    const store = await loadOwnedStore(req, res, id);
    if (!store) return;

    const parsed = DriverBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات المندوب غير مكتملة" });
      return;
    }

    const [driver] = await db
      .insert(deliveryDriversTable)
      .values({
        storeId: id,
        name: parsed.data.name.trim(),
        phone: parsed.data.phone.trim(),
        status: PENDING,
      })
      .returning();

    res.status(201).json(driver);
  },
);

// GET /drivers/pending — admin-only: every store's pending drivers, with the
// store name attached, so the admin can review/approve them in one place.
router.get(
  "/drivers/pending",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select({
        driver: deliveryDriversTable,
        storeName: storesTable.name,
      })
      .from(deliveryDriversTable)
      .innerJoin(storesTable, eq(deliveryDriversTable.storeId, storesTable.id))
      .where(eq(deliveryDriversTable.status, PENDING))
      .orderBy(desc(deliveryDriversTable.createdAt));
    res.json(rows.map((r) => ({ ...r.driver, storeName: r.storeName })));
  },
);

// PATCH /drivers/:id — admin approves or rejects a delivery rep.
router.patch(
  "/drivers/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = ReviewBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صالحة" });
      return;
    }

    const [existing] = await db
      .select()
      .from(deliveryDriversTable)
      .where(eq(deliveryDriversTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "المندوب غير موجود" });
      return;
    }

    const [driver] = await db
      .update(deliveryDriversTable)
      .set({ status: parsed.data.action === "approve" ? APPROVED : REJECTED })
      .where(eq(deliveryDriversTable.id, id))
      .returning();

    res.json(driver);
  },
);

// DELETE /drivers/:id — the owning store's merchant (or admin) removes a
// delivery rep.
router.delete(
  "/drivers/:id",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [existing] = await db
      .select()
      .from(deliveryDriversTable)
      .where(eq(deliveryDriversTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "المندوب غير موجود" });
      return;
    }

    const store = await loadOwnedStore(req, res, existing.storeId);
    if (!store) return;

    await db.delete(deliveryDriversTable).where(eq(deliveryDriversTable.id, id));
    res.sendStatus(204);
  },
);

export default router;
