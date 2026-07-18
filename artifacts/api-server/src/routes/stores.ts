import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  storesTable,
  productsTable,
  ordersTable,
  customersTable,
  refundsTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";
import { requireCustomer } from "../middlewares/customerAuth";
import { isAdminRequest, getCustomerPhone } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const PENDING = "قيد المراجعة";
const ACTIVE = "مفعّل";
const REJECTED = "مرفوض";
const SUSPENDED = "موقوف مؤقتاً";

const REFUND_PENDING = "قيد المراجعة";
const REFUND_APPROVED = "تمت الموافقة";
const REFUND_REJECTED = "مرفوض";

const StoreBody = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  storeType: z.string().min(1),
  description: z.string().nullish(),
  imageUrl: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
});

const StoreUpdateBody = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  storeType: z.string().min(1).optional(),
  description: z.string().nullish(),
  imageUrl: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
});

const ReviewBody = z.object({
  action: z.enum(["approve", "reject", "suspend", "reactivate"]),
  subscriptionMonths: z.number().int().min(1).max(24).optional(),
  // "extend" (default) stacks the months onto the current expiry; "set"
  // replaces the expiry with exactly that many months from today, so the admin
  // can correct or reduce a subscription after a misclick.
  subscriptionMode: z.enum(["extend", "set"]).optional(),
});

function cleanText(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
}

// GET /stores — public: only active (approved) stores, so customers never see
// pending or rejected shops.
router.get("/stores", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(storesTable)
    .where(eq(storesTable.status, ACTIVE))
    .orderBy(desc(storesTable.createdAt));
  res.json(rows);
});

// GET /stores/mine — the authenticated merchant's own stores (any status), so
// they can see whether their registration is still pending.
router.get(
  "/stores/mine",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.ownerPhone, req.customerPhone!))
      .orderBy(desc(storesTable.createdAt));
    res.json(rows);
  },
);

// GET /stores/admin — admin sees every store in any status to review them.
router.get(
  "/stores/admin",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(storesTable)
      .orderBy(desc(storesTable.createdAt));
    res.json(rows);
  },
);

// POST /stores — a logged-in customer registers a store; it starts pending and
// is owned by the caller's phone number (never a client-supplied one).
router.post(
  "/stores",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = StoreBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات المتجر غير مكتملة" });
      return;
    }

    const [store] = await db
      .insert(storesTable)
      .values({
        name: parsed.data.name.trim(),
        address: parsed.data.address.trim(),
        storeType: parsed.data.storeType.trim(),
        description: cleanText(parsed.data.description),
        imageUrl: cleanText(parsed.data.imageUrl),
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        ownerPhone: req.customerPhone!,
        status: PENDING,
      })
      .returning();

    res.status(201).json(store);
  },
);

router.get(
  "/stores/:id",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [store] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.id, id));
    if (!store) {
      res.status(404).json({ error: "المتجر غير موجود" });
      return;
    }
    res.json(store);
  },
);

// PATCH /stores/:id — the owner can edit their own store's details; an admin
// can edit any store. Accepts either an admin token or a customer token (the
// route must not gate on requireCustomer, or admins editing from the admin
// panel would be rejected before the admin check ever runs).
router.patch(
  "/stores/:id",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = StoreUpdateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صالحة" });
      return;
    }

    const [existing] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "المتجر غير موجود" });
      return;
    }

    const admin = isAdminRequest(req);
    const phone = getCustomerPhone(req);
    if (!admin && (!phone || existing.ownerPhone !== phone)) {
      res.status(401).json({ error: "لا تملك صلاحية تعديل هذا المتجر" });
      return;
    }

    const patch: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
    if (parsed.data.address !== undefined)
      patch.address = parsed.data.address.trim();
    if (parsed.data.storeType !== undefined)
      patch.storeType = parsed.data.storeType.trim();
    if (parsed.data.description !== undefined)
      patch.description = cleanText(parsed.data.description);
    if (parsed.data.imageUrl !== undefined)
      patch.imageUrl = cleanText(parsed.data.imageUrl);
    if (parsed.data.latitude !== undefined)
      patch.latitude = parsed.data.latitude ?? null;
    if (parsed.data.longitude !== undefined)
      patch.longitude = parsed.data.longitude ?? null;

    if (Object.keys(patch).length === 0) {
      res.json(existing);
      return;
    }

    const [store] = await db
      .update(storesTable)
      .set(patch)
      .where(eq(storesTable.id, id))
      .returning();

    res.json(store);
  },
);

