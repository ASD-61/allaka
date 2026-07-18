import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, isNotNull, lt, sql } from "drizzle-orm";
import { db, productsTable, storesTable } from "@workspace/db";
import {
  CreateProductBody,
  UpdateProductBody,
} from "@workspace/api-zod";
import { isAdminRequest, getCustomerPhone } from "../lib/auth";

const router: IRouter = Router();

const ACTIVE = "مفعّل";

// Stores whose owner_phone equals this marker belong to the platform admin
// (not a real merchant). Only these — plus legacy products with no store — are
// the admin's to manage; merchant-owned stores' products are off-limits to the
// admin so each merchant fully controls their own inventory.
const ADMIN_OWNER = "admin";

// Product writes are allowed for an admin (any product) or a store owner
// (only products of their own active store). Returns the actor, or null after
// sending a 401 response.
function resolveActor(
  req: Request,
  res: Response,
): { admin: boolean; phone: string | null } | null {
  if (isAdminRequest(req)) return { admin: true, phone: null };
  const phone = getCustomerPhone(req);
  if (phone) return { admin: false, phone };
  res.status(401).json({ error: "يجب تسجيل الدخول" });
  return null;
}

// Confirm the caller may manage products of `storeId`: admins always may; a
// merchant may only manage their own active store. Returns true, or false
// after sending an error response.
async function ensureCanManageStore(
  res: Response,
  actor: { admin: boolean; phone: string | null },
  storeId: number | null | undefined,
): Promise<boolean> {
  // The admin manages only their own (admin-owned) store products, plus legacy
  // products that aren't attached to any store. Merchant products are off-limits.
  if (actor.admin) {
    if (storeId == null) return true;
    const [store] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.id, storeId));
    if (store && store.ownerPhone === ADMIN_OWNER) return true;
    res.status(403).json({
      error: "منتجات هذا المتجر يديرها صاحبه، لا تملك صلاحية تعديلها",
    });
    return false;
  }
  if (storeId == null) {
    res.status(400).json({ error: "يجب تحديد المتجر" });
    return false;
  }
  const [store] = await db
    .select()
    .from(storesTable)
    .where(eq(storesTable.id, storeId));
  if (!store || store.ownerPhone !== actor.phone) {
    res.status(401).json({ error: "لا تملك صلاحية إدارة منتجات هذا المتجر" });
    return false;
  }
  if (store.status !== ACTIVE) {
    res.status(403).json({ error: "متجرك غير مفعّل حالياً" });
    return false;
  }
  return true;
}

// Resolves the admin-owned store id so admin-created products land in the
// admin's own store (rather than a null/unassigned store).
async function adminStoreId(): Promise<number | null> {
  const [store] = await db
    .select()
    .from(storesTable)
    .where(eq(storesTable.ownerPhone, ADMIN_OWNER));
  return store?.id ?? null;
}

/**
 * Lazily expire ended offers: any product whose discountExpiresAt has passed
 * gets its original price restored and offer fields cleared. Runs before
 * reads so clients never see a stale offer price — no cron needed.
 */
async function expireEndedOffers(): Promise<void> {
  await db
    .update(productsTable)
    .set({
      price: sql`${productsTable.originalPrice}`,
      originalPrice: null,
      discountPercent: null,
      discountExpiresAt: null,
    })
    .where(
      and(
        lt(productsTable.discountExpiresAt, new Date()),
        isNotNull(productsTable.originalPrice),
      ),
    );
  // Offers without an originalPrice to restore just get their expiry cleared.
  await db
    .update(productsTable)
    .set({ discountPercent: null, discountExpiresAt: null })
    .where(lt(productsTable.discountExpiresAt, new Date()));
}

router.get("/products", async (req, res): Promise<void> => {
  await expireEndedOffers();
  const category =
    typeof req.query.category === "string" ? req.query.category : undefined;
  const storeIdRaw =
    typeof req.query.storeId === "string" ? parseInt(req.query.storeId, 10) : NaN;

  const conditions = [];
  if (category && category !== "الكل") {
    conditions.push(eq(productsTable.category, category));
  }
  if (!Number.isNaN(storeIdRaw)) {
    conditions.push(eq(productsTable.storeId, storeIdRaw));
  }

  const rows = await db
    .select()
    .from(productsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(productsTable.createdAt));

  res.json(rows);
});

router.post("/products", async (req, res): Promise<void> => {
  const actor = resolveActor(req, res);
  if (!actor) return;

  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Admin-created products default to the admin's own store so they stay
  // separated from (and never mixed into) any merchant's store.
  if (actor.admin && parsed.data.storeId == null) {
    const ownStore = await adminStoreId();
    if (ownStore != null) parsed.data.storeId = ownStore;
  }

  if (!(await ensureCanManageStore(res, actor, parsed.data.storeId))) return;

  const [product] = await db
    .insert(productsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(product);
});

router.get("/products/:id", async (req, res): Promise<void> => {
  await expireEndedOffers();
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(product);
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const actor = resolveActor(req, res);
  if (!actor) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  if (!(await ensureCanManageStore(res, actor, existing.storeId))) return;

  // A merchant can never move their product to another store.
  const patch = { ...parsed.data };
  if (!actor.admin) delete patch.storeId;

  const [product] = await db
    .update(productsTable)
    .set(patch)
    .where(eq(productsTable.id, id))
    .returning();

  res.json(product);
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const actor = resolveActor(req, res);
  if (!actor) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [existing] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  if (!(await ensureCanManageStore(res, actor, existing.storeId))) return;

  await db.delete(productsTable).where(eq(productsTable.id, id));

  res.sendStatus(204);
});

export default router;
