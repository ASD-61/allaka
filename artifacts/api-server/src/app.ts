import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { securityHeaders } from "./middlewares/security";
import { driverPortalPage } from "./lib/driverPortalPage";
import { ratePage } from "./lib/ratePage";
import { landingPage } from "./lib/landingPage";

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

// Public landing / download page — this is what share & referral links point to.
app.get(["/", "/download"], (_req, res) => {
  res.type("html").send(landingPage());
});

app.use("/api", router);

export default app;
