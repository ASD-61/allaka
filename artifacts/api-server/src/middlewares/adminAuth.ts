import type { Request, Response, NextFunction } from "express";
import { isAdminRequest } from "../lib/auth";

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (isAdminRequest(req)) {
    next();
    return;
  }
  res.status(401).json({ error: "يجب تسجيل الدخول كمشرف" });
}