// PATCH /stores/:id/review — admin approves (activating it and setting a
// subscription window) or rejects a store.
router.patch(
  "/stores/:id/review",
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
      .from(storesTable)
      .where(eq(storesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "المتجر غير موجود" });
      return;
    }

    let update: Record<string, unknown>;
    if (parsed.data.action === "approve") {
      const months = parsed.data.subscriptionMonths ?? 3;
      const mode = parsed.data.subscriptionMode ?? "extend";
      // "set" counts the months from today (replacing the expiry), letting the
      // admin correct/reduce a subscription. "extend" stacks onto the later of
      // now or the current expiry so ordinary renewals add up.
      const base =
        mode === "set" ||
        !existing.subscriptionExpiresAt ||
        existing.subscriptionExpiresAt.getTime() <= Date.now()
          ? new Date()
          : new Date(existing.subscriptionExpiresAt);
      base.setMonth(base.getMonth() + months);
      update = { status: ACTIVE, subscriptionExpiresAt: base };
    } else if (parsed.data.action === "suspend") {
      // Temporary suspension: hide the store from customers but keep the store
      // and its subscription intact so it can be reactivated with one tap.
      update = { status: SUSPENDED };
    } else if (parsed.data.action === "reactivate") {
      update = { status: ACTIVE };
    } else {
      update = { status: REJECTED };
    }

    const [store] = await db
      .update(storesTable)
      .set(update)
      .where(eq(storesTable.id, id))
      .returning();

    res.json(store);
  },
);

// DELETE /stores/:id — admin permanently removes a store and all its products.
router.delete(
  "/stores/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [existing] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "المتجر غير موجود" });
      return;
    }
    // Cascade: remove the store's products first, then the store itself.
    await db.delete(productsTable).where(eq(productsTable.storeId, id));
    await db.delete(storesTable).where(eq(storesTable.id, id));
    res.sendStatus(204);
  },
);

// Shared guard for merchant dashboards: the caller must be an admin or the
// store's own owner. Returns the store row, or null after sending a response.
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

// GET /stores/:id/orders — the owner (or admin) sees this store's orders.
router.get(
  "/stores/:id/orders",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    const store = await loadOwnedStore(req, res, id);
    if (!store) return;
    const rows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.storeId, id))
      .orderBy(desc(ordersTable.createdAt));
    res.json(rows);
  },
);

// GET /stores/:id/customers — the owner (or admin) sees the customers who have
// ordered from this store, aggregated from the store's orders.
router.get(
  "/stores/:id/customers",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    const store = await loadOwnedStore(req, res, id);
    if (!store) return;

    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.storeId, id))
      .orderBy(desc(ordersTable.createdAt));

    type Agg = {
      phone: string;
      orderCount: number;
      totalSpent: number;
      lastOrderAt: string | null;
    };
    const byPhone = new Map<string, Agg>();
    for (const o of orders) {
      const cur = byPhone.get(o.customerPhone) ?? {
        phone: o.customerPhone,
        orderCount: 0,
        totalSpent: 0,
        lastOrderAt: null,
      };
      cur.orderCount += 1;
      cur.totalSpent += o.total;
      const at = o.createdAt ? new Date(o.createdAt).toISOString() : null;
      if (at && (!cur.lastOrderAt || at > cur.lastOrderAt)) cur.lastOrderAt = at;
      byPhone.set(o.customerPhone, cur);
    }

    // Enrich with the customer's saved name/avatar where available.
    const profiles = await db.select().from(customersTable);
    const profileByPhone = new Map(profiles.map((p) => [p.phone, p]));

    const result = Array.from(byPhone.values())
      .map((a) => {
        const p = profileByPhone.get(a.phone);
        return {
          phone: a.phone,
          name: p?.name ?? null,
          avatarUrl: p?.avatarUrl ?? null,
          orderCount: a.orderCount,
          totalSpent: a.totalSpent,
          lastOrderAt: a.lastOrderAt,
        };
      })
      .sort((x, y) => (y.lastOrderAt ?? "").localeCompare(x.lastOrderAt ?? ""));

    res.json(result);
  },
);

