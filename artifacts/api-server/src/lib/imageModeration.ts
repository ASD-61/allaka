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
// Human-readable reason moderation is on/off, surfaced by the status endpoint
// so the deployment can be verified without reading server logs.
let statusReason = "not initialised yet";

/**
 * Reads the service-account credentials from the environment. Supports TWO
 * forms so a broken/multi-line paste never silently disables moderation:
 *   1. GOOGLE_CREDENTIALS      — the raw service-account JSON.
 *   2. GOOGLE_CREDENTIALS_B64  — the same JSON, base64-encoded (recommended for
 *      Render: it can't be mangled by newline/quote handling in the dashboard).
 * Returns the parsed object, or null with a reason set in statusReason.
 */
function readCredentials(): Record<string, any> | null {
  const b64 = process.env.GOOGLE_CREDENTIALS_B64;
  if (b64 && b64.trim()) {
    try {
      const json = Buffer.from(b64.trim(), "base64").toString("utf8");
      return JSON.parse(json);
    } catch (err) {
      statusReason = `GOOGLE_CREDENTIALS_B64 could not be decoded/parsed: ${
        (err as Error).message
      }`;
      console.error("[imageModeration]", statusReason);
      return null;
    }
  }

  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw || !raw.trim()) {
    statusReason =
      "neither GOOGLE_CREDENTIALS nor GOOGLE_CREDENTIALS_B64 is set";
    console.warn(
      "[imageModeration] " + statusReason + " — SafeSearch moderation is DISABLED.",
    );
    return null;
  }

  try {
    return JSON.parse(raw.trim());
  } catch (err) {
    // Most common cause: the private_key's real newlines break the JSON. Try a
    // best-effort repair by escaping raw newlines that sit inside the value.
    try {
      return JSON.parse(raw.trim().replace(/\r?\n/g, "\\n"));
    } catch {
      statusReason = `GOOGLE_CREDENTIALS is not valid JSON (${
        (err as Error).message
      }). Tip: use GOOGLE_CREDENTIALS_B64 with a base64 of the JSON.`;
      console.error("[imageModeration] " + statusReason);
      return null;
    }
  }
}

/**
 * Lazily builds the Vision client from the service-account JSON. Returns null
 * when credentials are missing or malformed (so callers can decide to skip
 * moderation instead of crashing).
 */
function getVisionClient(): VisionClient | null {
  if (initTried) return cachedClient;
  initTried = true;

  const credentials = readCredentials();
  if (!credentials) {
    cachedClient = null;
    return null;
  }

  try {
    // Normalise the private key: if it still contains literal "\n" sequences
    // (not real newlines), turn them into real newlines so the crypto layer
    // accepts the key.
    if (typeof credentials.private_key === "string") {
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
    }
    cachedClient = new vision.ImageAnnotatorClient({
      credentials,
      projectId: credentials.project_id,
    });
    statusReason = `enabled (project: ${credentials.project_id ?? "unknown"})`;
    console.log("[imageModeration] SafeSearch moderation ENABLED — " + statusReason);
  } catch (err) {
    statusReason = `failed to build Vision client: ${(err as Error).message}`;
    console.error("[imageModeration] " + statusReason);
    cachedClient = null;
  }
  return cachedClient;
}

/** True when moderation is configured and will actually run. */
export function imageModerationEnabled(): boolean {
  return getVisionClient() !== null;
}

/** Diagnostic string describing why moderation is on/off. */
export function imageModerationStatus(): string {
  getVisionClient();
  return statusReason;
}

// A 1x1 transparent PNG — used to make a REAL SafeSearch call so the status
// endpoint can prove the Vision API actually works end-to-end (not just that
// the credentials parsed). If this throws, the API is likely disabled or has no
// billing on the Google project.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Runs a live SafeSearch call against a tiny image so we can verify the Vision
 * API is truly reachable/authorized. Returns { ok } or { ok:false, error }.
 */
export async function testModeration(): Promise<{ ok: boolean; error?: string }> {
  const client = getVisionClient();
  if (!client) return { ok: false, error: statusReason };
  try {
    await client.safeSearchDetection(TINY_PNG);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
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
 *  - Vision API error while moderation IS configured → FAIL CLOSED (503).
 *    We'd rather block uploads than silently let an unchecked image through
 *    when the admin expects moderation to be on. This also surfaces a broken
 *    Vision setup immediately (see /api/storage/moderation-status → liveTest).
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
    // Moderation IS configured (credentials present) but the actual Vision call
    // failed — most likely the Cloud Vision API is disabled or billing isn't
    // enabled on the Google project. FAIL CLOSED: reject the upload rather than
    // silently letting a possibly-inappropriate image through. This makes the
    // misconfiguration immediately visible (all uploads fail) instead of leaking
    // adult content. Check /api/storage/moderation-status for the exact reason.
    req.log?.error?.({ err }, "SafeSearch check failed; rejecting upload (fail-closed)");
    res.status(503).json({
      error:
        "تعذّر فحص الصورة حالياً، الرجاء المحاولة بعد قليل. (خدمة فحص الصور غير متاحة)",
    });
  }
}
