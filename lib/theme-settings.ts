import "server-only";
import { one, run } from "./db";
import { DEFAULT_THEME_CONFIG, type ThemePreset, type ThemeSettingsConfig } from "./themes";

const SETTINGS_KEY = "ui_themes_config";

export async function getThemeSettings(): Promise<ThemeSettingsConfig> {
  try {
    const row = await one<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, SETTINGS_KEY);
    if (!row?.value) return DEFAULT_THEME_CONFIG;
    const parsed = JSON.parse(row.value) as Partial<ThemeSettingsConfig>;
    const presets = Array.isArray(parsed.presets) && parsed.presets.length > 0
      ? parsed.presets.map((p, idx) => ({
          ...(DEFAULT_THEME_CONFIG.presets[idx] ?? DEFAULT_THEME_CONFIG.presets[0]),
          ...p,
        }))
      : DEFAULT_THEME_CONFIG.presets;
    const defaultThemeId =
      parsed.defaultThemeId && presets.some((p) => p.id === parsed.defaultThemeId)
        ? parsed.defaultThemeId
        : presets[0].id;
    return { defaultThemeId, presets };
  } catch {
    return DEFAULT_THEME_CONFIG;
  }
}

export async function saveThemeSettings(cfg: ThemeSettingsConfig): Promise<ThemeSettingsConfig> {
  const cleanPresets: ThemePreset[] = cfg.presets.map((p) => ({
    id: String(p.id || "").trim() || "default",
    name: String(p.name || "").trim() || "Giao diện",
    shortLabel: String(p.shortLabel || "").trim() || "Mặc định",
    icon: String(p.icon || "").trim() || "🎨",
    description: String(p.description || "").trim(),
    fontSizePx: Math.min(24, Math.max(13, Number(p.fontSizePx) || 16)),
    lineHeight: String(p.lineHeight || "1.6"),
    background: String(p.background || "#ffffff"),
    foreground: String(p.foreground || "#1f2937"),
    brand: String(p.brand || "#2f7d32"),
    brandDark: String(p.brandDark || "#1f5a22"),
    accent: String(p.accent || "#c62828"),
  }));

  const clean: ThemeSettingsConfig = {
    defaultThemeId: cleanPresets.some((p) => p.id === cfg.defaultThemeId)
      ? cfg.defaultThemeId
      : cleanPresets[0]?.id ?? "default",
    presets: cleanPresets,
  };

  await run(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    SETTINGS_KEY,
    JSON.stringify(clean),
  );
  return clean;
}
