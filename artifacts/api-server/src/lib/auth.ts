import jwt from "jsonwebtoken";
import type { Request } from "express";

// In production a real SESSION_SECRET is mandatory — without it JWTs would be
// signed with a public constant and anyone could forge admin/customer tokens.
// We refuse to start rather than run insecurely. In development a fallback is
// allowed only for local convenience.
const SECRET = (() => {
  const fromEnv = process.env["SESSION_SECRET"];
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "SESSION_SECRET must be set to a strong value (>= 16 chars) in production",
    );
  }
  console.warn(
    "[auth] SESSION_SECRET not set — using an insecure dev-only fallback. Set it before deploying.",
  );
  return "khudra-fallback-secret-dev-only";
})();
// Long-lived sessions: a customer who logs in stays signed in for a year, and
// their account data (profile, addresses, points, wallet, orders) lives in the
// database keyed by phone — so logging out and back in always restores it.
const TOKEN_TTL = "365d";

export interface AdminTokenPayload {
  type: "admin";
}

export interface CustomerTokenPayload {
  type: "customer";
  phone: string;
}

export type TokenPayload = AdminTokenPayload | CustomerTokenPayload;

export function signAdminToken(): string {
  const payload: AdminTokenPayload = { type: "admin" };
  return jwt.sign(payload, SECRET, { expiresIn: TOKEN_TTL });
}

export function signCustomerToken(phone: string): string {
  const payload: CustomerTokenPayload = { type: "customer", phone };
  return jwt.sign(payload, SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET);
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "type" in decoded &&
      (decoded.type === "admin" || decoded.type === "customer")
    ) {
      return decoded as TokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function getAuth(req: Request): TokenPayload | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  return verifyToken(token);
}

export function isAdminRequest(req: Request): boolean {
  return getAuth(req)?.type === "admin";
}

export function getCustomerPhone(req: Request): string | null {
  const auth = getAuth(req);
  return auth?.type === "customer" ? auth.phone : null;
}

// Normalize an Iraqi phone number to E.164 (+964...) for WhatsApp/Twilio use.
// Accepts formats like "07701234567", "7701234567", "+9647701234567".
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(/[\s-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("00")) return `+${trimmed.slice(2)}`;
  if (trimmed.startsWith("0")) return `+964${trimmed.slice(1)}`;
  if (trimmed.startsWith("964")) return `+${trimmed}`;
  return `+964${trimmed}`;
}
