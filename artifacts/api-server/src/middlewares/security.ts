import type { Request, Response, NextFunction } from "express";

// Lightweight security headers (no extra dependency). Tightens the common
// browser / proxy footguns without changing API behaviour.
export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)",
  );
  // Only enable HSTS when the request actually arrived over TLS (Replit /
  // production). Local http://localhost must stay free of HSTS.
  const proto = String(_req.headers["x-forwarded-proto"] ?? _req.protocol);
  if (proto === "https") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  next();
}

// In-memory sliding-window rate limiter for sensitive public endpoints
// (OTP request). Enough to stop casual abuse without pulling in Redis for
// a single-process API server.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(opts: {
  key: (req: Request) => string;
  windowMs: number;
  max: number;
  message?: string;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const k = opts.key(req);
    const now = Date.now();
    const cur = buckets.get(k);
    if (!cur || cur.resetAt <= now) {
      buckets.set(k, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }
    cur.count += 1;
    if (cur.count > opts.max) {
      res.status(429).json({
        error: opts.message ?? "محاولات كثيرة، حاول بعد قليل",
      });
      return;
    }
    next();
  };
}

// Periodically prune stale buckets so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}, 60_000).unref?.();
