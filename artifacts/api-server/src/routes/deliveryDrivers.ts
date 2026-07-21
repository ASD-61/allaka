import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { eq, desc, inArray, ne, and } from "drizzle-orm";
import { db, deliveryDriversTable, storesTable, ordersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";
import { isAdminRequest, getCustomerPhone } from "../lib/auth";
import { createNotification } from "../lib/notifications";
import { sendWhatsAppRatingRequest } from "../lib/whatsapp";
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

    const trimmedPhone = parsed.data.phone.trim();

    // Stable per-phone portal link: a driver who already works for another
    // store keeps the SAME portal token, so they have one link that shows all
    // the stores they deliver for (and one daily availability toggle) instead
    // of a different link per store.
    const [sibling] = await db
      .select({
        portalToken: deliveryDriversTable.portalToken,
        available: deliveryDriversTable.available,
      })
      .from(deliveryDriversTable)
      .where(eq(deliveryDriversTable.phone, trimmedPhone))
      .limit(1);

    const [driver] = await db
      .insert(deliveryDriversTable)
      .values({
        storeId: id,
        name: parsed.data.name.trim(),
        phone: trimmedPhone,
        vehicleType: parsed.data.vehicleType.trim(),
        status: ACTIVE,
        available: sibling?.available ?? true,
        portalToken: sibling?.portalToken ?? randomUUID(),
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
// own dashboard. Because a driver's token is now shared across every store
// they work for, this aggregates ALL of those rows: the stores they deliver
// for (name/phone/address), their active (not-yet-delivered) orders, and
// today's delivered count + earnings.
router.get(
  "/driver-portal/:token",
  async (req: Request, res: Response): Promise<void> => {
    const token = String(req.params.token);
    const rows = await db
      .select({ driver: deliveryDriversTable, store: storesTable })
      .from(deliveryDriversTable)
      .innerJoin(storesTable, eq(deliveryDriversTable.storeId, storesTable.id))
      .where(eq(deliveryDriversTable.portalToken, token));
    if (rows.length === 0) {
      res.status(404).json({ error: "الرابط غير صالح" });
      return;
    }

    const first = rows[0]!.driver;
    const driverIds = rows.map((r) => r.driver.id);
    const storeById = new Map<number, (typeof rows)[number]["store"]>();
    for (const r of rows) storeById.set(r.store.id, r.store);

    const orders = await db
      .select()
      .from(ordersTable)
      .where(inArray(ordersTable.assignedDriverId, driverIds))
      .orderBy(desc(ordersTable.createdAt));

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const activeOrders = orders
      .filter((o) => o.status !== DELIVERED)
      .map((o) => {
        const st = o.storeId != null ? storeById.get(o.storeId) : undefined;
        return {
          id: o.id,
          storeName: st?.name ?? "المتجر",
          customerPhone: o.customerPhone,
          items: (o.items ?? []).map((i) => ({ name: i.name, qty: i.qty })),
          total: o.total,
          deliveryType: o.deliveryType,
          note: o.note,
          latitude: o.latitude,
          longitude: o.longitude,
          status: o.status,
        };
      });

    const deliveredToday = orders.filter(
      (o) =>
        o.status === DELIVERED && new Date(o.createdAt) >= startOfToday,
    );
    const todayEarnings = deliveredToday.reduce(
      (sum, o) => sum + (o.deliveryFee || 0),
      0,
    );

    const stores = rows.map((r) => ({
      id: r.store.id,
      name: r.store.name,
      phone: r.store.ownerPhone,
      address: r.store.address,
      latitude: r.store.latitude,
      longitude: r.store.longitude,
    }));

    res.json({
      name: first.name,
      phone: first.phone,
      vehicleType: first.vehicleType,
      status: first.status,
      available: first.available,
      stores,
      activeOrders,
      todayDeliveredCount: deliveredToday.length,
      todayEarnings,
    });
  },
);

const AvailabilityBody = z.object({ available: z.boolean() });

// PATCH /driver-portal/:token — public (token-gated, no login): the driver
// flips their OWN "متاح اليوم" / "غير متاح اليوم" toggle. Applies to EVERY
// store row sharing this token, so one toggle covers all the stores they
// deliver for.
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
    await db
      .update(deliveryDriversTable)
      .set({ available: parsed.data.available })
      .where(eq(deliveryDriversTable.portalToken, token));
    res.json({ available: parsed.data.available });
  },
);

const DriverOrderStatusBody = z.object({
  status: z.enum(["في الطريق", DELIVERED]),
});

// PATCH /driver-portal/:token/orders/:orderId — the driver updates an order
// they were assigned (mark it "في الطريق" or "تم التسليم"). On delivery it
// notifies the customer (in-app + WhatsApp rating request) and the store
// owner, and locks the order (merchants can no longer change it).
router.patch(
  "/driver-portal/:token/orders/:orderId",
  async (req: Request, res: Response): Promise<void> => {
    const token = String(req.params.token);
    const orderId = parseInt(String(req.params.orderId), 10);
    if (Number.isNaN(orderId)) {
      res.status(400).json({ error: "معرّف غير صالح" });
      return;
    }
    const parsed = DriverOrderStatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "حالة غير صالحة" });
      return;
    }

    const driverRows = await db
      .select({ id: deliveryDriversTable.id })
      .from(deliveryDriversTable)
      .where(eq(deliveryDriversTable.portalToken, token));
    if (driverRows.length === 0) {
      res.status(404).json({ error: "الرابط غير صالح" });
      return;
    }
    const driverIds = new Set(driverRows.map((d) => d.id));

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));
    if (
      !order ||
      order.assignedDriverId == null ||
      !driverIds.has(order.assignedDriverId)
    ) {
      res.status(403).json({ error: "هذا الطلب غير مُسند إليك" });
      return;
    }
    if (order.status === DELIVERED) {
      res.status(409).json({ error: "الطلب تم تسليمه مسبقاً" });
      return;
    }

    const [updated] = await db
      .update(ordersTable)
      .set({ status: parsed.data.status })
      .where(eq(ordersTable.id, orderId))
      .returning();

    if (parsed.data.status === DELIVERED) {
      const store = order.storeId
        ? (
            await db
              .select()
              .from(storesTable)
              .where(eq(storesTable.id, order.storeId))
          )[0]
        : undefined;
      const storeName = store?.name ?? null;
      const base = `${req.protocol}://${req.get("host")}`;

      // Customer: in-app "thank you + rate the store" + WhatsApp rating link.
      void createNotification(order.customerPhone, {
        type: "delivery",
        title: `✅ تم تسليم طلبك من ${storeName || "المتجر"}`,
        body: `شكراً لشرائك من ${storeName || "المتجر"} 🥬\nنتمنى نال إعجابك — قيّم المتجر من إشعاراتك أو رسالة الواتساب.`,
        data: {
          orderId: order.id,
          storeId: order.storeId ?? null,
          rateUrl: `${base}/rate/${order.id}`,
        },
      });
      void sendWhatsAppRatingRequest({
        customerPhone: order.customerPhone,
        storeName,
        orderId: order.id,
        rateUrl: `${base}/rate/${order.id}`,
      });

      // Merchant: in-app confirmation the driver completed the delivery.
      if (store?.ownerPhone) {
        void createNotification(store.ownerPhone, {
          type: "delivery",
          title: `🚚 تم تسليم الطلب #${order.id} — ${storeName || "متجرك"}`,
          body: `أكمل المندوب توصيل الطلب #${order.id} بنجاح.`,
          data: { orderId: order.id, storeId: order.storeId ?? null },
        });
      }
    }

    res.json({ id: updated.id, status: updated.status });
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
