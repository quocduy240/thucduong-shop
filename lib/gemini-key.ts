import "server-only";
import { one, run } from "./db";

export function isLikelyValidGeminiKey(key: string): boolean {
  const k = key.trim();
  return (k.startsWith("AIza") || k.startsWith("AQ.")) && k.length >= 25 && !/\s/.test(k);
}

/**
 * Resolves a valid Gemini API key in priority order:
 * 1. Explicit valid `overrideKey` from request (and persists it to `settings`).
 * 2. Stored `settings.gemini_api_key` if it matches `AIza...` or `AQ....`.
 * 3. `process.env.GEMINI_API_KEY`.
 */
export async function resolveGeminiApiKey(overrideKey?: string): Promise<string> {
  const trimmedOverride = (overrideKey ?? "").trim();
  if (trimmedOverride) {
    if (!isLikelyValidGeminiKey(trimmedOverride)) {
      throw new Error(
        "Gemini API Key không đúng định dạng (Key hợp lệ của Google AI Studio bắt đầu bằng 'AIza...' hoặc 'AQ....').",
      );
    }
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('gemini_api_key', ?)", trimmedOverride);
    return trimmedOverride;
  }

  const row = await one<{ value: string }>("SELECT value FROM settings WHERE key = 'gemini_api_key'");
  const dbKey = (row?.value ?? "").trim();
  if (isLikelyValidGeminiKey(dbKey)) {
    return dbKey;
  }

  const envKey = (process.env.GEMINI_API_KEY ?? "").trim();
  if (isLikelyValidGeminiKey(envKey)) {
    return envKey;
  }

  return "";
}

/**
 * Calls Gemini text generation with automatic model fallback (`gemini-3.8-flash` -> `gemini-flash-latest` -> `gemini-2.5-flash`).
 */
export async function callGeminiGenerateContent(
  apiKey: string,
  body: Record<string, unknown>,
  models = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash"],
): Promise<Response> {
  let lastRes: Response | null = null;
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (res.ok) return res;
    lastRes = res;
    // Only retry next model on 404/model-not-available
    if (res.status !== 404 && res.status !== 400) break;
  }
  return lastRes!;
}
