import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { eq, desc, inArray, ne, and } from "drizzle-orm";
import { db, deliveryDriversTable, storesTable, ordersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";
import { isAdminRequest, getCustomerPhone } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const ACTIVE = "مفعّل";
const SUSPENDED = "موقوف";
const DELIVERED = "تم التسليم";

const DriverBody = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  vehicleType: z.string().min(1),
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

// Attaches a `activeOrderId` flag to each driver row: the id of an order
// currently assigned to them that hasn't been delivered yet (across ANY
// store, since a driver can work for more than one merchant at once) — lets
// the merchant see at a glance which drivers are free vs. out delivering.
async function withBusyStatus<T extends { id: number }>(
  rows: T[],
): Promise<(T & { activeOrderId: number | null })[]> {
  if (rows.length === 0) return [];
  const driverIds = rows.map((r) => r.id);
  const active = await db
    .select({ driverId: ordersTable.assignedDriverId, orderId: ordersTable.id })
    .from(ordersTable)
    .where(
      and(
        inArray(ordersTable.assignedDriverId, driverIds),
        ne(ordersTable.status, DELIVERED),
      ),
    );
  const busyMap = new Map<number, number>();
  for (const o of active) {
    if (o.driverId != null && !busyMap.has(o.driverId)) {
      busyMap.set(o.driverId, o.orderId);
    }
  }
  return rows.map((r) => ({ ...r, activeOrderId: busyMap.get(r.id) ?? null }));
}

// GET /stores/:id/drivers — the owner (or admin) sees this store's delivery
// reps, along with which are currently free vs. out on a delivery.
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
    res.json(await withBusyStatus(rows));
  },
);

// POST /stores/:id/drivers — the owner (or admin) adds a new delivery rep.
// The merchant IS the approver: the driver is usable immediately, no admin
// review step.
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
        vehicleType: parsed.data.vehicleType.trim(),
        status: ACTIVE,
        available: true,
        portalToken: randomUUID(),
      })
      .returning();

    res.status(201).json({ ...driver, activeOrderId: null });
  },
);

// GET /drivers — admin-only: every delivery driver across every store, with
// the store name attached, for oversight (no approval action — merchants
// self-manage their own drivers).
router.get(
  "/drivers",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select({
        driver: deliveryDriversTable,
        storeName: storesTable.name,
      })
      .from(deliveryDriversTable)
      .innerJoin(storesTable, eq(deliveryDriversTable.storeId, storesTable.id))
      .orderBy(desc(deliveryDriversTable.createdAt));
    const withStoreName = rows.map((r) => ({ ...r.driver, storeName: r.storeName }));
    res.json(await withBusyStatus(withStoreName));
  },
);

const StatusBody = z.object({
  status: z.enum([ACTIVE, SUSPENDED]),
});

// PATCH /drivers/:id/status — admin-only: suspend/reactivate a driver in case
// of abuse, without needing to delete their record.
router.patch(
  "/drivers/:id/status",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = StatusBody.safeParse(req.body);
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
      .set({ status: parsed.data.status })
      .where(eq(deliveryDriversTable.id, id))
      .returning();

    res.json(driver);
  },
);

// GET /driver-portal/:token — public (token-gated, no login): the driver's
// own view of their status, used by their personal portal page to render the
// current toggle state.
router.get(
  "/driver-portal/:token",
  async (req: Request, res: Response): Promise<void> => {
    const token = String(req.params.token);
    const [row] = await db
      .select({ driver: deliveryDriversTable, storeName: storesTable.name })
      .from(deliveryDriversTable)
      .innerJoin(storesTable, eq(deliveryDriversTable.storeId, storesTable.id))
      .where(eq(deliveryDriversTable.portalToken, token));
    if (!row) {
      res.status(404).json({ error: "الرابط غير صالح" });
      return;
    }
    const [withBusy] = await withBusyStatus([row.driver]);
    res.json({
      name: row.driver.name,
      vehicleType: row.driver.vehicleType,
      storeName: row.storeName,
      status: row.driver.status,
      available: row.driver.available,
      activeOrderId: withBusy.activeOrderId,
    });
  },
);

const AvailabilityBody = z.object({ available: z.boolean() });

// PATCH /driver-portal/:token — public (token-gated, no login): the driver
// flips their OWN "متاح اليوم" / "غير متاح اليوم" toggle. This is the whole
// point of the portal — no merchant/admin action is needed for a driver to
// take themselves off (or back onto) the roster for the day.
router.patch(
  "/driver-portal/:token",
  async (req: Request, res: Response): Promise<void> => {
    const token = String(req.params.token);
    const parsed = AvailabilityBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صالحة" });
      return;
    }
    const [existing] = await db
      .select()
      .from(deliveryDriversTable)
      .where(eq(deliveryDriversTable.portalToken, token));
    if (!existing) {
      res.status(404).json({ error: "الرابط غير صالح" });
      return;
    }
    const [driver] = await db
      .update(deliveryDriversTable)
      .set({ available: parsed.data.available })
      .where(eq(deliveryDriversTable.portalToken, token))
      .returning();
    res.json({ available: driver.available });
  },
);

const DriverUpdateBody = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(8).optional(),
  vehicleType: z.string().min(1).optional(),
});

// PATCH /drivers/:id — the owning store's merchant (or admin) edits a driver's
// name / phone / vehicle type (e.g. to fix a typo in the WhatsApp number).
router.patch(
  "/drivers/:id",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = DriverUpdateBody.safeParse(req.body);
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
    const store = await loadOwnedStore(req, res, existing.storeId);
    if (!store) return;

    const patch: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
    if (parsed.data.phone !== undefined) patch.phone = parsed.data.phone.trim();
    if (parsed.data.vehicleType !== undefined)
      patch.vehicleType = parsed.data.vehicleType.trim();

    if (Object.keys(patch).length === 0) {
      const [withBusy] = await withBusyStatus([existing]);
      res.json(withBusy);
      return;
    }

    const [driver] = await db
      .update(deliveryDriversTable)
      .set(patch)
      .where(eq(deliveryDriversTable.id, id))
      .returning();
    const [withBusy] = await withBusyStatus([driver]);
    res.json(withBusy);
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
