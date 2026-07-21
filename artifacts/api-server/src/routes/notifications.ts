import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq, or, isNull, inArray } from "drizzle-orm";
import { db, ordersTable, broadcastsTable, notificationsTable } from "@workspace/db";
import { requireCustomer } from "../middlewares/customerAuth";
import { phoneKey } from "../lib/notifications";

const router: IRouter = Router();

// Notifications are derived from the customer's real order history/status —
// no separate mock data. Each order contributes a "placed" notification and,
// once delivered, a "delivered" one. Broadcasts are merged into the same
// feed: global admin announcements (storeId null) reach everyone; a store's
// own broadcast only reaches customers who have actually ordered from it.
router.get(
  "/notifications",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.customerPhone, req.customerPhone!))
      .orderBy(desc(ordersTable.createdAt));

    const orderedStoreIds = Array.from(
      new Set(orders.map((o) => o.storeId).filter((id): id is number => id != null)),
    );

    const broadcasts = await db
      .select()
      .from(broadcastsTable)
      .where(
        orderedStoreIds.length > 0
          ? or(isNull(broadcastsTable.storeId), inArray(broadcastsTable.storeId, orderedStoreIds))
          : isNull(broadcastsTable.storeId),
      )
      .orderBy(desc(broadcastsTable.createdAt));

    const notifications = orders.flatMap((order) => {
      const items = [
        {
          id: `order-${order.id}-status`,
          message:
            order.status === "تم التسليم"
              ? `✅ تم تسليم طلبك #${order.id}`
              : order.status === "في الطريق"
                ? `🚚 طلبك #${order.id} في الطريق إليك`
                : `📦 تم استلام طلبك #${order.id} وهو قيد التحضير`,
          createdAt: order.createdAt,
        },
      ];
      if (order.pointsEarned > 0) {
        items.push({
          id: `order-${order.id}-points`,
          message: `⭐ ربحت ${order.pointsEarned} نقطة من طلبك #${order.id}`,
          createdAt: order.createdAt,
        });
      }
      return items;
    });

    const broadcastNotifications = broadcasts.map((b) => ({
      id: `broadcast-${b.id}`,
      message: `📢 ${b.message}`,
      createdAt: b.createdAt,
    }));

    // Persistent, explicitly-created notifications (refund decisions, delivery
    // "rate the store" messages, …) targeted at this phone.
    const stored = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.recipientPhone, phoneKey(req.customerPhone)))
      .orderBy(desc(notificationsTable.createdAt));

    const storedNotifications = stored.map((n) => ({
      id: `notif-${n.id}`,
      message: n.body ? `${n.title}\n${n.body}` : n.title,
      createdAt: n.createdAt,
      data: n.data ?? undefined,
    }));

    const merged = [
      ...notifications,
      ...broadcastNotifications,
      ...storedNotifications,
    ].sort(
      (a, b2) =>
        new Date(b2.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    res.json(merged);
  },
);

export default router;
