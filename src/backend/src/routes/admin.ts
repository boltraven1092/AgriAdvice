import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { config } from "../config/env";
import { getAdminLogs } from "../services/adminLogStore";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin@123";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const authHeaderSchema = z.string().regex(/^Bearer\s+.+$/i);

export const adminRouter = Router();

adminRouter.post("/admin/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      data: null,
      error: { message: "Invalid login payload" },
    });
    return;
  }

  if (parsed.data.username !== ADMIN_USERNAME || parsed.data.password !== ADMIN_PASSWORD) {
    res.status(401).json({
      success: false,
      data: null,
      error: { message: "Invalid admin credentials" },
    });
    return;
  }

  const token = jwt.sign(
    {
      role: "admin",
      username: ADMIN_USERNAME,
    },
    config.jwtSecret,
    { expiresIn: "8h" }
  );

  res.status(200).json({
    success: true,
    data: {
      token,
      username: ADMIN_USERNAME,
    },
    error: null,
  });
});

adminRouter.get("/admin/logs", (req, res) => {
  const rawAuth = req.headers.authorization;
  if (!rawAuth || !authHeaderSchema.safeParse(rawAuth).success) {
    res.status(401).json({
      success: false,
      data: null,
      error: { message: "Missing bearer token" },
    });
    return;
  }

  const token = rawAuth.replace(/^Bearer\s+/i, "").trim();
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { role?: string };
    if (payload.role !== "admin") {
      res.status(403).json({
        success: false,
        data: null,
        error: { message: "Admin role required" },
      });
      return;
    }
  } catch {
    res.status(401).json({
      success: false,
      data: null,
      error: { message: "Invalid or expired token" },
    });
    return;
  }

  const requestedLimit = Number(req.query.limit);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : undefined;

  res.status(200).json({
    success: true,
    data: {
      logs: getAdminLogs(limit),
      logFilePath: config.requestLogFilePath,
    },
    error: null,
  });
});