import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { signAdminToken, isAdminRequest } from "../lib/auth";

const router: IRouter = Router();

const LoginBody = z.object({ password: z.string().min(1) });

router.post("/admin/login", (req: Request, res: Response): void => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "كلمة المرور مطلوبة" });
    return;
  }

  const adminPassword = process.env["ADMIN_PASSWORD"];
  if (!adminPassword) {
    res.status(500).json({ error: "ADMIN_PASSWORD not configured" });
    return;
  }

  if (parsed.data.password !== adminPassword) {
    res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    return;
  }

  const token = signAdminToken();
  res.json({ isAdmin: true, token });
});

router.post("/admin/logout", (_req: Request, res: Response): void => {
  // Tokens are stateless (JWT); logging out just means the client discards
  // its stored token. Kept as an endpoint for a consistent client flow.
  res.sendStatus(204);
});

router.get("/admin/session", (req: Request, res: Response): void => {
  res.json({ isAdmin: isAdminRequest(req) });
});

export default router;
