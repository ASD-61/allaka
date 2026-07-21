import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, refundsTable, ordersTable, customersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";
import { requireCustomer } from "../middlewares/customerAuth";
import { creditStoreWallet } from "../lib/wallet";
import { createNotification } from "../lib/notifications";
import { z } from "zod";

const router: IRouter = Router();

const PENDING = "قيد المراجعة";
const APPROVED = "تمت الموافقة";
const REJECTED = "مرفوض";

// `amount` is intentionally NOT accepted from the customer — the compensation is
// decided by the merchant during review and can never be forged by the client.
const RefundInputSchema = z
  .object({
    orderId: z.number().int(),
    productName: z.string().min(1),
    // Either a single `imageUrl` (legacy clients) or an `imageUrls` array (new
    // clients that let the customer attach several photos). At least one photo
    // is required.
    imageUrl: z.string().min(1).optional(),
    imageUrls: z.array(z.string().min(1)).min(1).max(6).optional(),
    note: z.string().max(1000).optional(),
  })
  .refine((v) => !!v.imageUrl || (v.imageUrls && v.imageUrls.length > 0), {
    message: "صورة واحدة على الأقل مطلوبة",
  });

const RefundDecisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  amount: z.number().int().min(0).optional(),
  // Reason shown to the customer when rejecting.
  reason: z.string().max(500).optional(),
});

// Thrown inside a transaction to roll back and map to an HTTP status.
class RefundError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// GET /refunds — admin only: review all quality-refund reports.
router.get(
  "/refunds",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(refundsTable)
      .orderBy(desc(refundsTable.createdAt));
    res.json(rows);
  },
);

// POST /refunds — a customer reports a damaged item WITH a photo. This only
// creates a pending request for the merchant to review; NO wallet credit is
// given here. The merchant decides the outcome and amount in PATCH /refunds/:id.
router.post(
  "/refunds",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = RefundInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صالحة" });
      return;
    }

    const customerPhone = req.customerPhone!;
    const { orderId, productName, note } = parsed.data;
    // Normalise photos into a non-empty list; `imageUrl` stays the first one.
    const imageUrls =
      parsed.data.imageUrls && parsed.data.imageUrls.length > 0
        ? parsed.data.imageUrls
        : [parsed.data.imageUrl!];
    const imageUrl = imageUrls[0]!;

    try {
      // The order must exist, belong to the customer, and be delivered.
      const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId));

      if (!order || order.customerPhone !== customerPhone) {
        res.status(404).json({ error: "الطلب غير موجود" });
        return;
      }
      if (order.status !== "تم التسليم") {
        res.status(400).json({ error: "لا يمكن طلب تعويض لطلب غير مُسلَّم" });
        return;
      }

      // The reported product must actually be an item in this order.
      const item = order.items.find((i) => i.name === productName);
      if (!item) {
        res.status(400).json({ error: "المنتج غير موجود ضمن هذا الطلب" });
        return;
      }

      // One request per order item — reject duplicate claims.
      const [existing] = await db
        .select({ id: refundsTable.id })
        .from(refundsTable)
        .where(
          and(
            eq(refundsTable.orderId, orderId),
            eq(refundsTable.productName, productName),
          ),
        );
      if (existing) {
        res.status(409).json({ error: "تم تقديم طلب تعويض لهذا المنتج مسبقاً" });
        return;
      }

      const [refund] = await db
        .insert(refundsTable)
        .values({
          orderId,
          customerPhone,
          productName,
          imageUrl,
          imageUrls,
          note: note?.trim() || null,
          amount: 0,
          status: PENDING,
        })
        .returning();

      res.status(201).json(refund);
    } catch (err) {
      req.log.error({ err }, "Error creating refund");
      res.status(500).json({ error: "تعذر تقديم طلب التعويض" });
    }
  },
);

// PATCH /refunds/:id — admin reviews the photo and decides: approve with a
// compensation amount (partial or the full item price) or reject. The wallet is
// credited only on approval, atomically, and only once (pending → decided).
router.patch(
  "/refunds/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "معرّف غير صالح" });
      return;
    }
    const parsed = RefundDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صالحة" });
      return;
    }
    const { action, amount, reason } = parsed.data;

    try {
      const refund = await db.transaction(async (tx) => {
        // Lock the refund row so it can only be decided once.
        const [row] = await tx
          .select()
          .from(refundsTable)
          .where(eq(refundsTable.id, id))
          .for("update");

        if (!row) throw new RefundError(404, "طلب التعويض غير موجود");
        if (row.status !== PENDING) {
          throw new RefundError(409, "تمت مراجعة هذا الطلب مسبقاً");
        }

        if (action === "reject") {
          const [updated] = await tx
            .update(refundsTable)
            .set({
              status: REJECTED,
              amount: 0,
              rejectReason: reason?.trim() || null,
              reviewedAt: new Date(),
            })
            .where(eq(refundsTable.id, id))
            .returning();
          return updated;
        }

        // Approve — derive the trusted maximum from the order item.
        const [order] = await tx
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.id, row.orderId));
        const item = order?.items.find((i) => i.name === row.productName);
        const maxAmount = item
          ? Math.max(0, item.price) * Math.max(0, item.qty)
          : 0;
        if (maxAmount <= 0) {
          throw new RefundError(400, "لا يوجد مبلغ قابل للتعويض");
        }

        // Clamp the merchant's chosen amount to [1, item line total]; default to
        // the full item price when no amount is provided.
        const requested = amount ?? maxAmount;
        const creditAmount = Math.min(Math.max(1, requested), maxAmount);

        const [updated] = await tx
          .update(refundsTable)
          .set({
            status: APPROVED,
            amount: creditAmount,
            reviewedAt: new Date(),
          })
          .where(eq(refundsTable.id, id))
          .returning();

        // Credit the customer's per-store wallet so the refund can only be
        // spent at the store that issued it (atomic upsert, no race).
        await creditStoreWallet(
          tx,
          row.customerPhone,
          order?.storeId ?? null,
          creditAmount,
        );

        return updated;
      });

      // Tell the customer the outcome in their in-app notifications feed.
      if (refund.status === APPROVED) {
        void createNotification(refund.customerPhone, {
          type: "refund",
          title: "✅ تمت الموافقة على تعويضك",
          body: `تم تعويضك عن "${refund.productName}" بمبلغ ${refund.amount.toLocaleString(
            "ar-IQ",
          )} د.ع وأُضيف إلى محفظتك.`,
          data: { refundId: refund.id, orderId: refund.orderId, amount: refund.amount },
        });
      } else if (refund.status === REJECTED) {
        void createNotification(refund.customerPhone, {
          type: "refund",
          title: "❌ تم رفض طلب التعويض",
          body: refund.rejectReason
            ? `طلب تعويضك عن "${refund.productName}" مرفوض.\nالسبب: ${refund.rejectReason}`
            : `طلب تعويضك عن "${refund.productName}" مرفوض.`,
          data: { refundId: refund.id, orderId: refund.orderId },
        });
      }

      res.json(refund);
    } catch (err) {
      if (err instanceof RefundError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      req.log.error({ err }, "Error deciding refund");
      res.status(500).json({ error: "تعذر تحديث طلب التعويض" });
    }
  },
);

export default router;
