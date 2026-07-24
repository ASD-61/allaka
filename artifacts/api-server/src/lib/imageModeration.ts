import type { NextFunction, Request, Response } from "express";
import vision from "@google-cloud/vision";

// ---------------------------------------------------------------------------
// Google Cloud Vision SafeSearch image moderation
// ---------------------------------------------------------------------------
// Blocks pornographic / violent / racy images BEFORE they are uploaded to
// Cloudflare R2, so nothing inappropriate ever reaches storage or customers.
//
// Credentials: the FULL service-account JSON is stored as a single env var
// (GOOGLE_CREDENTIALS) on Render — NEVER committed to git. We JSON.parse it and
// pass it as `credentials` (inline), not as a key-file path.
// ---------------------------------------------------------------------------

// Likelihood levels Google returns, ordered from safe → unsafe.
type Likelihood =
  | "UNKNOWN"
  | "VERY_UNLIKELY"
  | "UNLIKELY"
  | "POSSIBLE"
  | "LIKELY"
  | "VERY_LIKELY";

// Anything at/above LIKELY is rejected. POSSIBLE and below is allowed through
// (SafeSearch is intentionally conservative, so POSSIBLE has many false hits).
const BLOCKED_LEVELS: ReadonlySet<Likelihood> = new Set([
  "LIKELY",
  "VERY_LIKELY",
]);

type VisionClient = InstanceType<typeof vision.ImageAnnotatorClient>;

let cachedClient: VisionClient | null = null;
let initTried = false;

/**
 * Lazily builds the Vision client from the inline service-account JSON in
 * process.env.GOOGLE_CREDENTIALS. Returns null when the env var is missing or
 * malformed (so callers can decide to skip moderation instead of crashing).
 */
function getVisionClient(): VisionClient | null {
  if (initTried) return cachedClient;
  initTried = true;

  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw || !raw.trim()) {
    console.warn(
      "[imageModeration] GOOGLE_CREDENTIALS is not set — SafeSearch moderation is DISABLED.",
    );
    return null;
  }

  try {
    const credentials = JSON.parse(raw);
    cachedClient = new vision.ImageAnnotatorClient({
      credentials,
      projectId: credentials.project_id,
    });
  } catch (err) {
    console.error(
      "[imageModeration] Failed to parse GOOGLE_CREDENTIALS JSON — moderation DISABLED.",
      err,
    );
    cachedClient = null;
  }
  return cachedClient;
}

/** True when moderation is configured and will actually run. */
export function imageModerationEnabled(): boolean {
  return getVisionClient() !== null;
}

/**
 * Express middleware: inspects the uploaded image (req.file.buffer) with Google
 * SafeSearch and rejects it with 400 when adult/violence/racy is LIKELY or
 * VERY_LIKELY. Must run AFTER multer (memoryStorage) and BEFORE the R2 upload.
 *
 * Fail-safe behaviour:
 *  - No file on the request  → 400 (nothing to upload).
 *  - Moderation not configured → allowed through (logged), so the app keeps
 *    working until GOOGLE_CREDENTIALS is set.
 *  - Vision API error → allowed through (logged) rather than blocking every
 *    upload on a transient Google outage.
 */
export async function moderateImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const file = req.file;
  if (!file || !file.buffer || file.buffer.length === 0) {
    res.status(400).json({ error: "لم يتم إرفاق صورة" });
    return;
  }

  const client = getVisionClient();
  if (!client) {
    // Not configured — don't block uploads.
    next();
    return;
  }

  try {
    const [result] = await client.safeSearchDetection(file.buffer);
    const safe = result.safeSearchAnnotation;

    const flags: Likelihood[] = [
      (safe?.adult as Likelihood) ?? "UNKNOWN",
      (safe?.violence as Likelihood) ?? "UNKNOWN",
      (safe?.racy as Likelihood) ?? "UNKNOWN",
    ];

    if (flags.some((level) => BLOCKED_LEVELS.has(level))) {
      req.log?.warn?.(
        { adult: safe?.adult, violence: safe?.violence, racy: safe?.racy },
        "Image rejected by SafeSearch",
      );
      res.status(400).json({
        error: "عذراً، الصورة تحتوي على محتوى غير لائق وتم رفضها",
      });
      return;
    }

    next();
  } catch (err) {
    // A Vision outage shouldn't take down all uploads — log and allow through.
    req.log?.error?.({ err }, "SafeSearch check failed; allowing upload");
    next();
  }
}
