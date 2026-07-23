import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, inArray, and, lte, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  customersTable,
  productsTable,
  storesTable,
  deliveryDriversTable,
  customerStoreWalletsTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";
import { requireCustomer } from "../middlewares/customerAuth";
import { isAdminRequest, getCustomerPhone } from "../lib/auth";
import {
  sendWhatsAppOrderNotification,
  sendWhatsAppOrderConfirmationToCustomer,
  sendWhatsAppRatingRequest,
} from "../lib/whatsapp";
import { createNotification } from "../lib/notifications";
import { z } from "zod";

const router: IRouter = Router();

const OrderItemSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  price: z.number().int().min(0),
  unit: z.string(),
  // Weight-based items step in halves (0.5 kg), so qty is a positive
  // multiple of 0.5 rather than a whole number.
  qty: z.number().min(0.5).multipleOf(0.5),
  // Optional merchant special-pricing note carried from the product.
  priceNote: z.string().max(200).nullable().optional(),
});

// NOTE: customerPhone is intentionally NOT part of the input schema — it is
// always derived server-side from the authenticated customer's JWT
// (req.customerPhone via requireCustomer) so a client can never place an
// order or read history under someone else's phone number.
const OrderInputSchema = z.object({
  items: z.array(OrderItemSchema).min(1),
  deliveryType: z.enum(["standard", "express"]),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  redeem: z.enum(["discount", "free_delivery"]).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  pickupTime: z.string().max(100).nullable().optional(),
  walletApplied: z.number().int().min(0).optional(),
  // The store this single-store cart belongs to.
  storeId: z.number().int().nullable().optional(),
});

// "نسيت غرض": items a customer can append to a very recent, still-preparing
// order without paying delivery again.
const AddItemsSchema = z.object({
  items: z.array(OrderItemSchema).min(1),
});
const ADD_ITEMS_WINDOW_MS = 15 * 60 * 1000;

const StatusUpdateSchema = z.object({
  status: z.enum(["قيد التحضير", "في الطريق", "تم التسليم"]),
});

const AssignDriverSchema = z.object({
  driverId: z.number().int(),
});

// Loads the owning store for an order's notifications (owner phone for the
// merchant alert, name/address for the customer's receipt). Returns null when
// there's no store.
async function resolveOrderStore(
  storeId: number | null | undefined,
): Promise<typeof storesTable.$inferSelect | null> {
  if (storeId == null) return null;
  const [store] = await db
    .select()
    .from(storesTable)
    .where(eq(storesTable.id, storeId));
  return store ?? null;
}

// Each merchant sees their own orders numbered 1, 2, 3... starting from
// their first order, instead of the global (cross-store) order id — so a
// brand-new store doesn't show a confusing "order #503". Computed on the fly
// from creation order (ids are sequential) rather than stored, so it needs no
// migration and is always consistent.
async function resolveStoreOrderNumber(
  storeId: number | null | undefined,
  orderId: number,
): Promise<number | null> {
  if (storeId == null) return null;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(and(eq(ordersTable.storeId, storeId), lte(ordersTable.id, orderId)));
  return row?.count ?? null;
}

const POINTS_THRESHOLD = 100;
// Redeeming 100 points gives a flat 2,000 IQD discount OR free express delivery
// (express normally costs 3,000 IQD).
const REDEEM_DISCOUNT = 2000;

