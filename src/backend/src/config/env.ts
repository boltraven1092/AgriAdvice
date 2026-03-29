import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,http://localhost:3000"),
  AI_MICROSERVICE_URL: z.string().url().default("http://127.0.0.1:8000"),
  JWT_SECRET: z.string().min(16).default("dev-only-change-this-secret"),
  PREFERENCES_STORE_PATH: z.string().default("./data/preferences.json"),
  USERS_STORE_PATH: z.string().default("./data/users.json"),
  CONSULTATIONS_STORE_PATH: z.string().default("./data/consultations.json"),
  REQUEST_LOG_FILE_PATH: z.string().default("./data/request_logs.txt"),
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
  jwtSecret: env.JWT_SECRET,
  preferencesStorePath: path.resolve(process.cwd(), env.PREFERENCES_STORE_PATH),
  usersStorePath: path.resolve(process.cwd(), env.USERS_STORE_PATH),
  consultationsStorePath: path.resolve(process.cwd(), env.CONSULTATIONS_STORE_PATH),
  requestLogFilePath: path.resolve(process.cwd(), env.REQUEST_LOG_FILE_PATH),
  maxAudioFileSizeBytes: env.MAX_AUDIO_FILE_SIZE_MB * 1024 * 1024,
  downstreamTimeoutMs: env.DOWNSTREAM_TIMEOUT_MS,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: env.RATE_LIMIT_MAX,
};
