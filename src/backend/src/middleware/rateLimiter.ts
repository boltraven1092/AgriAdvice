import rateLimit from "express-rate-limit";
import { config } from "../config/env";

export const inferenceRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please retry later.",
    },
  },
});
