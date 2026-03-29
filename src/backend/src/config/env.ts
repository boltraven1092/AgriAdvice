import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGINS: z.string().default("http://localhost:5173,http://localhost:3000"),
  AI_MICROSERVICE_URL: z.string().url().default("http://127.0.0.1:8000"),
  MAX_AUDIO_FILE_SIZE_MB: z.coerce.number().int().positive().default(12),
  DOWNSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(180000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,
  frontendOrigins: env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim()),
  aiMicroserviceUrl: env.AI_MICROSERVICE_URL,
  maxAudioFileSizeBytes: env.MAX_AUDIO_FILE_SIZE_MB * 1024 * 1024,
  downstreamTimeoutMs: env.DOWNSTREAM_TIMEOUT_MS,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: env.RATE_LIMIT_MAX,
};
