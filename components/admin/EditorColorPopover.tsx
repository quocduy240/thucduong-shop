"use client";

import { useEffect, useMemo, useState } from "react";

export type ColorGroup = {
  label: string;
  colors: { hex: string; name?: string }[];
};

/** 40 colors (8x5): Neutral, Brand, Pastel, Dark + Accent */
export const EDITOR_COLOR_GROUPS: ColorGroup[] = [
  {
    label: "Neutral",
    colors: [
      { hex: "#000000" }, { hex: "#1f2937" }, { hex: "#4b5563" }, { hex: "#6b7280" },
      { hex: "#9ca3af" }, { hex: "#d1d5db" }, { hex: "#f3f4f6" }, { hex: "#ffffff" },
    ],
  },
  {
    label: "Brand & Thực dưỡng",
    colors: [
      { hex: "#1f5a22", name: "Xanh đậm" }, { hex: "#2f7d32", name: "Xanh thương hiệu" },
      { hex: "#16a34a" }, { hex: "#059669" }, { hex: "#0d9488" }, { hex: "#c62828", name: "Đỏ nhấn" },
      { hex: "#d97706" }, { hex: "#b45309" },
    ],
  },
  {
    label: "Pastel (Highlight)",
    colors: [
      { hex: "#fef08a" }, { hex: "#fde68a" }, { hex: "#fed7aa" }, { hex: "#fecaca" },
      { hex: "#fbcfe8" }, { hex: "#ddd6fe" }, { hex: "#bfdbfe" }, { hex: "#bbf7d0" },
    ],
  },
  {
    label: "Vivid",
    colors: [
      { hex: "#dc2626" }, { hex: "#ea580c" }, { hex: "#ca8a04" }, { hex: "#15803d" },
      { hex: "#0284c7" }, { hex: "#2563eb" }, { hex: "#7c3aed" }, { hex: "#db2777" },
    ],
  },
  {
    label: "Dark",
    colors: [
      { hex: "#7f1d1d" }, { hex: "#7c2d12" }, { hex: "#713f12" }, { hex: "#14532d" },
      { hex: "#134e4a" }, { hex: "#1e3a8a" }, { hex: "#4c1d95" }, { hex: "#831843" },
    ],
  },
];

export const SEMANTIC_TOKENS = [
  { label: "Màu chữ chính", value: "var(--foreground)", preview: "#1f2937" },
  { label: "Thương hiệu", value: "var(--brand)", preview: "#2f7d32" },
  { label: "Nhấn mạnh", value: "var(--accent)", preview: "#c62828" },
];

