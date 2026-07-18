import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { securityHeaders } from "./middlewares/security";
import { driverPortalPage } from "./lib/driverPortalPage";

const app: Express = express();

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

app.use("/api", router);

export default app;
