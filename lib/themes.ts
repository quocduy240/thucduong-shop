export type ThemePreset = {
  id: string;
  name: string;
  shortLabel: string;
  icon: string;
  description: string;
  fontSizePx: number;
  lineHeight: string;
  background: string;
  foreground: string;
  brand: string;
  brandDark: string;
  accent: string;
};

export type ThemeSettingsConfig = {
  defaultThemeId: string;
  presets: ThemePreset[];
};

export const DEFAULT_THEME_CONFIG: ThemeSettingsConfig = {
  defaultThemeId: "default",
  presets: [
    {
      id: "default",
      name: "Chuẩn Thực Dưỡng",
      shortLabel: "Chuẩn",
      icon: "🌿",
      description: "Cân bằng, dịu mắt, phù hợp đa số người dùng.",
      fontSizePx: 16,
      lineHeight: "1.6",
      background: "#ffffff",
      foreground: "#1f2937",
      brand: "#2f7d32",
      brandDark: "#1f5a22",
      accent: "#c62828",
    },
    {
      id: "senior",
      name: "Người Lớn Tuổi (Chữ To · Rõ Nét)",
      shortLabel: "Chữ to",
      icon: "👓",
      description: "Cỡ chữ lớn hơn, nền giấy ấm chống chói, tương phản cao dễ đọc.",
      fontSizePx: 19,
      lineHeight: "1.8",
      background: "#fffdf5",
      foreground: "#111827",
      brand: "#1b5e20",
      brandDark: "#0d3b12",
      accent: "#b91c1c",
    },
    {
      id: "modern",
      name: "Trẻ Trung & Hiện Đại",
      shortLabel: "Hiện đại",
      icon: "✨",
      description: "Tông xanh ngọc tươi sáng, năng động, chữ gọn gàng hiện đại.",
      fontSizePx: 15,
      lineHeight: "1.6",
      background: "#f8fafc",
      foreground: "#0f172a",
      brand: "#059669",
      brandDark: "#047857",
      accent: "#ea580c",
    },
  ],
};

export function applyThemePresetToDocument(preset: ThemePreset) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--background", preset.background);
  root.style.setProperty("--foreground", preset.foreground);
  root.style.setProperty("--brand", preset.brand);
  root.style.setProperty("--brand-dark", preset.brandDark);
  root.style.setProperty("--accent", preset.accent);
  root.style.fontSize = `${preset.fontSizePx}px`;
  if (document.body) {
    document.body.style.lineHeight = preset.lineHeight;
  }
  root.dataset.themeId = preset.id;
}