// GET /stores/:id/refunds — the owner (or admin) sees compensation requests for
// this store's orders only, enriched with the customer's saved name.
router.get(
  "/stores/:id/refunds",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    const store = await loadOwnedStore(req, res, id);
    if (!store) return;

    // Only refunds whose underlying order belongs to this store.
    const rows = await db
      .select({
        id: refundsTable.id,
        orderId: refundsTable.orderId,
        customerPhone: refundsTable.customerPhone,
        productName: refundsTable.productName,
        imageUrl: refundsTable.imageUrl,
        amount: refundsTable.amount,
        status: refundsTable.status,
        createdAt: refundsTable.createdAt,
        reviewedAt: refundsTable.reviewedAt,
      })
      .from(refundsTable)
      .innerJoin(ordersTable, eq(refundsTable.orderId, ordersTable.id))
      .where(eq(ordersTable.storeId, id))
      .orderBy(desc(refundsTable.createdAt));

    const profiles = await db.select().from(customersTable);
    const nameByPhone = new Map(profiles.map((p) => [p.phone, p.name]));

    res.json(
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : null,
        customerName: nameByPhone.get(r.customerPhone) ?? null,
      })),
    );
  },
);

const StoreRefundDecision = z.object({
  action: z.enum(["approve", "reject"]),
  amount: z.number().int().min(0).optional(),
});

// PATCH /stores/:id/refunds/:refundId — the owner (or admin) decides a
// compensation for one of THEIR store's orders: approve (crediting the
// customer's wallet, clamped to the item line total) or reject. Decided once.
router.patch(
  "/stores/:id/refunds/:refundId",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    const store = await loadOwnedStore(req, res, id);
    if (!store) return;

    const refundId = parseInt(String(req.params.refundId), 10);
    if (Number.isNaN(refundId)) {
      res.status(400).json({ error: "معرّف غير صالح" });
      return;
    }

    const parsed = StoreRefundDecision.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صالحة" });
      return;
    }
    const { action, amount } = parsed.data;

    try {
      const refund = await db.transaction(async (tx) => {
        const [row] = await tx
          .select()
          .from(refundsTable)
          .where(eq(refundsTable.id, refundId))
          .for("update");

        if (!row) {
          res.status(404).json({ error: "طلب التعويض غير موجود" });
          return null;
        }

        // The refund's order must belong to THIS store — isolation guard.
        const [order] = await tx
          .select()
          .from(ordersTable)
          .where(
            and(eq(ordersTable.id, row.orderId), eq(ordersTable.storeId, id)),
          );
        if (!order) {
          res.status(404).json({ error: "طلب التعويض غير موجود" });
          return null;
        }

        if (row.status !== REFUND_PENDING) {
          res.status(409).json({ error: "تمت مراجعة هذا الطلب مسبقاً" });
          return null;
        }

        if (action === "reject") {
          const [updated] = await tx
            .update(refundsTable)
            .set({ status: REFUND_REJECTED, amount: 0, reviewedAt: new Date() })
            .where(eq(refundsTable.id, refundId))
            .returning();
          return updated;
        }

        const item = order.items.find((i) => i.name === row.productName);
        const maxAmount = item
          ? Math.max(0, item.price) * Math.max(0, item.qty)
          : 0;
        if (maxAmount <= 0) {
          res.status(400).json({ error: "لا يوجد مبلغ قابل للتعويض" });
          return null;
        }

        const requested = amount ?? maxAmount;
        const creditAmount = Math.min(Math.max(1, requested), maxAmount);

        const [updated] = await tx
          .update(refundsTable)
          .set({
            status: REFUND_APPROVED,
            amount: creditAmount,
            reviewedAt: new Date(),
          })
          .where(eq(refundsTable.id, refundId))
          .returning();

        await tx
          .update(customersTable)
          .set({
            walletBalance: sql`${customersTable.walletBalance} + ${creditAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(customersTable.phone, row.customerPhone));

        return updated;
      });

      if (!refund) return; // a response was already sent inside the transaction
      res.json(refund);
    } catch (err) {
      req.log.error({ err }, "Error deciding store refund");
      res.status(500).json({ error: "تعذر تحديث طلب التعويض" });
    }
  },
);

export default router;