// GET /orders — admin sees all (optionally filtered by ?phone= for lookup),
// an authenticated customer only ever sees their own orders regardless of
// any ?phone= query value (prevents reading another customer's history by
// guessing/spoofing a phone number).
router.get("/orders", async (req: Request, res: Response): Promise<void> => {
  const isAdmin = isAdminRequest(req);
  const requestedPhone =
    typeof req.query.phone === "string" ? req.query.phone : undefined;

  let phoneFilter: string | undefined;
  if (isAdmin) {
    phoneFilter = requestedPhone;
  } else {
    const ownPhone = getCustomerPhone(req);
    if (!ownPhone) {
      res.status(401).json({ error: "يجب تسجيل الدخول" });
      return;
    }
    phoneFilter = ownPhone;
  }

  // storeOrderNumber: each order's 1-based position among its own store's
  // orders, so every merchant's admin/order views show "طلب #1، #2..."
  // starting from their own first order rather than the global database id.
  const storeOrderNumberCol = sql<number | null>`case when ${ordersTable.storeId} is null then null else row_number() over (partition by ${ordersTable.storeId} order by ${ordersTable.id}) end`;

  const rows = phoneFilter
    ? await db
        .select({ order: ordersTable, storeOrderNumber: storeOrderNumberCol })
        .from(ordersTable)
        .where(eq(ordersTable.customerPhone, phoneFilter))
        .orderBy(desc(ordersTable.createdAt))
    : await db
        .select({ order: ordersTable, storeOrderNumber: storeOrderNumberCol })
        .from(ordersTable)
        .orderBy(desc(ordersTable.createdAt));

  res.json(
    rows.map((r) => ({
      ...r.order,
      storeOrderNumber: r.storeOrderNumber != null ? Number(r.storeOrderNumber) : null,
    })),
  );
});

