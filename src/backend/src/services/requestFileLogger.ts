import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

import { config } from "../config/env";

export async function appendRequestLogToFile(params: {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  inputType?: string;
  transcript?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const dir = path.dirname(config.requestLogFilePath);
  await mkdir(dir, { recursive: true });

  const line = [
    `[${params.timestamp}]`,
    `${params.method} ${params.path}`,
    `status=${params.statusCode}`,
    `latencyMs=${params.latencyMs}`,
    `inputType=${params.inputType || "-"}`,
    `transcript=${(params.transcript || "-").replace(/\s+/g, " ")}`,
    `ip=${params.ip || "-"}`,
    `ua=${(params.userAgent || "-").replace(/\s+/g, " ")}`,
  ].join(" | ");

  await appendFile(config.requestLogFilePath, line + "\n", { encoding: "utf8" });
}