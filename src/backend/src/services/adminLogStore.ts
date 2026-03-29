export type AdminLogEntry = {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  inputType?: string;
  transcript?: string;
  ip?: string;
  userAgent?: string;
};

const MAX_LOGS = 1000;
const entries: AdminLogEntry[] = [];

export function addAdminLog(entry: AdminLogEntry): void {
  entries.unshift(entry);
  if (entries.length > MAX_LOGS) {
    entries.length = MAX_LOGS;
  }
}

export function getAdminLogs(limit?: number): AdminLogEntry[] {
  const safeLimit = typeof limit === "number" ? Math.max(1, Math.min(limit, MAX_LOGS)) : 200;
  return entries.slice(0, safeLimit);
}