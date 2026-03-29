import cors from "cors";
import express from "express";
import helmet from "helmet";

import { config } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { inferenceRateLimiter } from "./middleware/rateLimiter";
import { consultationRouter } from "./routes/consultation";

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

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(
    {
      event: "API_GATEWAY_STARTED",
      port: config.port,
      aiMicroserviceUrl: config.aiMicroserviceUrl,
    },
    "Primary API Gateway is running"
  );
});
