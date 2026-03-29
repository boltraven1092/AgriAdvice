import type { AddressInfo } from "node:net";

import cors from "cors";
import express from "express";
import helmet from "helmet";

import { config } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { inferenceRateLimiter } from "./middleware/rateLimiter";
import { adminRouter } from "./routes/admin";
import { consultationRouter } from "./routes/consultation";
import { demoConsultationRouter } from "./routes/demoConsultation";
import { addAdminLog } from "./services/adminLogStore";
import { appendRequestLogToFile } from "./services/requestFileLogger";
import { authRouter } from "./routes/user/auth";
import { userConsultationsRouter } from "./routes/user/consultations";
import { userPreferencesRouter } from "./routes/user/preferences";

const app = express();

app.disable("x-powered-by");

// Security hardening baseline for all HTTP responses.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Gateway-controlled CORS prevents unknown browsers from hitting paid inference endpoints.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.frontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(requestLogger);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      latencyMs: Date.now() - start,
      inputType: typeof res.locals.inputType === "string" ? res.locals.inputType : undefined,
      transcript: typeof res.locals.transcript === "string" ? res.locals.transcript : undefined,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    addAdminLog({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...logEntry,
    });

    void appendRequestLogToFile(logEntry).catch((error) => {
      logger.error({ err: error }, "Failed to append request log to file");
    });
  });
  next();
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: "api-gateway",
      status: "healthy",
      env: config.nodeEnv,
    },
    error: null,
  });
});

// All frontend AI traffic is funneled through /api/v1 and throttled globally.
app.use("/api/v1", inferenceRateLimiter, consultationRouter);
app.use("/api/v1", inferenceRateLimiter, demoConsultationRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userPreferencesRouter);
app.use("/api/v1/user", userConsultationsRouter);
app.use("/api/v1", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  const address = server.address() as AddressInfo | null;
  logger.info(
    {
      event: "API_GATEWAY_STARTED",
      port: address?.port ?? config.port,
      aiMicroserviceUrl: config.aiMicroserviceUrl,
    },
    "Primary API Gateway is running"
  );
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    logger.error(
      {
        event: "PORT_IN_USE",
        port: config.port,
      },
      `Port ${config.port} is already in use. Stop the existing process or change PORT in backend .env.`
    );
    process.exit(1);
  }

  logger.error({ err: error }, "Server startup failed");
  process.exit(1);
});
