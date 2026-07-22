import { Router, type IRouter, type Request, type Response } from "express";
import { asc, eq } from "drizzle-orm";
import { db, recipesTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";
import { z } from "zod";

const router: IRouter = Router();

const RecipeBody = z.object({
  name: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  sortOrder: z.number().int().optional(),
});

const RecipeUpdateBody = z.object({
  name: z.string().min(1).optional(),
  keywords: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

// Normalises a keyword list: trims each, drops empties/duplicates.
function cleanKeywords(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const k = raw.trim();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

// GET /recipes — public: the recipe list powering "شنو نطبخ اليوم؟".
router.get("/recipes", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(recipesTable)
    .orderBy(asc(recipesTable.sortOrder), asc(recipesTable.id));
  res.json(rows);
});

// POST /recipes — admin adds a new recipe with its ingredient keywords.
router.post(
  "/recipes",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = RecipeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات الطبخة غير صالحة" });
      return;
    }
    const [row] = await db
      .insert(recipesTable)
      .values({
        name: parsed.data.name.trim(),
        keywords: cleanKeywords(parsed.data.keywords),
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();
    res.status(201).json(row);
  },
);

// PATCH /recipes/:id — admin edits a recipe's name / ingredients / order.
router.patch(
  "/recipes/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = RecipeUpdateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صالحة" });
      return;
    }
    const patch: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
    if (parsed.data.keywords !== undefined)
      patch.keywords = cleanKeywords(parsed.data.keywords);
    if (parsed.data.sortOrder !== undefined)
      patch.sortOrder = parsed.data.sortOrder;

    if (Object.keys(patch).length === 0) {
      const [row] = await db
        .select()
        .from(recipesTable)
        .where(eq(recipesTable.id, id));
      if (!row) {
        res.status(404).json({ error: "الطبخة غير موجودة" });
        return;
      }
      res.json(row);
      return;
    }

    const [row] = await db
      .update(recipesTable)
      .set(patch)
      .where(eq(recipesTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "الطبخة غير موجودة" });
      return;
    }
    res.json(row);
  },
);

// DELETE /recipes/:id — admin removes a recipe.
router.delete(
  "/recipes/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .delete(recipesTable)
      .where(eq(recipesTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "الطبخة غير موجودة" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
