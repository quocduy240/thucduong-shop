"use client";

import { useRef, useState } from "react";
import AiImageRegenerateModal from "./AiImageRegenerateModal";

function parseGalleryUrls(raw: string): string[] {
  return (raw || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Resize/compress image client-side if larger than ~1.3MB so it always passes Cloudflare D1 1.5MB limit */
async function compressIfNeeded(file: File): Promise<File> {
  if (file.size <= 1.3 * 1024 * 1024 || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1200;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }));
        },
        "image/webp",
        0.86,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export default function ProductGalleryStudio({
  defaultGallery = "",
  productName = "",
}: {
  defaultGallery?: string;
  productName?: string;
}) {
  const [images, setImages] = useState<string[]>(() => parseGalleryUrls(defaultGallery));
  const [urlInput, setUrlInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [aiTargetIdx, setAiTargetIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;

    setBusy(true);
    setErr("");
    setMsg("");
    const uploaded: string[] = [];

    try {
      for (const rawFile of list) {
        const file = await compressIfNeeded(rawFile);
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/admin/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error || `Không thể tải lên ${rawFile.name}`);
        }
        uploaded.push(data.url);
      }
      setImages((prev) => [...prev, ...uploaded]);
      setMsg(`✓ Đã tải lên ${uploaded.length} ảnh mới vào Bộ sưu tập. Nhớ bấm "Lưu thay đổi" ở cuối trang!`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function addFromUrl() {
    const raw = urlInput.trim();
    if (!raw) return;
    setErr("");
    setMsg("");
    if (raw.startsWith("/")) {
      setImages((prev) => [...prev, raw]);
      setUrlInput("");
      return;
    }
    if (!/^https?:\/\//i.test(raw)) {
      setErr("Đường dẫn ảnh phải bắt đầu bằng http://, https:// hoặc /.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: raw }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        setImages((prev) => [...prev, data.url!]);
      } else {
        setImages((prev) => [...prev, raw]);
      }
      setUrlInput("");
      setMsg("✓ Đã thêm ảnh từ URL vào Bộ sưu tập.");
    } catch {
      setImages((prev) => [...prev, raw]);
      setUrlInput("");
    } finally {
      setBusy(false);
    }
  }

  function removeAt(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setMsg("Đã gỡ ảnh khỏi Bộ sưu tập. Bấm 'Lưu thay đổi' để cập nhật.");
  }

  function moveAt(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  return (
    <div
      onPaste={(e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const files: File[] = [];
        for (const it of items) {
          if (it.type.startsWith("image/")) {
            const f = it.getAsFile();
            if (f) files.push(f);
          }
        }
        if (files.length > 0) {
          e.preventDefault();
          void uploadFiles(files);
        }
      }}
      className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-3"
    >
      {/* Synchronized hidden input submitted to saveProductAction */}
      <input type="hidden" name="gallery" value={images.join("\n")} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
        <div>
          <label className="text-sm font-bold text-gray-900">
            🖼️ Bộ sưu tập ảnh phụ (Gallery — {images.length} ảnh)
          </label>
          <p className="text-xs text-gray-500">
            Tải lên nhiều ảnh cùng lúc, dán trực tiếp (Ctrl+V), sắp xếp thứ tự hoặc bấm ✕ để xoá từng ảnh cũ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.length) void uploadFiles(e.target.files);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
          >
            {busy ? "⏳ Đang tải ảnh..." : "📤 + Tải lên ảnh phụ mới"}
          </button>
          {images.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Xoá toàn bộ ảnh phụ trong bộ sưu tập này?")) setImages([]);
              }}
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
            >
              🗑️ Xoá tất cả
            </button>
          )}
        </div>
      </div>

      {/* Add from URL */}
      <div className="flex flex-wrap gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Hoặc dán Link URL ảnh (https://... hoặc Google Drive) rồi bấm Thêm..."
          className="flex-1 min-w-[220px] rounded-xl border bg-white px-3 py-1.5 text-xs"
        />
        <button
          type="button"
          disabled={busy || !urlInput.trim()}
          onClick={addFromUrl}
          className="rounded-xl border border-brand bg-green-50 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-white disabled:opacity-40 cursor-pointer"
        >
          + Thêm URL
        </button>
      </div>

      {/* Image Grid with Delete / Reorder / AI */}
      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-xs text-gray-400">
          Chưa có ảnh phụ nào. Bấm <strong>📤 + Tải lên ảnh phụ mới</strong> hoặc dán ảnh (Ctrl+V) vào đây.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {images.map((imgUrl, idx) => (
            <div key={`${imgUrl}-${idx}`} className="group relative overflow-hidden rounded-xl border bg-white p-1.5 shadow-2xs">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl} alt={`Ảnh phụ ${idx + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  title="Xoá ảnh này"
                  className="absolute right-1 top-1 rounded-md bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow hover:bg-red-700 cursor-pointer"
                >
                  ✕ Xoá
                </button>
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  #{idx + 1}
                </span>
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px]">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveAt(idx, -1)}
                  title="Chuyển sang trái"
                  className="rounded border px-1.5 py-0.5 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                >
                  ⬅
                </button>
                <button
                  type="button"
                  onClick={() => setAiTargetIdx(idx)}
                  title="Tạo lại ảnh này bằng Gemini AI"
                  className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white cursor-pointer"
                >
                  🎨 AI
                </button>
                <button
                  type="button"
                  disabled={idx === images.length - 1}
                  onClick={() => moveAt(idx, 1)}
                  title="Chuyển sang phải"
                  className="rounded border px-1.5 py-0.5 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                >
                  ➡
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
        open={aiTargetIdx !== null}
        originalUrl={aiTargetIdx !== null ? images[aiTargetIdx] ?? "" : ""}
        contextTitle={productName}
        onClose={() => setAiTargetIdx(null)}
        onApply={(newUrl, _newName, syncedRows) => {
          if (aiTargetIdx !== null) {
            setImages((prev) => prev.map((u, i) => (i === aiTargetIdx ? newUrl : u)));
            setMsg(
              `✨ Đã thay ảnh phụ #${aiTargetIdx + 1} bằng Gemini AI${syncedRows > 0 ? ` (đã đồng bộ ${syncedRows} vị trí)` : ""}!`,
            );
          }
        }}
      />
    </div>
  );
}
