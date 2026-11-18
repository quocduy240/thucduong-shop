"use client";

import { useEffect, useState } from "react";

function suggestSeoImageName(contextTitle: string, originalUrl: string): string {
  let source = contextTitle.trim();
  if (!source && originalUrl) {
    try {
      const pathname = originalUrl.startsWith("http")
        ? new URL(originalUrl).pathname
        : originalUrl.split("?")[0];
      const base = pathname.split("/").pop() || "";
      source = decodeURIComponent(base).replace(/\.[a-z0-9]+$/i, "");
    } catch {
      source = "";
    }
  }
  const slug = source
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52);

  if (!slug) return "thuc-duong-phuc-tho-ai";
  return slug.endsWith("-moi") ? slug : `${slug}-moi`;
}

const IMAGE_PRESETS = [
  {
    id: "studio",
    label: "✨ Ánh sáng studio sắc nét, nền sạch sang trọng",
    prompt: "Professional commercial studio lighting, ultra-sharp details, clean luxury minimalist background.",
  },
  {
    id: "macrobiotic",
    label: "🌿 Phong cách Thực dưỡng tự nhiên (gỗ ấm, lá xanh, ngũ cốc)",
    prompt: "Warm organic macrobiotic lifestyle tabletop with natural light wood, subtle green leaves, and whole grains.",
  },
  {
    id: "ecommerce",
    label: "🛍️ Nổi bật bao bì & nhãn mác chuẩn thương mại điện tử",
    prompt: "Center the subject heroically, preserve exact packaging label and typography, high-conversion e-commerce look.",
  },
  {
    id: "bokeh",
    label: "📸 Màu sắc hài hoà, xoá chi tiết thừa, tạo chiều sâu bokeh nhẹ",
    prompt: "Rich balanced natural colors, remove background clutter, soft creamy depth-of-field bokeh.",
  },
];

export default function AiImageRegenerateModal({
  open,
  originalUrl,
  contextTitle = "",
  onClose,
  onApply,
}: {
  open: boolean;
  originalUrl: string;
  contextTitle?: string;
  onClose: () => void;
  onApply: (newUrl: string, newName: string, syncedRows: number) => void;
}) {
  const [selectedPresets, setSelectedPresets] = useState<string[]>([
    IMAGE_PRESETS[0].prompt,
    IMAGE_PRESETS[2].prompt,
  ]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [newName, setNewName] = useState(() => suggestSeoImageName(contextTitle, originalUrl));
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [replaceEverywhere, setReplaceEverywhere] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [syncedRows, setSyncedRows] = useState(0);

  useEffect(() => {
    if (open) {
      setNewName(suggestSeoImageName(contextTitle, originalUrl));
      setGeneratedUrl("");
      setErr("");
    }
  }, [open, contextTitle, originalUrl]);

  if (!open || !originalUrl) return null;

  function togglePreset(prompt: string) {
    setSelectedPresets((prev) =>
      prev.includes(prompt) ? prev.filter((x) => x !== prompt) : [...prev, prompt],
    );
  }

  async function runGenerate() {
    setBusy(true);
    setErr("");
    setGeneratedUrl("");
    try {
      const res = await fetch("/api/admin/ai-image-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl,
          presets: selectedPresets,
          customPrompt,
          newName: newName.trim() || contextTitle,
          contextTitle,
          replaceEverywhere,
          geminiApiKey,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        newUrl?: string;
        syncedRows?: number;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.newUrl) {
        throw new Error(data.error || "Không thể tạo ảnh mới bằng Gemini AI.");
      }
      setGeneratedUrl(data.newUrl);
      setSyncedRows(data.syncedRows ?? 0);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-white p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              🎨 Gemini AI Image Studio — Phân Tích &amp; Tạo Lại Ảnh Mới
            </h3>
            <p className="text-xs text-gray-500">
              AI sẽ phân tích ảnh gốc, tạo lại ảnh mới đẹp nhất có thể và đồng bộ đường dẫn trên toàn dữ liệu trang.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Before / After Preview */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-gray-50 p-3 space-y-1.5">
            <div className="text-[11px] font-bold uppercase text-gray-500">Ảnh gốc hiện tại</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={originalUrl} alt="Ảnh gốc" className="mx-auto max-h-52 w-full rounded-lg object-contain bg-white" />
            <div className="truncate text-[10px] text-gray-400">{originalUrl}</div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-1.5">
            <div className="text-[11px] font-bold uppercase text-emerald-800">Ảnh mới do Gemini AI tạo</div>
            {generatedUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={generatedUrl} alt="Ảnh mới AI" className="mx-auto max-h-52 w-full rounded-lg object-contain bg-white" />
                <div className="truncate text-[10px] font-semibold text-emerald-700">{generatedUrl}</div>
              </>
            ) : (
              <div className="grid h-52 place-items-center rounded-lg border border-dashed border-emerald-300 bg-white/60 text-center text-xs text-gray-400 px-4">
                {busy ? "⏳ Gemini AI Image đang phân tích và vẽ lại ảnh mới..." : "Chọn yêu cầu bên dưới rồi bấm Tạo ảnh mới"}
              </div>
            )}
          </div>
        </div>

        {/* Checkboxes + Custom Prompt + SEO File Name */}
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-xs font-bold text-gray-700">1. Chọn nhanh các yêu cầu tối ưu ảnh (Check nhiều):</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {IMAGE_PRESETS.map((p) => {
                const checked = selectedPresets.includes(p.prompt);
                return (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 text-xs transition ${
                      checked ? "border-brand bg-green-50/70 font-semibold text-brand" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePreset(p.prompt)}
                      className="mt-0.5 accent-brand"
                    />
                    <span>{p.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">
                2. Yêu cầu mở rộng tuỳ chỉnh (Text):
              </label>
              <input
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="VD: Đặt trên bàn gỗ sáng, thêm tách trà ấm bên cạnh..."
                className="w-full rounded-xl border px-3 py-2 text-xs"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">
                  3. Tên tệp ảnh mới (chuẩn SEO):
                </label>
                <button
                  type="button"
                  onClick={() => setNewName(suggestSeoImageName(contextTitle, originalUrl))}
                  className="text-[11px] font-semibold text-brand hover:underline cursor-pointer"
                >
                  ✨ Gợi ý tên SEO
                </button>
              </div>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: canh-duong-sinh-king-kung-moi"
                className="w-full rounded-xl border px-3 py-2 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              🔑 Gemini API Key (AIza... — tuỳ chọn nếu chưa lưu hoặc cần đổi key mới):
            </label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="Dán API Key từ Google AI Studio (bắt đầu bằng AIza...) để tự động lưu"
              className="w-full rounded-xl border px-3 py-2 text-xs"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={replaceEverywhere}
              onChange={(e) => setReplaceEverywhere(e.target.checked)}
              className="accent-brand"
            />
            <span>Đồng bộ cập nhật đường dẫn ảnh mới này trên toàn bộ dữ liệu trang (Sản phẩm, Bài viết, Block)</span>
          </label>
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {err}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={runGenerate}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-brand px-5 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-50 cursor-pointer"
          >
            {busy ? "⏳ Đang tạo ảnh AI..." : generatedUrl ? "🔄 Tạo lại phiên bản khác" : "✨ Phân tích & Tạo ảnh mới bằng Gemini AI"}
          </button>
          {generatedUrl && (
            <button
              type="button"
              onClick={() => {
                onApply(generatedUrl, newName.trim() || contextTitle, syncedRows);
                onClose();
              }}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
            >
              ✓ Thay thế ảnh ngay
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
