import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { inArray } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";
import router from "./routes";
import { APP_VERSION_KEY, APP_MESSAGE_KEY } from "./routes/admin";
import { logger } from "./lib/logger";
import { securityHeaders } from "./middlewares/security";
import { driverPortalPage } from "./lib/driverPortalPage";
import { ratePage } from "./lib/ratePage";
import { productBridgePage } from "./lib/productBridgePage";
import { landingPage, APK_SOURCE_URL } from "./lib/landingPage";

const app: Express = express();

// Behind a reverse proxy / load balancer in production (Railway, Render, Nginx,
// etc.) so req.ip and the x-forwarded-proto used for HSTS reflect the real
// client instead of the proxy — important for correct rate-limiting by IP.
if (process.env["NODE_ENV"] === "production") {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(securityHeaders);

// CORS: in production set ALLOWED_ORIGINS to a comma-separated list
// (e.g. "https://your.app,https://admin.your.app"). Locally / when unset we
// keep the permissive origin:true so Expo web + LAN devices keep working.
const allowed = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowed.length > 0 ? allowed : true,
    credentials: true,
  }),
);
// Auth is stateless (bearer JWTs issued by /admin/login and /auth/otp/verify)
// rather than cookie sessions — a mobile client can't rely on cookies.
// Cap JSON bodies so a malicious client can't OOM the process with a huge payload.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Plain, login-free HTML page (outside the JSON /api router) so a driver can
// just tap a WhatsApp link and see/toggle their own availability in their
// phone's normal browser — no app install needed.
app.get("/driver/:token", (req, res) => {
  res.type("html").send(driverPortalPage(req.params.token));
});

// Bridge page for the WhatsApp "rate the store" link — forwards into the app's
// deep link so the customer lands on the rating screen for their order.
app.get("/rate/:orderId", (req, res) => {
  res.type("html").send(ratePage(req.params.orderId));
});

// Bridge page for shared product links — forwards into the app's deep link so
// a friend who taps the WhatsApp link lands directly on that product.
app.get("/p/:id", (req, res) => {
  res.type("html").send(productBridgePage(req.params.id));
});

// Public landing / download page — this is what share & referral links point to.
app.get(["/", "/download"], (_req, res) => {
  res.type("html").send(landingPage());
});

// Stream the latest APK with a clean "allaka.apk" download name. Expo serves the
// artifact with a long hashed filename, so we proxy it and set Content-Disposition
// ourselves. The installed app label stays "علاكة" (from app.json).
app.get("/app/allaka.apk", async (_req, res) => {
  try {
    const upstream = await fetch(APK_SOURCE_URL);
    if (!upstream.ok || !upstream.body) {
      res.status(502).send("APK not available");
      return;
    }
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", 'attachment; filename="allaka.apk"');
    const len = upstream.headers.get("content-length");
    if (len) res.setHeader("Content-Length", len);
    const reader = upstream.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch {
    res.status(502).send("APK not available");
  }
});

// Latest published app version — the mobile app checks this on open and, when
// the installed version is older, shows an "update available" notice with the
// new version number and a link to download. The version/message can be set by
// the admin from the app (stored in app_settings) and falls back to env vars,
// so publishing an update is a one-tap action with no redeploy.
app.get("/api/app-version", async (_req, res) => {
  let latestVersion = process.env["APP_LATEST_VERSION"] || "1.0.0";
  let message =
    process.env["APP_UPDATE_MESSAGE"] ||
    "صدر تحديث جديد لتطبيق عـلاّكـة, حدّث الآن للحصول على آخر الميزات والتحسينات.";
  try {
    const rows = await db
      .select()
      .from(appSettingsTable)
      .where(inArray(appSettingsTable.key, [APP_VERSION_KEY, APP_MESSAGE_KEY]));
    for (const r of rows) {
      if (r.key === APP_VERSION_KEY && r.value) latestVersion = r.value;
      if (r.key === APP_MESSAGE_KEY && r.value) message = r.value;
    }
  } catch {
    // If the settings lookup fails, fall back to env/defaults above.
  }
  res.json({ latestVersion, apkUrl: "/app/allaka.apk", message });
});

app.use("/api", router);

export default app;
