import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

import { config } from "../config/env";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const error = new Error("Authentication required") as Error & { statusCode?: number };
    error.statusCode = 401;
    next(error);
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { sub: string; email: string };
    req.user = {
      id: decoded.sub,
      email: decoded.email,
    };
    next();
  } catch {
    const error = new Error("Invalid or expired token") as Error & { statusCode?: number };
    error.statusCode = 401;
    next(error);
  }
}