// POST /orders — requires a logged-in customer; the order is always placed
// under the authenticated customer's own phone number (never a client-
// supplied one) so points/orders can't be attributed to someone else.
router.post(
  "/orders",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = OrderInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const customerPhone = req.customerPhone!;
    const { items, deliveryType, latitude, longitude, redeem } = parsed.data;
    const pickupTime = parsed.data.pickupTime?.trim() || null;
    const walletRequested = parsed.data.walletApplied ?? 0;

    // Re-check availability server-side — a client could still submit an
    // order for a product that was marked out of stock after the item was
    // added to the cart (or via a spoofed request), so we can't rely on the
    // UI disabling the "add to cart" button alone.
    const productIds = items.map((i) => i.id);
    const currentProducts = await db
      .select()
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));

    const productsById = new Map(currentProducts.map((p) => [p.id, p]));
    const unavailable = items.filter((i) => {
      const product = productsById.get(i.id);
      return !product || !product.inStock;
    });

    if (unavailable.length > 0) {
      res.status(409).json({
        error: `بعض المنتجات غير متوفرة حاليًا: ${unavailable
          .map((i) => i.name)
          .join("، ")}`,
      });
      return;
    }

    const subtotal = items.reduce(
      (sum: number, i: { price: number; qty: number }) => sum + i.price * i.qty,
      0,
    );
    const baseDeliveryFee = deliveryType === "express" ? 3000 : 2000;

    // Fetch or create customer
    let [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.phone, customerPhone));

    if (!customer) {
      [customer] = await db
        .insert(customersTable)
        .values({ phone: customerPhone })
        .returning();
    }

    // Per-store wallet + loyalty points. Both accumulate independently for
    // each store: wallet credit (quality refunds, spendable only here) and
    // loyalty points (earned and redeemed only at this store).
    const orderStoreId = parsed.data.storeId ?? null;
    let storeWalletBalance = 0;
    let storePoints = 0;
    if (orderStoreId != null) {
      const [sw] = await db
        .select()
        .from(customerStoreWalletsTable)
        .where(
          and(
            eq(customerStoreWalletsTable.customerPhone, customerPhone),
            eq(customerStoreWalletsTable.storeId, orderStoreId),
          ),
        );
      storeWalletBalance = sw?.balance ?? 0;
      storePoints = sw?.points ?? 0;
    }

    // You can only redeem points you built up AT THIS store.
    const canRedeem = orderStoreId != null && storePoints >= POINTS_THRESHOLD;
    const actualRedeem = canRedeem && redeem ? redeem : null;

    let discountApplied = 0;
    let deliveryFee = baseDeliveryFee;
    let pointsRedeemed = 0;
    let redemptionType: string | null = null;

    if (actualRedeem === "discount") {
      discountApplied = Math.min(REDEEM_DISCOUNT, subtotal);
      pointsRedeemed = POINTS_THRESHOLD;
      redemptionType = "discount";
    } else if (actualRedeem === "free_delivery") {
      deliveryFee = 0;
      pointsRedeemed = POINTS_THRESHOLD;
      redemptionType = "free_delivery";
    }

    const grossTotal = subtotal - discountApplied + deliveryFee;

    // Wallet credit comes from two sources: this store's own balance plus the
    // general balance (referral/admin credit, spendable anywhere). Spend the
    // store balance first.
    const availableWallet = customer.walletBalance + storeWalletBalance;

    // Clamp to what's available and the order's gross total so it can never
    // overdraw the wallet or push the total below zero.
    const walletApplied = Math.max(
      0,
      Math.min(walletRequested, availableWallet, grossTotal),
    );
    const total = grossTotal - walletApplied;

    // Deduct store balance first, remainder from the general balance.
    const fromStore = Math.min(walletApplied, storeWalletBalance);
    const fromGeneral = walletApplied - fromStore;

    // Loyalty: 1 point per 1,000 IQD of the order value before wallet credit
    // (wallet is spent like cash), floored — credited to THIS store's points.
    const pointsEarned = Math.floor(grossTotal / 1000);
    // customers.points is kept as the running total across all stores (for the
    // profile badge) using the same delta as the store's points.
    const newGlobalPoints = customer.points - pointsRedeemed + pointsEarned;
    const newWalletBalance = customer.walletBalance - fromGeneral;

    // Update the customer's global total points and general wallet balance.
    await db
      .update(customersTable)
      .set({
        points: newGlobalPoints,
        walletBalance: newWalletBalance,
        updatedAt: new Date(),
      })
      .where(eq(customersTable.phone, customerPhone));

    // Upsert this store's wallet row: apply the points change and deduct any
    // store balance spent. Insert lazily if the customer never had a row here.
    if (orderStoreId != null) {
      const newStorePoints = Math.max(0, storePoints - pointsRedeemed + pointsEarned);
      const newStoreBalance = Math.max(0, storeWalletBalance - fromStore);
      await db
        .insert(customerStoreWalletsTable)
        .values({
          customerPhone,
          storeId: orderStoreId,
          balance: newStoreBalance,
          points: newStorePoints,
        })
        .onConflictDoUpdate({
          target: [
            customerStoreWalletsTable.customerPhone,
            customerStoreWalletsTable.storeId,
          ],
          set: {
            balance: newStoreBalance,
            points: newStorePoints,
            updatedAt: new Date(),
          },
        });
    }

    // Insert order
    const [order] = await db
      .insert(ordersTable)
      .values({
        customerPhone,
        items: items.map((i: { id: number; name: string; price: number; unit: string; qty: number; priceNote?: string | null }) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          unit: i.unit,
          qty: i.qty,
          priceNote: i.priceNote ?? null,
        })),
        subtotal,
        deliveryFee,
        deliveryType,
        discountApplied,
        pointsEarned,
        pointsRedeemed,
        redemptionType,
        walletApplied,
        pickupTime,
        note: parsed.data.note?.trim() || null,
        total,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        storeId: parsed.data.storeId ?? null,
      })
      .returning();

    // Notify both sides on WhatsApp (non-blocking): the store owner gets the
    // new-order alert, and the customer gets their own receipt with the store's
    // details + purchased items.
    Promise.all([
      resolveOrderStore(order.storeId),
      resolveStoreOrderNumber(order.storeId, order.id),
    ])
      .then(([store, storeOrderNumber]) => {
        const displayNumber = storeOrderNumber ?? order.id;
        void sendWhatsAppOrderNotification({
          orderId: order.id,
          customerPhone,
          items,
          total,
          deliveryType,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          note: parsed.data.note?.trim() || null,
          pickupTime,
          headline: `طلب جديد #${displayNumber}`,
          toPhone: store?.ownerPhone ?? null,
        });
        void sendWhatsAppOrderConfirmationToCustomer({
          orderId: order.id,
          customerPhone,
          storeName: store?.name ?? null,
          storeAddress: store?.address ?? null,
          storePhone: store?.ownerPhone ?? null,
          storeLatitude: store?.latitude ?? null,
          storeLongitude: store?.longitude ?? null,
          items,
          total,
          deliveryType,
          pickupTime,
          headline: `تم استلام طلبك #${displayNumber}`,
        });
      })
      .catch((err) => console.warn("WhatsApp notification error:", err));

    res.status(201).json(order);
  },
);