const RECENT_KEY = "td_editor_recent_colors";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function hexToRgb(hex: string): [number, number, number] | null {
  if (!HEX_RE.test(hex)) return null;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hex1: string, hex2: string): number | null {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return null;
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export default function EditorColorPopover({
  kind,
  currentTextColor,
  currentHighlightColor,
  onApply,
  onClose,
}: {
  kind: "text" | "highlight";
  currentTextColor: string;
  currentHighlightColor: string;
  onApply: (color: string) => void;
  onClose: () => void;
}) {
  const activeHex = kind === "text" ? currentTextColor : currentHighlightColor;
  const [hexInput, setHexInput] = useState(HEX_RE.test(activeHex) ? activeHex : "#2f7d32");
  const [recentColors, setRecentColors] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setRecentColors(arr.filter((c) => typeof c === "string" && HEX_RE.test(c)).slice(0, 8));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const isHexValid = HEX_RE.test(hexInput.trim());

  const contrastInfo = useMemo(() => {
    const fg = kind === "text" ? (isHexValid ? hexInput.trim() : currentTextColor) : currentTextColor;
    const bg =
      kind === "highlight"
        ? isHexValid
          ? hexInput.trim()
          : currentHighlightColor === "transparent"
            ? "#ffffff"
            : currentHighlightColor
        : currentHighlightColor === "transparent"
          ? "#ffffff"
          : currentHighlightColor;
    const ratio = contrastRatio(fg, bg);
    if (ratio === null) return null;
    return { ratio: Number(ratio.toFixed(2)), passAA: ratio >= 4.5 };
  }, [kind, hexInput, isHexValid, currentTextColor, currentHighlightColor]);

  function pickAndRemember(color: string) {
    if (HEX_RE.test(color)) {
      const next = [color.toLowerCase(), ...recentColors.filter((c) => c.toLowerCase() !== color.toLowerCase())].slice(0, 8);
      setRecentColors(next);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
    onApply(color);
  }

  return (
    <div
      onMouseDown={(e) => {
        // Keep editor selection alive except when clicking into the HEX text input
        if ((e.target as HTMLElement).tagName !== "INPUT") {
          e.preventDefault();
        }
      }}
      className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
    >
      <div className="mb-2 flex items-center justify-between border-b pb-1.5">
        <span className="text-[11px] font-bold text-gray-800">
          {kind === "text" ? "🅰️ Chọn Màu Chữ" : "🖍️ Chọn Màu Nền (Highlight)"}
        </span>
        <button type="button" onClick={onClose} className="text-xs text-gray-400 hover:text-gray-700">
          ✕
        </button>
      </div>

      <button
        type="button"
        onClick={() => onApply(kind === "text" ? "inherit" : "transparent")}
        className="mb-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100"
      >
        <span>🚫</span>
        <span>{kind === "text" ? "Xóa màu chữ (Mặc định)" : "Xóa màu nền (Trong suốt)"}</span>
      </button>

      {/* Semantic Theme Tokens */}
      {kind === "text" && (
        <div className="mb-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Semantic Tokens (Dark-mode safe)
          </div>
          <div className="flex flex-wrap gap-1">
            {SEMANTIC_TOKENS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onApply(t.value)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 hover:border-brand"
                title={t.value}
              >
                <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: t.preview }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 40-color palette (8x5) */}
      <div className="space-y-1.5">
        {EDITOR_COLOR_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">{g.label}</div>
            <div className="grid grid-cols-8 gap-1">
              {g.colors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => pickAndRemember(c.hex)}
                  title={c.name ? `${c.name} (${c.hex})` : c.hex}
                  className="h-5 w-5 cursor-pointer rounded border border-gray-300/80 transition hover:scale-110 hover:border-gray-900"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <div className="mt-2 border-t pt-1.5">
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-gray-400">Màu gần đây</div>
          <div className="flex flex-wrap gap-1">
            {recentColors.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => pickAndRemember(hex)}
                title={hex}
                className="h-4 w-4 cursor-pointer rounded border border-gray-300 hover:scale-110"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom HEX input + Color wheel */}
      <div className="mt-2.5 border-t pt-2">
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={isHexValid ? hexInput.trim() : "#2f7d32"}
            onChange={(e) => setHexInput(e.target.value)}
            className="h-7 w-7 shrink-0 cursor-pointer rounded border border-gray-300 bg-transparent p-0"
            title="Chọn màu trực quan"
          />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            placeholder="#RRGGBB"
            maxLength={7}
            className={`w-full rounded-md border px-2 py-1 font-mono text-xs outline-none ${
              isHexValid ? "border-gray-300 focus:border-brand" : "border-red-400 bg-red-50 text-red-700"
            }`}
          />
          <button
            type="button"
            disabled={!isHexValid}
            onClick={() => pickAndRemember(hexInput.trim())}
            className="shrink-0 cursor-pointer rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Áp dụng
          </button>
        </div>

        {contrastInfo && (
          <div
            className={`mt-1.5 rounded-md px-2 py-1 text-[10px] font-medium ${
              contrastInfo.passAA ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
            }`}
          >
            {contrastInfo.passAA
              ? `✓ Tương phản WCAG AA đạt (${contrastInfo.ratio}:1)`
              : `⚠️ Độ tương phản thấp (${contrastInfo.ratio}:1 < 4.5:1), có thể khó đọc`}
          </div>
        )}
      </div>
    </div>
  );
}
