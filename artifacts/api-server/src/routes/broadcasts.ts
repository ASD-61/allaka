import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, broadcastsTable, storesTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";
import { isAdminRequest, getCustomerPhone } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const BroadcastInputSchema = z.object({
  message: z.string().min(1).max(500),
});

// POST /broadcasts — admin sends a global announcement that appears in every
// customer's notifications feed (e.g. "وصلت خضار طازجة جديدة").
router.post(
  "/broadcasts",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = BroadcastInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "نص الإشعار مطلوب" });
      return;
    }

    const [broadcast] = await db
      .insert(broadcastsTable)
      .values({ message: parsed.data.message.trim(), storeId: null })
      .returning();

    res.status(201).json(broadcast);
  },
);

// POST /stores/:id/broadcasts — a merchant (or admin) sends an announcement
// that only reaches customers who have actually ordered from THIS store
// (e.g. "وصلت خضار طازجة جديدة عندنا اليوم").
router.post(
  "/stores/:id/broadcasts",
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

    const admin = isAdminRequest(req);
    const phone = getCustomerPhone(req);
    if (!admin && store.ownerPhone !== phone) {
      res.status(401).json({ error: "لا تملك صلاحية الوصول لهذا المتجر" });
      return;
    }

    const parsed = BroadcastInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "نص الإشعار مطلوب" });
      return;
    }

    const [broadcast] = await db
      .insert(broadcastsTable)
      .values({ message: parsed.data.message.trim(), storeId: id })
      .returning();

    res.status(201).json(broadcast);
  },
);

export default router;
