import { Router, type IRouter, type Request, type Response } from "express";
import { asc, eq } from "drizzle-orm";
import { db, storeTypesTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";
import { z } from "zod";

const router: IRouter = Router();

const StoreTypeBody = z.object({
  name: z.string().min(1),
  imageUrl: z.string().nullish(),
  sortOrder: z.number().int().optional(),
  showRecipes: z.boolean().optional(),
});

const StoreTypeUpdateBody = z.object({
  name: z.string().min(1).optional(),
  imageUrl: z.string().nullish(),
  sortOrder: z.number().int().optional(),
  showRecipes: z.boolean().optional(),
});

function cleanText(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
}

// GET /store-types — public: the curated store-type cards for the landing.
router.get("/store-types", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(storeTypesTable)
    .orderBy(asc(storeTypesTable.sortOrder), asc(storeTypesTable.name));
  res.json(rows);
});

// POST /store-types — admin adds a new type with an optional uploaded image.
router.post(
  "/store-types",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = StoreTypeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات النوع غير صالحة" });
      return;
    }

    const name = parsed.data.name.trim();
    const [existing] = await db
      .select()
      .from(storeTypesTable)
      .where(eq(storeTypesTable.name, name));
    if (existing) {
      res.status(409).json({ error: "هذا النوع موجود مسبقاً" });
      return;
    }

    const [row] = await db
      .insert(storeTypesTable)
      .values({
        name,
        imageUrl: cleanText(parsed.data.imageUrl),
        sortOrder: parsed.data.sortOrder ?? 0,
        showRecipes: parsed.data.showRecipes ?? false,
      })
      .returning();

    res.status(201).json(row);
  },
);

// PATCH /store-types/:id — admin edits a type's name/image/order.
router.patch(
  "/store-types/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = StoreTypeUpdateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صالحة" });
      return;
    }

    const patch: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
    if (parsed.data.imageUrl !== undefined)
      patch.imageUrl = cleanText(parsed.data.imageUrl);
    if (parsed.data.sortOrder !== undefined)
      patch.sortOrder = parsed.data.sortOrder;
    if (parsed.data.showRecipes !== undefined)
      patch.showRecipes = parsed.data.showRecipes;

    if (Object.keys(patch).length === 0) {
      const [row] = await db
        .select()
        .from(storeTypesTable)
        .where(eq(storeTypesTable.id, id));
      if (!row) {
        res.status(404).json({ error: "النوع غير موجود" });
        return;
      }
      res.json(row);
      return;
    }

    const [row] = await db
      .update(storeTypesTable)
      .set(patch)
      .where(eq(storeTypesTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "النوع غير موجود" });
      return;
    }
    res.json(row);
  },
);

// DELETE /store-types/:id — admin removes a type from the landing list. Stores
// keep their free-text store_type value; only the curated card disappears.
router.delete(
  "/store-types/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .delete(storeTypesTable)
      .where(eq(storeTypesTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "النوع غير موجود" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
