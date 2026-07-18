import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db, ordersTable, broadcastsTable } from "@workspace/db";
import { requireCustomer } from "../middlewares/customerAuth";

const router: IRouter = Router();

// Notifications are derived from the customer's real order history/status —
// no separate mock data. Each order contributes a "placed" notification and,
// once delivered, a "delivered" one. Admin broadcasts (announcements sent to
// everyone) are merged into the same feed.
router.get(
  "/notifications",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const [orders, broadcasts] = await Promise.all([
      db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.customerPhone, req.customerPhone!))
        .orderBy(desc(ordersTable.createdAt)),
      db.select().from(broadcastsTable).orderBy(desc(broadcastsTable.createdAt)),
    ]);

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

    const merged = [...notifications, ...broadcastNotifications].sort(
      (a, b2) =>
        new Date(b2.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    res.json(merged);
  },
);

export default router;
