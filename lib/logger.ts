/**
 * Structured single-line JSON logger for Cloudflare Workers Logs / Logpush and Node.js.
 * Automatically redacts sensitive keys (`token`, `password`, `secret`, `apiKey`, `cookie`, `authorization`).
 */

export type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY_RE = /(password|passwd|secret|token|apikey|api_key|authorization|cookie|smtp_pass|salt|hash)/i;

export function sanitizeLogMeta(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[max-depth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message.slice(0, 500),
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeLogMeta(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = sanitizeLogMeta(v, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

export function formatStructuredLog(
  level: LogLevel,
  event: string,
  meta?: Record<string, unknown>,
): string {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    event,
  };
  if (meta) {
    const safe = sanitizeLogMeta(meta) as Record<string, unknown>;
    Object.assign(payload, safe);
  }
  return JSON.stringify(payload);
}

export function logInfo(event: string, meta?: Record<string, unknown>) {
  console.log(formatStructuredLog("info", event, meta));
}

export function logWarn(event: string, meta?: Record<string, unknown>) {
  console.warn(formatStructuredLog("warn", event, meta));
}

export function logError(event: string, meta?: Record<string, unknown>) {
  console.error(formatStructuredLog("error", event, meta));
}
