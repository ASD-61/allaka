import type { Request, Response, NextFunction } from "express";
import { getCustomerPhone } from "../lib/auth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customerPhone?: string;
    }
  }
}

export function requireCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const phone = getCustomerPhone(req);
  if (!phone) {
    res.status(401).json({ error: "يجب تسجيل الدخول" });
    return;
  }
  req.customerPhone = phone;
  next();
}
