import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, addressesTable } from "@workspace/db";
import { z } from "zod";
import { requireCustomer } from "../middlewares/customerAuth";

const router: IRouter = Router();

const AddressBody = z.object({
  label: z.string().min(1).default("المنزل"),
  details: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

router.get(
  "/addresses",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(addressesTable)
      .where(eq(addressesTable.customerPhone, req.customerPhone!))
      .orderBy(addressesTable.id);
    res.json(rows);
  },
);

router.post(
  "/addresses",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = AddressBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات العنوان غير صالحة" });
      return;
    }

    const [address] = await db
      .insert(addressesTable)
      .values({
        customerPhone: req.customerPhone!,
        label: parsed.data.label,
        details: parsed.data.details ?? null,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
      })
      .returning();

    res.status(201).json(address);
  },
);

router.patch(
  "/addresses/:id",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = AddressBody.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات العنوان غير صالحة" });
      return;
    }

    const [address] = await db
      .update(addressesTable)
      .set(parsed.data)
      .where(
        and(
          eq(addressesTable.id, id),
          eq(addressesTable.customerPhone, req.customerPhone!),
        ),
      )
      .returning();

    if (!address) {
      res.status(404).json({ error: "العنوان غير موجود" });
      return;
    }

    res.json(address);
  },
);

router.delete(
  "/addresses/:id",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [address] = await db
      .delete(addressesTable)
      .where(
        and(
          eq(addressesTable.id, id),
          eq(addressesTable.customerPhone, req.customerPhone!),
        ),
      )
      .returning();

    if (!address) {
      res.status(404).json({ error: "العنوان غير موجود" });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;
