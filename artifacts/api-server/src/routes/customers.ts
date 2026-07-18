import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable, ordersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

// NOTE: /customers (list, admin) must be declared before /customers/:phone
// so Express doesn't treat "customers" itself as a :phone param — but since
// they're different path segments this isn't actually ambiguous; kept here
// for readability alongside the other customer routes.

// Admin-only: exposes financial fields (points, walletBalance). Customers read
// their OWN data via the authenticated GET /me endpoint, never this route.
router.get("/customers/:phone", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const phone = String(req.params.phone);
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.phone, phone));

  if (!customer) {
    // Return zero points for unknown customer rather than 404
    res.json({ phone, points: 0 });
    return;
  }

  res.json({
    phone: customer.phone,
    points: customer.points,
    walletBalance: customer.walletBalance,
  });
});

// GET /customers — admin only, list all customers with order stats
router.get("/customers", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const customers = await db.select().from(customersTable);
  const orders = await db.select().from(ordersTable);

  const result = customers.map((c) => {
    const customerOrders = orders.filter((o) => o.customerPhone === c.phone);
    const totalSpent = customerOrders.reduce((sum, o) => sum + o.total, 0);
    return {
      phone: c.phone,
      name: c.name,
      avatarUrl: c.avatarUrl,
      points: c.points,
      walletBalance: c.walletBalance,
      orderCount: customerOrders.length,
      totalSpent,
      createdAt: c.createdAt,
    };
  });

  result.sort((a, b) => b.orderCount - a.orderCount);
  res.json(result);
});

export default router;