// PATCH /orders/:id — update an order's status. Admin can update any order;
// a merchant can only update the status of orders placed at their OWN store
// (قيد التحضير → في الطريق → تم التسليم), so they can actually track a
// delivery through to completion instead of it being stuck at whatever the
// admin last set (or its default).
router.patch(
  "/orders/:id",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = StatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "حالة غير صالحة" });
      return;
    }

    const [existing] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    const admin = isAdminRequest(req);
    if (!admin) {
      const store = await resolveOrderStore(existing.storeId);
      const phone = getCustomerPhone(req);
      if (!store || !phone || store.ownerPhone !== phone) {
        res.status(401).json({ error: "لا تملك صلاحية تعديل حالة هذا الطلب" });
        return;
      }
      // Once an order is delivered it's final — a merchant can't reopen or
      // change it (only an admin can, to correct a mistake). This stops the
      // status flipping back and forth after the driver already delivered it.
      if (existing.status === "تم التسليم") {
        res
          .status(409)
          .json({ error: "الطلب تم تسليمه ولا يمكن تغيير حالته" });
        return;
      }
    }

    const [order] = await db
      .update(ordersTable)
      .set({ status: parsed.data.status })
      .where(eq(ordersTable.id, id))
      .returning();

    // Once delivered, ask the customer to rate the store (non-blocking). Only
    // on the transition TO "تم التسليم" so re-saving the same status doesn't
    // spam them. The link opens the app's rating screen for this order.
    if (
      parsed.data.status === "تم التسليم" &&
      existing.status !== "تم التسليم"
    ) {
      const base = `${req.protocol}://${req.get("host")}`;
      Promise.all([
        resolveOrderStore(order.storeId),
        resolveStoreOrderNumber(order.storeId, order.id),
      ])
        .then(([store, storeOrderNumber]) => {
          const storeName = store?.name ?? null;
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
            storeOrderNumber,
            rateUrl: `${base}/rate/${order.id}`,
          });
        })
        .catch((err) => console.warn("Rating request error:", err));
    }

    res.json(order);
  },
);

// PATCH /orders/:id/driver — the order's own store owner (or admin) forwards
// the order to one of their approved delivery drivers. Persists the
// assignment so the merchant dashboard can show which drivers are currently
// free vs. out on a delivery.
router.patch(
  "/orders/:id/driver",
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = AssignDriverSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صالحة" });
      return;
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id));
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    const store = await resolveOrderStore(order.storeId);
    const admin = isAdminRequest(req);
    const phone = getCustomerPhone(req);
    if (!admin && (!store || store.ownerPhone !== phone)) {
      res.status(401).json({ error: "لا تملك صلاحية الوصول لهذا الطلب" });
      return;
    }

    const [driver] = await db
      .select()
      .from(deliveryDriversTable)
      .where(eq(deliveryDriversTable.id, parsed.data.driverId));
    if (!driver || driver.storeId !== order.storeId) {
      res.status(400).json({ error: "المندوب غير تابع لهذا المتجر" });
      return;
    }

    const [updated] = await db
      .update(ordersTable)
      .set({ assignedDriverId: driver.id })
      .where(eq(ordersTable.id, id))
      .returning();

    res.json(updated);
  },
);

