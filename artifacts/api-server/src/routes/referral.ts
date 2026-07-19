import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import { requireCustomer } from "../middlewares/customerAuth";
import { z } from "zod";

const router: IRouter = Router();

// IQD credited to BOTH the referrer and the friend when a referral code is
// redeemed for the first time.
const REFERRAL_REWARD = 2000;

const RedeemBody = z.object({ code: z.string().min(4).max(16) });

// 6-char uppercase code (no ambiguous 0/O/1/I) unique per customer.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

async function ensureReferralCode(phone: string): Promise<string> {
  const [existing] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.phone, phone));
  if (existing?.referralCode) return existing.referralCode;

  // Retry a few times in the unlikely event of a collision on the unique index.
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    try {
      const [updated] = await db
        .update(customersTable)
        .set({ referralCode: code, updatedAt: new Date() })
        .where(eq(customersTable.phone, phone))
        .returning();
      if (updated?.referralCode) return updated.referralCode;
    } catch {
      // unique violation — try another code
    }
  }
  throw new Error("REFERRAL_CODE_GENERATION_FAILED");
}

// GET /referral — the customer's own share code (generated on first call) and
// whether they've already redeemed someone else's code.
router.get(
  "/referral",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const phone = req.customerPhone!;
    try {
      const code = await ensureReferralCode(phone);
      const [customer] = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.phone, phone));
      res.json({
        code,
        referredBy: customer?.referredBy ?? null,
        reward: REFERRAL_REWARD,
      });
    } catch {
      res.status(500).json({ error: "تعذر توليد كود الدعوة" });
    }
  },
);

// POST /referral/redeem — the friend enters the referrer's code. Both get
// REFERRAL_REWARD credited to their general wallet, once.
router.post(
  "/referral/redeem",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = RedeemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "أدخل كود دعوة صحيح" });
      return;
    }
    const phone = req.customerPhone!;
    const code = parsed.data.code.trim().toUpperCase();

    try {
      const result = await db.transaction(async (tx) => {
        const [me] = await tx
          .select()
          .from(customersTable)
          .where(eq(customersTable.phone, phone))
          .for("update");
        if (!me) {
          return { status: 404, error: "الحساب غير موجود" } as const;
        }
        if (me.referredBy) {
          return { status: 409, error: "سبق استخدمت كود دعوة" } as const;
        }
        if (me.referralCode === code) {
          return { status: 400, error: "لا يمكنك استخدام كودك الخاص" } as const;
        }

        const [referrer] = await tx
          .select()
          .from(customersTable)
          .where(eq(customersTable.referralCode, code));
        if (!referrer) {
          return { status: 404, error: "كود الدعوة غير صحيح" } as const;
        }
        if (referrer.phone === phone) {
          return { status: 400, error: "لا يمكنك استخدام كودك الخاص" } as const;
        }

        // Credit both parties' general wallet and lock in the referral.
        await tx
          .update(customersTable)
          .set({
            walletBalance: sql`${customersTable.walletBalance} + ${REFERRAL_REWARD}`,
            referredBy: code,
            updatedAt: new Date(),
          })
          .where(eq(customersTable.phone, phone));

        await tx
          .update(customersTable)
          .set({
            walletBalance: sql`${customersTable.walletBalance} + ${REFERRAL_REWARD}`,
            updatedAt: new Date(),
          })
          .where(eq(customersTable.phone, referrer.phone));

        return { status: 200, credited: REFERRAL_REWARD } as const;
      });

      if ("error" in result) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.json({ credited: result.credited });
    } catch (err) {
      req.log.error({ err }, "Error redeeming referral");
      res.status(500).json({ error: "تعذر استخدام كود الدعوة" });
    }
  },
);

export default router;
