"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyThemePresetToDocument,
  type ThemePreset,
  type ThemeSettingsConfig,
} from "@/lib/themes";

const STORAGE_KEY = "td_theme_id";

function readSavedThemeId(): string {
  if (typeof window === "undefined") return "";
  try {
    const ls = window.localStorage.getItem(STORAGE_KEY);
    if (ls) return ls;
  } catch {
    /* ignore */
  }
  const match = document.cookie.match(/(?:^|;\s*)td_theme_id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function persistThemeId(id: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  document.cookie = `td_theme_id=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function ThemeSwitcher({ config }: { config: ThemeSettingsConfig }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(config.defaultThemeId);
  const wrapRef = useRef<HTMLDivElement>(null);

  const resolvePreset = (id: string): ThemePreset =>
    config.presets.find((p) => p.id === id) ??
    config.presets.find((p) => p.id === config.defaultThemeId) ??
    config.presets[0];

  useEffect(() => {
    const saved = readSavedThemeId();
    const targetId = saved && config.presets.some((p) => p.id === saved) ? saved : config.defaultThemeId;
    setActiveId(targetId);
    const preset = resolvePreset(targetId);
    if (preset) applyThemePresetToDocument(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function selectTheme(preset: ThemePreset) {
    setActiveId(preset.id);
    applyThemePresetToDocument(preset);
    persistThemeId(preset.id);
    setOpen(false);
  }

  const current = resolvePreset(activeId);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Đổi cỡ chữ & màu sắc giao diện"
        aria-label="Đổi giao diện hiển thị"
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs transition hover:border-brand hover:text-brand cursor-pointer"
      >
        <span aria-hidden className="text-sm leading-none">{current?.icon ?? "🎨"}</span>
        <span className="hidden lg:inline">{current?.shortLabel ?? "Giao diện"}</span>
        <span className="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-bold text-gray-600">
          Aa
        </span>
      </button>

      {open && (
        <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 sm:max-w-none sm:shadow-xl">
          <div className="mb-2 flex items-center justify-between border-b pb-2">
            <div>
              <div className="text-xs font-bold text-gray-900">🎨 Chế độ hiển thị</div>
              <div className="text-[11px] text-gray-500">Tự động ghi nhớ cho riêng bạn</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5">
            {config.presets.map((p) => {
              const isSelected = p.id === current?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectTheme(p)}
                  className={`flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition cursor-pointer ${
                    isSelected
                      ? "border-brand bg-green-50/70 ring-1 ring-brand/30"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className="mt-0.5 text-base leading-none">{p.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-bold text-gray-900">{p.name}</span>
                      {isSelected && <span className="text-xs font-bold text-brand">✓</span>}
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-500 leading-snug">{p.description}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                        Cỡ chữ {p.fontSizePx}px
                      </span>
                      <span className="flex items-center gap-1" title="Bảng màu">
                        <span
                          className="h-3 w-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: p.background }}
                        />
                        <span
                          className="h-3 w-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: p.brand }}
                        />
                        <span
                          className="h-3 w-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: p.accent }}
                        />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