// POST /orders/:id/items — "نسيت غرض": append items to the customer's own
// order while it's still being prepared and within a short grace window, with
// no extra delivery fee.
router.post(
  "/orders/:id/items",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = AddItemsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const customerPhone = req.customerPhone!;
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id));

    if (!order || order.customerPhone !== customerPhone) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    if (order.status !== "قيد التحضير") {
      res.status(400).json({
        error: "لا يمكن تعديل الطلب، تم البدء بتوصيله",
      });
      return;
    }

    if (Date.now() - order.createdAt.getTime() > ADD_ITEMS_WINDOW_MS) {
      res.status(400).json({
        error: "انتهت مهلة إضافة الأغراض على هذا الطلب",
      });
      return;
    }

    const newItems = parsed.data.items;

    // Re-check availability server-side for the added items.
    const currentProducts = await db
      .select()
      .from(productsTable)
      .where(inArray(productsTable.id, newItems.map((i) => i.id)));
    const productsById = new Map(currentProducts.map((p) => [p.id, p]));
    const unavailable = newItems.filter((i) => {
      const product = productsById.get(i.id);
      return !product || !product.inStock;
    });
    if (unavailable.length > 0) {
      res.status(409).json({
        error: `بعض المنتجات غير متوفرة حاليًا: ${unavailable
          .map((i) => i.name)
          .join("، ")}`,
      });
      return;
    }

    // Merge added items into the existing list, combining quantities for
    // products already in the order.
    const merged = order.items.map((i) => ({ ...i }));
    for (const add of newItems) {
      const existing = merged.find((m) => m.id === add.id);
      if (existing) {
        existing.qty += add.qty;
      } else {
        merged.push({
          id: add.id,
          name: add.name,
          price: add.price,
          unit: add.unit,
          qty: add.qty,
        });
      }
    }

    const subtotal = merged.reduce((sum, i) => sum + i.price * i.qty, 0);
    // Keep the original delivery fee, discount and wallet credit — the whole
    // point is that adding a forgotten item costs no extra delivery.
    const total =
      subtotal - order.discountApplied + order.deliveryFee - order.walletApplied;

    const [updated] = await db
      .update(ordersTable)
      .set({ items: merged, subtotal, total })
      .where(eq(ordersTable.id, id))
      .returning();

    // Notify both sides that the order changed (merchant prepares the new
    // items; customer gets an updated receipt with the store letterhead).
    Promise.all([
      resolveOrderStore(updated.storeId),
      resolveStoreOrderNumber(updated.storeId, updated.id),
    ])
      .then(([store, storeOrderNumber]) => {
        const displayNumber = storeOrderNumber ?? updated.id;
        void sendWhatsAppOrderNotification({
          orderId: updated.id,
          customerPhone,
          items: merged,
          total,
          deliveryType: updated.deliveryType,
          latitude: updated.latitude,
          longitude: updated.longitude,
          note: updated.note,
          pickupTime: updated.pickupTime,
          headline: `تعديل الطلب #${displayNumber} — إضافة أغراض`,
          toPhone: store?.ownerPhone ?? null,
        });
        void sendWhatsAppOrderConfirmationToCustomer({
          orderId: updated.id,
          customerPhone,
          storeName: store?.name ?? null,
          storeAddress: store?.address ?? null,
          storePhone: store?.ownerPhone ?? null,
          storeLatitude: store?.latitude ?? null,
          storeLongitude: store?.longitude ?? null,
          items: merged,
          total,
          deliveryType: updated.deliveryType,
          pickupTime: updated.pickupTime,
          headline: `تم تحديث طلبك #${displayNumber} — إضافة أغراض`,
        });
      })
      .catch((err) => console.warn("WhatsApp notification error:", err));

    res.json(updated);
  },
);

export default router;
