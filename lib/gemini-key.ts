import "server-only";
import { one, run } from "./db";

export function isLikelyValidGeminiKey(key: string): boolean {
  const k = key.trim();
  return k.startsWith("AIza") && k.length >= 30 && !/\s/.test(k);
}

/**
 * Resolves a valid Gemini API key in priority order:
 * 1. Explicit valid `overrideKey` from request (and persists it to `settings`).
 * 2. Stored `settings.gemini_api_key` if it matches `AIza...`.
 * 3. `process.env.GEMINI_API_KEY`.
 */
export async function resolveGeminiApiKey(overrideKey?: string): Promise<string> {
  const trimmedOverride = (overrideKey ?? "").trim();
  if (trimmedOverride) {
    if (!isLikelyValidGeminiKey(trimmedOverride)) {
      throw new Error(
        "Gemini API Key không đúng định dạng (Key hợp lệ của Google AI Studio luôn bắt đầu bằng 'AIza...' và dài khoảng 39 ký tự).",
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
