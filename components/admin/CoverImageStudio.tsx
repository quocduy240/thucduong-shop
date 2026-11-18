"use client";

import { useEffect, useRef, useState } from "react";
import AiImageRegenerateModal from "./AiImageRegenerateModal";

const SIZE_PRESETS = [
  { id: "1200x675", label: "16:9 Chuẩn SEO / Blog (1200 × 675 px)", w: 1200, h: 675 },
  { id: "800x600", label: "4:3 Chuẩn Thẻ Bài viết (800 × 600 px)", w: 800, h: 600 },
  { id: "800x800", label: "1:1 Ảnh Vuông Thumbnail (800 × 800 px)", w: 800, h: 800 },
  { id: "original", label: "Giữ nguyên kích thước gốc", w: 0, h: 0 },
  { id: "custom", label: "Tuỳ chỉnh Rộng × Cao (px)...", w: 1000, h: 560 },
];

export default function CoverImageStudio({
  defaultCover = "",
  inputName = "cover",
  defaultPreset = "1200x675",
  label = "🖼️ Ảnh đại diện bài viết & Tuỳ biến kích thước (Đa nguồn)",
}: {
  defaultCover?: string;
  inputName?: string;
  defaultPreset?: string;
  label?: string;
}) {
  const [coverUrl, setCoverUrl] = useState(defaultCover);
  const [sourceTab, setSourceTab] = useState<"upload" | "url" | "ai">("upload");
  const [externalUrl, setExternalUrl] = useState("");
  const [preset, setPreset] = useState(defaultPreset);
  const [customW, setCustomW] = useState(1200);
  const [customH, setCustomH] = useState(675);
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");
  const [displayWidthPct, setDisplayWidthPct] = useState<number>(100);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCoverUrl(defaultCover);
  }, [defaultCover]);

  // Listen for custom event from AI Rewriter when AI generates a new cover
  useEffect(() => {
    function onAiCover(e: Event) {
      const detail = (e as CustomEvent<{ url?: string }>).detail;
      if (detail?.url) {
        setCoverUrl(detail.url);
        setMsg("✨ Đã tự động cập nhật ảnh đại diện từ AI!");
      }
    }
    window.addEventListener("td:update-cover", onAiCover);
    return () => window.removeEventListener("td:update-cover", onAiCover);
  }, []);

  function getTargetDimensions() {
    if (preset === "original") return { w: 0, h: 0 };
    if (preset === "custom") return { w: Math.max(100, customW), h: Math.max(100, customH) };
    const found = SIZE_PRESETS.find((p) => p.id === preset);
    return { w: found?.w ?? 1200, h: found?.h ?? 675 };
  }

  /** Resize/crop a File or Image element on an HTML5 Canvas before uploading */
  async function resizeAndUploadBlob(fileOrImgUrl: File | string): Promise<string> {
    const { w: targetW, h: targetH } = getTargetDimensions();

    // If original size and it's a File, upload directly
    if (targetW === 0 && fileOrImgUrl instanceof File) {
      const fd = new FormData();
      fd.append("file", fileOrImgUrl);
      const res = await fetch("/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Tải ảnh thất bại.");
      return data.url;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    const objectUrl = fileOrImgUrl instanceof File ? URL.createObjectURL(fileOrImgUrl) : fileOrImgUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Không đọc được dữ liệu hình ảnh."));
      img.src = objectUrl;
    });

    const outW = targetW > 0 ? targetW : img.naturalWidth || 1200;
    const outH = targetH > 0 ? targetH : img.naturalHeight || 675;

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh Canvas.");

    ctx.fillStyle = "#f0fdf4";
    ctx.fillRect(0, 0, outW, outH);

    const srcW = img.naturalWidth || outW;
    const srcH = img.naturalHeight || outH;

    if (fitMode === "cover") {
      const scale = Math.max(outW / srcW, outH / srcH);
      const drawW = srcW * scale;
      const drawH = srcH * scale;
      const dx = (outW - drawW) / 2;
      const dy = (outH - drawH) / 2;
      ctx.drawImage(img, dx, dy, drawW, drawH);
    } else {
      const scale = Math.min(outW / srcW, outH / srcH);
      const drawW = srcW * scale;
      const drawH = srcH * scale;
      const dx = (outW - drawW) / 2;
      const dy = (outH - drawH) / 2;
      ctx.drawImage(img, dx, dy, drawW, drawH);
    }

    if (fileOrImgUrl instanceof File) URL.revokeObjectURL(objectUrl);

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
    if (!blob) throw new Error("Không thể xuất ảnh đã tuỳ chỉnh kích thước.");

    const resizedFile = new File([blob], `cover-${outW}x${outH}.webp`, { type: "image/webp" });
    const fd = new FormData();
    fd.append("file", resizedFile);
    const res = await fetch("/admin/upload", { method: "POST", body: fd });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error ?? "Upload ảnh thất bại.");
    return data.url;
  }

  async function handleFileSelect(file: File) {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const uploadedUrl = await resizeAndUploadBlob(file);
      setCoverUrl(uploadedUrl);
      const { w, h } = getTargetDimensions();
      setMsg(
        w > 0
          ? `✓ Đã tải và tối ưu ảnh đại diện theo kích thước ${w} × ${h} px!`
          : "✓ Đã tải ảnh đại diện giữ nguyên kích thước gốc!",
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUrlImport() {
    if (!externalUrl.trim()) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: externalUrl.trim() }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Không tải được ảnh từ URL này.");
      // Now resize the downloaded local image to match target dimensions if preset !== 'original'
      const { w } = getTargetDimensions();
      if (w > 0 && !data.url.endsWith(".svg")) {
        const resized = await resizeAndUploadBlob(data.url);
        setCoverUrl(resized);
      } else {
        setCoverUrl(data.url);
      }
      setExternalUrl("");
      setMsg("✓ Đã lấy ảnh từ URL và chuẩn hóa kích thước thành công!");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResizeExisting() {
    if (!coverUrl) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const resized = await resizeAndUploadBlob(coverUrl);
      setCoverUrl(resized);
      const { w, h } = getTargetDimensions();
      setMsg(`✓ Đã chuẩn hóa lại kích thước ảnh thành ${w || "gốc"} × ${h || "gốc"} px!`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateAiCover() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const form = fileInputRef.current?.closest("form");
      const titleVal =
        (form?.querySelector('[name="title"], [name="name"]') as HTMLInputElement)?.value?.trim() ||
        "Cẩm Nang Thực Dưỡng & Sức Khỏe Tự Nhiên";
      const excerptVal =
        (form?.querySelector('[name="excerpt"], [name="summary"]') as HTMLTextAreaElement)?.value?.trim() ||
        "Ăn lành · Hưởng phúc · Sống thọ";

      const { w: targetW, h: targetH } = getTargetDimensions();
      const outW = targetW > 0 ? targetW : 1200;
      const outH = targetH > 0 ? targetH : 675;

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;

      // Rich macrobiotic gradient background
      const grad = ctx.createLinearGradient(0, 0, outW, outH);
      grad.addColorStop(0, "#14532d");
      grad.addColorStop(0.55, "#2f7d32");
      grad.addColorStop(1, "#0f766e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, outW, outH);

      // Decorative circles
      ctx.fillStyle = "rgba(254, 240, 138, 0.1)";
      ctx.beginPath();
      ctx.arc(outW * 0.88, outH * 0.18, outW * 0.18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
      ctx.beginPath();
      ctx.arc(outW * 0.12, outH * 0.85, outW * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Inner frame
      const pad = Math.round(outW * 0.055);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 2;
      ctx.strokeRect(pad, pad, outW - pad * 2, outH - pad * 2);

      // Brand pill
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(pad + 36, pad + 36, Math.min(340, outW - pad * 2 - 72), 40);
      ctx.fillStyle = "#14532d";
      ctx.font = `bold ${Math.max(14, Math.round(outW * 0.015))}px sans-serif`;
      ctx.fillText("🌿 THỰC DƯỠNG PHÚC THỌ", pad + 54, pad + 62);

      // Wrap Title text
      ctx.fillStyle = "#ffffff";
      const titleFontSize = Math.max(24, Math.round(outW * 0.036));
      ctx.font = `bold ${titleFontSize}px sans-serif`;
      const maxTextWidth = outW - (pad + 36) * 2;
      const words = titleVal.split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(test).width > maxTextWidth && cur) {
          lines.push(cur);
          cur = word;
        } else {
          cur = test;
        }
      }
      if (cur) lines.push(cur);

      let y = pad + 140;
      lines.slice(0, 3).forEach((l, idx) => {
        ctx.fillStyle = idx === 1 ? "#fef08a" : "#ffffff";
        ctx.fillText(l, pad + 36, y);
        y += titleFontSize * 1.32;
      });

      // Subtitle
      ctx.fillStyle = "#dcfce7";
      ctx.font = `500 ${Math.max(15, Math.round(outW * 0.018))}px sans-serif`;
      ctx.fillText(excerptVal.slice(0, 75), pad + 36, Math.min(outH - pad - 45, y + 25));

      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.92));
      if (!blob) throw new Error("Không tạo được ảnh bìa AI.");
      const aiFile = new File([blob], `ai-cover-${outW}x${outH}.webp`, { type: "image/webp" });
      const fd = new FormData();
      fd.append("file", aiFile);
      const res = await fetch("/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Lưu ảnh AI thất bại.");

      setCoverUrl(data.url);
      setMsg(`✨ Đã tạo ảnh đại diện AI (${outW} × ${outH} px) theo đúng ngữ cảnh tiêu đề bài viết!`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function insertCoverIntoArticle() {
    if (!coverUrl) return;
    window.dispatchEvent(
      new CustomEvent("td:insert-html", {
        detail: {
          html: `<figure style="text-align:center;margin:16px 0;"><img src="${coverUrl}" alt="Ảnh minh họa bài viết" style="width:${displayWidthPct}%;max-width:100%;border-radius:12px;" /><figcaption>Ảnh minh họa chuyên đề Thực dưỡng</figcaption></figure><p></p>`,
        },
      }),
    );
    setMsg(`✓ Đã chèn ảnh đại diện (rộng ${displayWidthPct}%) vào trong nội dung bài viết!`);
  }

  return (
    <div
      onPaste={(e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const it of items) {
          if (it.type.startsWith("image/")) {
            const f = it.getAsFile();
            if (f) {
              e.preventDefault();
              void handleFileSelect(f);
              break;
            }
          }
        }
      }}
      className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-4"
    >
      {/* Hidden input synced with form */}
      <input type="hidden" name={inputName} value={coverUrl} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
        <div>
          <label className="text-sm font-bold text-gray-900">
            {label}
          </label>
          <p className="text-xs text-gray-500">
            Tải từ máy tính, dán trực tiếp (Ctrl+V), lấy từ link URL bất kỳ hoặc tạo tự động bằng AI theo tiêu đề bài viết.
          </p>
        </div>

        {/* Source Tabs */}
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSourceTab("upload")}
            className={`rounded-lg px-3 py-1.5 transition ${
              sourceTab === "upload" ? "bg-brand text-white shadow-xs" : "text-gray-600 hover:text-brand"
            }`}
          >
            📤 Máy tính / Ctrl+V
          </button>
          <button
            type="button"
            onClick={() => setSourceTab("url")}
            className={`rounded-lg px-3 py-1.5 transition ${
              sourceTab === "url" ? "bg-brand text-white shadow-xs" : "text-gray-600 hover:text-brand"
            }`}
          >
            🔗 Từ Link URL / Drive
          </button>
          <button
            type="button"
            onClick={() => setSourceTab("ai")}
            className={`rounded-lg px-3 py-1.5 transition ${
              sourceTab === "ai" ? "bg-brand text-white shadow-xs" : "text-gray-600 hover:text-brand"
            }`}
          >
            ✨ Tạo ảnh bằng AI
          </button>
        </div>
      </div>

      {/* Size & Aspect Ratio Controls */}
      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3.5 sm:grid-cols-12">
        <div className="sm:col-span-5">
          <label className="mb-1 block text-xs font-semibold text-gray-700">📐 Kích thước / Tỷ lệ ảnh đại diện:</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-brand"
          >
            {SIZE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {preset === "custom" ? (
          <div className="grid grid-cols-2 gap-2 sm:col-span-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Rộng (px):</label>
              <input
                type="number"
                min={100}
                max={2400}
                value={customW}
                onChange={(e) => setCustomW(Number(e.target.value) || 1200)}
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Cao (px):</label>
              <input
                type="number"
                min={100}
                max={2400}
                value={customH}
                onChange={(e) => setCustomH(Number(e.target.value) || 675)}
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>
        ) : (
          <div className="sm:col-span-4">
            <label className="mb-1 block text-xs font-semibold text-gray-700">Chế độ căn khung ảnh:</label>
            <select
              value={fitMode}
              onChange={(e) => setFitMode(e.target.value as "cover" | "contain")}
              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-brand"
            >
              <option value="cover">Cắt lấp đầy khung (Cover Crop chuẩn)</option>
              <option value="contain">Thu gọn vừa khung (Contain Fit)</option>
            </select>
          </div>
        )}

        <div className="flex items-end sm:col-span-3">
          <button
            type="button"
            disabled={busy || !coverUrl}
            onClick={handleResizeExisting}
            className="w-full rounded-lg border border-brand bg-green-50/60 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-white disabled:opacity-40 transition"
          >
            📐 Áp dụng kích thước
          </button>
        </div>
      </div>

      {/* Source Action Area + Live Preview */}
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <div className="flex flex-col justify-center rounded-xl border border-dashed border-gray-300 bg-white p-4">
          {sourceTab === "upload" && (
            <div className="text-center space-y-2 py-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFileSelect(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-brand-dark disabled:opacity-50"
              >
                📤 {busy ? "Đang xử lý ảnh..." : "Chọn ảnh từ máy tính"}
              </button>
              <p className="text-xs text-gray-500">
                Hoặc bấm vào khung này rồi nhấn <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-[11px]">Ctrl+V</kbd> để dán ảnh từ Clipboard.
              </p>
            </div>
          )}

          {sourceTab === "url" && (
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-gray-700">
                Dán đường dẫn ảnh (URL từ website khác hoặc link Google Drive):
              </label>
              <div className="flex gap-2">
                <input
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://example.com/anh-bai-viet.jpg"
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs outline-none focus:border-brand"
                />
                <button
                  type="button"
                  disabled={busy || !externalUrl.trim()}
                  onClick={handleUrlImport}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow hover:bg-brand-dark disabled:opacity-50"
                >
                  {busy ? "Đang tải..." : "⬇️ Tải về & Chuẩn hóa"}
                </button>
              </div>
              <p className="text-[11px] text-gray-500">
                Hệ thống sẽ tải ảnh về máy chủ <code>/uploads/posts/</code> và tự động cắt/chỉnh theo kích thước bạn đã chọn ở trên.
              </p>
            </div>
          )}

          {sourceTab === "ai" && (
            <div className="space-y-2.5">
              <div className="text-xs text-gray-700">
                <strong>✨ Thiết kế Ảnh đại diện tự động theo Ngữ cảnh bài viết:</strong> Hệ thống sẽ đọc <em>Tiêu đề</em> và <em>Mô tả ngắn</em> của bài viết để tạo ngay ảnh Banner chuẩn SEO (có tiêu đề nổi bật, thương hiệu Thực Dưỡng Phúc Thọ &amp; kích thước đúng chuẩn).
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={handleGenerateAiCover}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:opacity-95 disabled:opacity-50"
              >
                ✨ {busy ? "Đang khởi tạo..." : "Tạo Ảnh Đại Diện AI Theo Ngữ Cảnh Bài Viết"}
              </button>
            </div>
          )}
        </div>

        {/* Right: Current Cover Preview & Insert into Post Body */}
        <div className="flex flex-col justify-between rounded-xl border bg-white p-3">
          {coverUrl ? (
            <div className="space-y-2">
              <div className="relative overflow-hidden rounded-lg border bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt="Ảnh đại diện"
                  onClick={() => setAiModalOpen(true)}
                  title="Bấm vào ảnh để dùng Gemini AI tạo lại ảnh mới từ ảnh gốc"
                  className="aspect-video w-full cursor-pointer object-cover transition hover:opacity-90"
                />
                <button
                  type="button"
                  onClick={() => setCoverUrl("")}
                  className="absolute right-1.5 top-1.5 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-600"
                >
                  ✕ Xoá ảnh
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAiModalOpen(true)}
                className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-brand px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:opacity-95 cursor-pointer"
              >
                🎨 Tạo lại ảnh này bằng Gemini AI Image
              </button>
              <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                <select
                  value={displayWidthPct}
                  onChange={(e) => setDisplayWidthPct(Number(e.target.value))}
                  className="rounded border px-1.5 py-1 text-[11px]"
                  title="Độ rộng khi chèn vào bài viết"
                >
                  <option value={100}>Rộng 100% bài</option>
                  <option value={80}>Rộng 80% bài</option>
                  <option value={60}>Rộng 60% bài</option>
                </select>
                <button
                  type="button"
                  onClick={insertCoverIntoArticle}
                  className="flex-1 rounded-lg bg-green-50 px-2.5 py-1 font-bold text-brand hover:bg-brand hover:text-white transition"
                >
                  + Chèn ảnh này vào bài viết
                </button>
              </div>
            </div>
          ) : (
            <div className="grid aspect-video place-items-center rounded-lg border border-dashed bg-gray-50 text-center text-xs text-gray-400 p-4">
              Chưa có ảnh đại diện
            </div>
          )}
        </div>
      </div>

      {(msg || err) && (
        <div
          className={`rounded-lg px-3 py-2 text-xs font-medium ${
            err ? "bg-red-50 text-red-700" : "bg-green-50 text-brand"
          }`}
        >
          {err || msg}
        </div>
      )}

      <AiImageRegenerateModal
        open={aiModalOpen}
        originalUrl={coverUrl}
        contextTitle={
          ((fileInputRef.current?.closest("form")?.querySelector('[name="title"], [name="name"]') as HTMLInputElement | null)?.value) ||
          ""
        }
        onClose={() => setAiModalOpen(false)}
        onApply={(newUrl, _newName, syncedRows) => {
          setCoverUrl(newUrl);
          setMsg(
            `✨ Đã thay thế ảnh bằng Gemini AI Image${syncedRows > 0 ? ` (đã đồng bộ ${syncedRows} vị trí trên website)` : ""}!`,
          );
        }}
      />
    </div>
  );
}
