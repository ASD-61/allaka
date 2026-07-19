import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  storesTable,
  storeRatingsTable,
} from "@workspace/db";
import { requireCustomer } from "../middlewares/customerAuth";
import { z } from "zod";

const router: IRouter = Router();

const DELIVERED = "تم التسليم";

const RatingInputSchema = z.object({
  orderId: z.number().int(),
  stars: z.number().int().min(1).max(5),
});

// GET /ratings/order/:orderId — the rate screen (opened from the WhatsApp
// "قيّم المتجر" link after delivery) loads the order's store name and whether
// it was already rated, so it can show the store being rated and pre-fill /
// lock in an existing rating.
router.get(
  "/ratings/order/:orderId",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const orderId = parseInt(String(req.params.orderId), 10);
    if (Number.isNaN(orderId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));
    if (!order || order.customerPhone !== req.customerPhone!) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    const store = order.storeId
      ? (
          await db
            .select()
            .from(storesTable)
            .where(eq(storesTable.id, order.storeId))
        )[0]
      : null;

    const [existing] = await db
      .select()
      .from(storeRatingsTable)
      .where(eq(storeRatingsTable.orderId, orderId));

    res.json({
      orderId,
      storeId: order.storeId,
      storeName: store?.name ?? null,
      delivered: order.status === DELIVERED,
      stars: existing?.stars ?? null,
    });
  },
);

// POST /ratings — a customer rates a delivered order's store 1–5 stars (once
// per order). Updates the store's running rating aggregate so the average can
// be shown to shoppers on the store card.
router.post(
  "/ratings",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = RatingInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "قيّم من ١ إلى ٥ نجوم" });
      return;
    }

    const { orderId, stars } = parsed.data;

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));
    if (!order || order.customerPhone !== req.customerPhone!) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    if (order.status !== DELIVERED) {
      res.status(400).json({ error: "يمكن التقييم بعد استلام الطلب فقط" });
      return;
    }
    if (order.storeId == null) {
      res.status(400).json({ error: "هذا الطلب غير مرتبط بمتجر" });
      return;
    }

    const [already] = await db
      .select()
      .from(storeRatingsTable)
      .where(eq(storeRatingsTable.orderId, orderId));
    if (already) {
      res.status(409).json({ error: "سبق وقيّمت هذا الطلب" });
      return;
    }

    await db.insert(storeRatingsTable).values({
      orderId,
      storeId: order.storeId,
      customerPhone: req.customerPhone!,
      stars,
    });

    await db
      .update(storesTable)
      .set({
        ratingSum: sql`${storesTable.ratingSum} + ${stars}`,
        ratingCount: sql`${storesTable.ratingCount} + 1`,
      })
      .where(eq(storesTable.id, order.storeId));

    res.status(201).json({ orderId, stars });
  },
);

export default router;
