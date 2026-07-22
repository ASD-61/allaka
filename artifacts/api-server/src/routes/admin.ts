import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";
import { signAdminToken, isAdminRequest } from "../lib/auth";
import { requireAdmin } from "../middlewares/adminAuth";
import { rateLimit } from "../middlewares/security";

const router: IRouter = Router();

const PW_KEY = "admin_password_hash";

// Store passwords as salted scrypt hashes ("salt:hash") — never plaintext — so
// even a DB leak doesn't expose the real password.
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(hash, "hex");
  return (
    known.length === test.length && crypto.timingSafeEqual(known, test)
  );
}

// Constant-time compare for the plaintext env password (fallback), so an
// attacker can't learn the password length/prefix from response timing.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

async function getStoredHash(): Promise<string | null> {
  const [row] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, PW_KEY));
  return row?.value ?? null;
}

// A password is valid if it matches the DB-stored hash (set from settings), or,
// if none has been set yet, the ADMIN_PASSWORD env var.
async function isValidPassword(password: string): Promise<boolean> {
  const stored = await getStoredHash();
  if (stored) return verifyHash(password, stored);
  const envPassword = process.env["ADMIN_PASSWORD"];
  if (!envPassword) return false;
  return safeEqual(password, envPassword);
}

const LoginBody = z.object({ password: z.string().min(1) });

// Brute-force protection: max 10 login attempts per IP per 15 minutes.
const loginLimit = rateLimit({
  key: (req) => `admin:login:${req.ip || req.socket.remoteAddress || "unknown"}`,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "محاولات دخول كثيرة، حاول بعد ربع ساعة",
});

router.post(
  "/admin/login",
  loginLimit,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "كلمة المرور مطلوبة" });
      return;
    }

    const stored = await getStoredHash();
    if (!stored && !process.env["ADMIN_PASSWORD"]) {
      res.status(500).json({ error: "ADMIN_PASSWORD not configured" });
      return;
    }

    if (!(await isValidPassword(parsed.data.password))) {
      res.status(401).json({ error: "كلمة المرور غير صحيحة" });
      return;
    }

    const token = signAdminToken();
    res.json({ isAdmin: true, token });
  },
);

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// POST /admin/password — change the admin password from the app settings.
// Requires a valid admin token AND the current password, then persists a hash.
router.post(
  "/admin/password",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = ChangePasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "كلمة المرور الجديدة يجب أن تكون 8 خانات فأكثر" });
      return;
    }

    if (!(await isValidPassword(parsed.data.currentPassword))) {
      res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      return;
    }

    const hash = hashPassword(parsed.data.newPassword);
    await db
      .insert(appSettingsTable)
      .values({ key: PW_KEY, value: hash })
      .onConflictDoUpdate({
        target: appSettingsTable.key,
        set: { value: hash, updatedAt: new Date() },
      });

    res.json({ ok: true });
  },
);

// ── App version control (admin sets the "latest version" that triggers the
// in-app "update available" notice) ─────────────────────────────────────────
export const APP_VERSION_KEY = "app_latest_version";
export const APP_MESSAGE_KEY = "app_update_message";

async function upsertSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value, updatedAt: new Date() },
    });
}

// GET /admin/app-version — current configured latest version + message.
router.get(
  "/admin/app-version",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(appSettingsTable)
      .where(inArray(appSettingsTable.key, [APP_VERSION_KEY, APP_MESSAGE_KEY]));
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({
      latestVersion:
        map[APP_VERSION_KEY] || process.env["APP_LATEST_VERSION"] || "1.0.0",
      message:
        map[APP_MESSAGE_KEY] ||
        process.env["APP_UPDATE_MESSAGE"] ||
        "صدر تحديث جديد لتطبيق عـلاّكـة، حدّث الآن للحصول على آخر الميزات.",
    });
  },
);

const AppVersionBody = z.object({
  latestVersion: z.string().min(1).max(20),
  message: z.string().max(300).optional(),
});

// POST /admin/app-version — publish a new "latest version". Once set to a value
// newer than the installed build, every app shows the in-app update notice.
router.post(
  "/admin/app-version",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = AppVersionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "رقم إصدار غير صالح" });
      return;
    }
    await upsertSetting(APP_VERSION_KEY, parsed.data.latestVersion.trim());
    if (parsed.data.message !== undefined) {
      await upsertSetting(APP_MESSAGE_KEY, parsed.data.message.trim());
    }
    res.json({ ok: true });
  },
);

router.post("/admin/logout", (_req: Request, res: Response): void => {
  // Tokens are stateless (JWT); logging out just means the client discards
  // its stored token. Kept as an endpoint for a consistent client flow.
  res.sendStatus(204);
});

router.get("/admin/session", (req: Request, res: Response): void => {
  res.json({ isAdmin: isAdminRequest(req) });
});

export default router;
