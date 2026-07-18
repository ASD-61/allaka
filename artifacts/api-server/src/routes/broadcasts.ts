import { Router, type IRouter, type Request, type Response } from "express";
import { db, broadcastsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";
import { z } from "zod";

const router: IRouter = Router();

const BroadcastInputSchema = z.object({
  message: z.string().min(1).max(500),
});

// POST /broadcasts — admin sends an announcement that appears in every
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
      .values({ message: parsed.data.message.trim() })
      .returning();

    res.status(201).json(broadcast);
  },
);

export default router;
