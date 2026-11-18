"use client";

import { useState } from "react";
import type { ThemePreset, ThemeSettingsConfig } from "@/lib/themes";

export default function AdminThemeStudio({ initialConfig }: { initialConfig: ThemeSettingsConfig }) {
  const [config, setConfig] = useState<ThemeSettingsConfig>(initialConfig);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function updatePreset(idx: number, patch: Partial<ThemePreset>) {
    setConfig((prev) => ({
      ...prev,
      presets: prev.presets.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));
  }

  async function handleSave() {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = (await res.json()) as { ok?: boolean; config?: ThemeSettingsConfig; error?: string };
      if (!res.ok || !data.ok || !data.config) throw new Error(data.error || "Lưu thất bại.");
      setConfig(data.config);
      setMsg("✓ Đã lưu bộ thông số giao diện! Khách truy cập mới sẽ tự động áp dụng cấu hình mặc định.");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!confirm("Khôi phục toàn bộ màu sắc và cỡ chữ về bộ tiêu chuẩn thiết kế mặc định?")) return;
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const data = (await res.json()) as { ok?: boolean; config?: ThemeSettingsConfig; error?: string };
      if (!res.ok || !data.ok || !data.config) throw new Error(data.error || "Khôi phục thất bại.");
      setConfig(data.config);
      setMsg("↺ Đã khôi phục bộ thông số giao diện chuẩn thiết kế.");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Default Theme for First-Time Visitors */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-900">
            🌟 Giao diện mặc định cho khách truy cập lần đầu
          </label>
          <p className="text-xs text-gray-500">
            Khi người dùng chưa tự chọn chế độ riêng, website sẽ hiển thị theo giao diện mặc định này.
          </p>
        </div>
        <select
          value={config.defaultThemeId}
          onChange={(e) => setConfig((prev) => ({ ...prev, defaultThemeId: e.target.value }))}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800"
        >
          {config.presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.name} ({p.fontSizePx}px)
            </option>
          ))}
        </select>
      </div>

      {(msg || err) && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${
            err ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || msg}
        </div>
      )}

      {/* Preset Editors */}
      <div className="grid gap-6 lg:grid-cols-3">
        {config.presets.map((p, idx) => (
          <div key={p.id} className="flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{p.name}</div>
                    <div className="text-[11px] text-gray-400">ID: {p.id}</div>
                  </div>
                </div>
                {config.defaultThemeId === p.id && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    Mặc định
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-gray-600">Icon</label>
                  <input
                    value={p.icon}
                    onChange={(e) => updatePreset(idx, { icon: e.target.value })}
                    className="w-full rounded-lg border px-2 py-1.5 text-center text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] font-semibold text-gray-600">Nhãn nút gọn</label>
                  <input
                    value={p.shortLabel}
                    onChange={(e) => updatePreset(idx, { shortLabel: e.target.value })}
                    className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-600">Tên hiển thị</label>
                <input
                  value={p.name}
                  onChange={(e) => updatePreset(idx, { name: e.target.value })}
                  className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-600">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  value={p.description}
                  onChange={(e) => updatePreset(idx, { description: e.target.value })}
                  className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
                />
              </div>

              {/* Typography Controls */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
                <div>
                  <label className="mb-1 flex justify-between text-[11px] font-semibold text-gray-700">
                    <span>Cỡ chữ gốc</span>
                    <span className="font-bold text-brand">{p.fontSizePx}px</span>
                  </label>
                  <input
                    type="range"
                    min={13}
                    max={22}
                    step={0.5}
                    value={p.fontSizePx}
                    onChange={(e) => updatePreset(idx, { fontSizePx: Number(e.target.value) })}
                    className="w-full accent-brand"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-gray-700">Giãn dòng</label>
                  <select
                    value={p.lineHeight}
                    onChange={(e) => updatePreset(idx, { lineHeight: e.target.value })}
                    className="w-full rounded-lg border bg-white px-2 py-1 text-xs"
                  >
                    <option value="1.5">1.5 (Gọn)</option>
                    <option value="1.6">1.6 (Chuẩn)</option>
                    <option value="1.75">1.75 (Thoáng)</option>
                    <option value="1.85">1.85 (Rất thoáng)</option>
                  </select>
                </div>
              </div>

              {/* Color Palette Controls */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {(
                  [
                    ["background", "Màu nền trang"],
                    ["foreground", "Màu chữ chính"],
                    ["brand", "Màu thương hiệu"],
                    ["brandDark", "Màu nhấn đậm"],
                    ["accent", "Màu giá / nổi bật"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="flex items-center justify-between rounded-lg border px-2 py-1.5">
                    <span className="font-medium text-gray-700">{label}</span>
                    <input
                      type="color"
                      value={p[field]}
                      onChange={(e) => updatePreset(idx, { [field]: e.target.value })}
                      className="h-5 w-7 cursor-pointer border-0 bg-transparent p-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Live Preview Box */}
            <div
              className="rounded-xl border p-3.5 transition-all"
              style={{
                backgroundColor: p.background,
                color: p.foreground,
                fontSize: `${p.fontSizePx}px`,
                lineHeight: p.lineHeight,
              }}
            >
              <div className="text-[10px] font-bold uppercase opacity-60 mb-1">Xem trước trực tiếp</div>
              <div className="font-bold" style={{ color: p.brandDark, fontSize: "1.05em" }}>
                Gạo Lứt Huyết Rồng Hữu Cơ
              </div>
              <p className="mt-1 opacity-90" style={{ fontSize: "0.82em" }}>
                Thực phẩm quân bình Âm Dương, dễ tiêu hoá và tốt cho sức khoẻ hằng ngày.
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="font-bold" style={{ color: p.accent, fontSize: "0.9em" }}>
                  145.000đ
                </span>
                <span
                  className="rounded-lg px-2.5 py-1 font-bold text-white"
                  style={{ backgroundColor: p.brand, fontSize: "0.72em" }}
                >
                  Đặt mua
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
        <button
          type="button"
          disabled={busy}
          onClick={handleReset}
          className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          ↺ Khôi phục bộ chuẩn thiết kế
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleSave}
          className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
        >
          {busy ? "Đang lưu..." : "💾 Lưu Cấu Hình Giao Diện"}
        </button>
      </div>
    </div>
  );
}
