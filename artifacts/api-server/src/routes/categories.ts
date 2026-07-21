import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, categoriesTable, productsTable, storesTable } from "@workspace/db";
import { isAdminRequest, getCustomerPhone } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const ACTIVE = "مفعّل";
// Stores whose owner_phone equals this marker belong to the platform admin
// (mirrors the same convention used in routes/products.ts).
const ADMIN_OWNER = "admin";

const CategoryBody = z.object({
  name: z.string().min(1),
  storeId: z.number().int().nullable().optional(),
});

async function adminStoreId(): Promise<number | null> {
  const [store] = await db
    .select()
    .from(storesTable)
    .where(eq(storesTable.ownerPhone, ADMIN_OWNER));
  return store?.id ?? null;
}

// Confirms the caller may manage categories of `storeId` and resolves the
// effective store id to use: an admin may only manage their own (admin-owned)
// store's categories; a merchant may only manage their own active store's.
// Returns the resolved store id, or undefined after sending an error response.
async function resolveManageableStoreId(
  req: Request,
  res: Response,
  requestedStoreId: number | null | undefined,
): Promise<number | null | undefined> {
  if (isAdminRequest(req)) {
    const ownStoreId = await adminStoreId();
    if (requestedStoreId != null && requestedStoreId !== ownStoreId) {
      res.status(403).json({ error: "لا تملك صلاحية إدارة فئات هذا المتجر" });
      return undefined;
    }
    return ownStoreId;
  }

  const phone = getCustomerPhone(req);
  if (!phone) {
    res.status(401).json({ error: "يجب تسجيل الدخول" });
    return undefined;
  }
  if (requestedStoreId == null) {
    res.status(400).json({ error: "يجب تحديد المتجر" });
    return undefined;
  }
  const [store] = await db
    .select()
    .from(storesTable)
    .where(eq(storesTable.id, requestedStoreId));
  if (!store || store.ownerPhone !== phone) {
    res.status(401).json({ error: "لا تملك صلاحية إدارة فئات هذا المتجر" });
    return undefined;
  }
  if (store.status !== ACTIVE) {
    res.status(403).json({ error: "متجرك غير مفعّل حالياً" });
    return undefined;
  }
  return requestedStoreId;
}

// GET /categories?storeId=X — each store (admin's own, or a merchant's) has
// its own category list so one merchant's categories never leak into
// another's product form. Admin callers may omit storeId to get their own.
router.get("/categories", async (req: Request, res: Response): Promise<void> => {
  const raw = req.query.storeId;
  const parsedId = typeof raw === "string" ? parseInt(raw, 10) : NaN;
  let storeId: number | null | undefined = Number.isNaN(parsedId)
    ? undefined
    : parsedId;

  if (storeId === undefined) {
    if (!isAdminRequest(req)) {
      res.json([]);
      return;
    }
    storeId = await adminStoreId();
  }

  const rows =
    storeId == null
      ? []
      : await db
          .select()
          .from(categoriesTable)
          .where(eq(categoriesTable.storeId, storeId))
          .orderBy(categoriesTable.id);
  res.json(rows);
});

router.post(
  "/categories",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = CategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "اسم الفئة مطلوب" });
      return;
    }

    const storeId = await resolveManageableStoreId(req, res, parsed.data.storeId);
    if (storeId === undefined) return;

    try {
      const [cat] = await db
        .insert(categoriesTable)
        .values({ name: parsed.data.name.trim(), storeId })
        .returning();
      res.status(201).json(cat);
    } catch {
      res.status(400).json({ error: "الفئة موجودة مسبقاً" });
    }
  },
);

router.patch(
  "/categories/:id",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = CategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "اسم الفئة مطلوب" });
      return;
    }

    const [existing] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "الفئة غير موجودة" });
      return;
    }

    const storeId = await resolveManageableStoreId(req, res, existing.storeId);
    if (storeId === undefined) return;

    const newName = parsed.data.name.trim();

    try {
      const cat = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(categoriesTable)
          .set({ name: newName })
          .where(eq(categoriesTable.id, id))
          .returning();

        // Keep every product of this store that referenced the OLD category
        // name in sync, since products.category is a plain string, not a
        // foreign key. Only rows matching the old name are touched (not every
        // product in the store).
        if (existing.name !== newName && existing.storeId != null) {
          await tx
            .update(productsTable)
            .set({ category: newName })
            .where(
              and(
                eq(productsTable.storeId, existing.storeId),
                eq(productsTable.category, existing.name),
              ),
            );
        }

        return updated;
      });

      res.json(cat);
    } catch {
      res.status(400).json({ error: "الفئة موجودة مسبقاً" });
    }
  },
);

router.delete(
  "/categories/:id",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [existing] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "الفئة غير موجودة" });
      return;
    }

    const storeId = await resolveManageableStoreId(req, res, existing.storeId);
    if (storeId === undefined) return;

    const [productInUse] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.category, existing.name))
      .limit(1);

    if (productInUse) {
      res.status(409).json({
        error:
          "لا يمكن حذف هذه الفئة لأنها مستخدمة في منتجات حالياً. الرجاء نقل أو حذف تلك المنتجات أولاً.",
      });
      return;
    }

    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));

    res.sendStatus(204);
  },
);

export default router;
