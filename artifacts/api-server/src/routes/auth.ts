import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable, otpCodesTable } from "@workspace/db";
import { z } from "zod";
import { signCustomerToken, normalizePhone } from "../lib/auth";
import { requireCustomer } from "../middlewares/customerAuth";
import { sendWhatsAppOtp } from "../lib/whatsapp";
import { rateLimit } from "../middlewares/security";

const router: IRouter = Router();

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// Cap OTP spam: 5 requests / phone / 15 min, and 20 / IP / 15 min.
const otpPhoneLimit = rateLimit({
  key: (req) => `otp:phone:${normalizePhone(String(req.body?.phone ?? ""))}`,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "طلبات كثيرة على هذا الرقم، حاول بعد ربع ساعة",
});
const otpIpLimit = rateLimit({
  key: (req) => `otp:ip:${req.ip || req.socket.remoteAddress || "unknown"}`,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "طلبات كثيرة من هذا الجهاز، حاول بعد ربع ساعة",
});

const RequestOtpBody = z.object({ phone: z.string().min(5) });
const VerifyOtpBody = z.object({
  phone: z.string().min(5),
  code: z.string().min(4),
});
const UpdateMeBody = z.object({
  name: z.string().min(1).nullable().optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /auth/otp/request — sends a WhatsApp verification code to the phone
router.post(
  "/auth/otp/request",
  otpIpLimit,
  otpPhoneLimit,
  async (req: Request, res: Response): Promise<void> => {
  const parsed = RequestOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "رقم الهاتف مطلوب" });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db
    .insert(otpCodesTable)
    .values({ phone, code, expiresAt, attempts: 0 })
    .onConflictDoUpdate({
      target: otpCodesTable.phone,
      set: { code, expiresAt, attempts: 0, createdAt: new Date() },
    });

  try {
    await sendWhatsAppOtp(phone, code);

    res.json({ sent: true });
  } catch (err) {
    console.warn("Failed to send WhatsApp OTP:", err);
    res.status(502).json({
      error:
        "تعذر إرسال رمز التحقق عبر واتساب. الرجاء المحاولة لاحقاً أو التواصل مع الدعم.",
    });
  }
});

// POST /auth/otp/verify — verifies the code and creates/logs in the customer
router.post("/auth/otp/verify", async (req: Request, res: Response): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صالحة" });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  const [record] = await db
    .select()
    .from(otpCodesTable)
    .where(eq(otpCodesTable.phone, phone));

  if (!record) {
    res.status(400).json({ error: "لم يتم إرسال رمز تحقق لهذا الرقم" });
    return;
  }

  if (record.expiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "انتهت صلاحية الرمز، اطلب رمزاً جديداً" });
    return;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    res.status(429).json({ error: "عدد محاولات كثير جداً، اطلب رمزاً جديداً" });
    return;
  }

  if (record.code !== parsed.data.code.trim()) {
    await db
      .update(otpCodesTable)
      .set({ attempts: record.attempts + 1 })
      .where(eq(otpCodesTable.phone, phone));
    res.status(400).json({ error: "رمز التحقق غير صحيح" });
    return;
  }

  // Correct code — consume it and create/verify the customer
  await db.delete(otpCodesTable).where(eq(otpCodesTable.phone, phone));

  let [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.phone, phone));

  if (!customer) {
    [customer] = await db
      .insert(customersTable)
      .values({ phone, verified: 1 })
      .returning();
  } else if (!customer.verified) {
    [customer] = await db
      .update(customersTable)
      .set({ verified: 1, updatedAt: new Date() })
      .where(eq(customersTable.phone, phone))
      .returning();
  }

  const token = signCustomerToken(phone);
  res.json({
    token,
    customer: {
      phone: customer.phone,
      name: customer.name,
      avatarUrl: customer.avatarUrl,
      points: customer.points,
      walletBalance: customer.walletBalance,
      hasProfile: !!customer.name,
      latitude: customer.latitude,
      longitude: customer.longitude,
    },
  });
});

// GET /auth/me — current customer's profile
router.get(
  "/auth/me",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const phone = req.customerPhone!;
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.phone, phone));

    if (!customer) {
      res.status(404).json({ error: "الحساب غير موجود" });
      return;
    }

    res.json({
      phone: customer.phone,
      name: customer.name,
      avatarUrl: customer.avatarUrl,
      points: customer.points,
      walletBalance: customer.walletBalance,
      hasProfile: !!customer.name,
      latitude: customer.latitude,
      longitude: customer.longitude,
    });
  },
);

// PATCH /auth/me — update the current customer's profile (name, avatar,
// last-known location)
router.patch(
  "/auth/me",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = UpdateMeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صالحة" });
      return;
    }

    const phone = req.customerPhone!;
    const [customer] = await db
      .update(customersTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(customersTable.phone, phone))
      .returning();

    if (!customer) {
      res.status(404).json({ error: "الحساب غير موجود" });
      return;
    }

    res.json({
      phone: customer.phone,
      name: customer.name,
      avatarUrl: customer.avatarUrl,
      points: customer.points,
      walletBalance: customer.walletBalance,
      hasProfile: !!customer.name,
      latitude: customer.latitude,
      longitude: customer.longitude,
    });
  },
);

export default router;