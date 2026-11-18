"use client";

import { useState } from "react";

const palette = ["#e8f5e9", "#fff3e0", "#e3f2fd", "#fce4ec", "#f3e5f5", "#e0f7fa"];

function GalleryThumb({
  label,
  seed,
  image,
  className = "",
}: {
  label: string;
  seed: number;
  image?: string | null;
  className?: string;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={label} className={`aspect-square w-full object-cover ${className}`} />
    );
  }
  return (
    <div
      className={`grid aspect-square place-items-center p-4 text-center text-sm font-semibold text-gray-600 ${className}`}
      style={{ background: palette[seed % palette.length] }}
    >
      {label}
    </div>
  );
}

export default function ProductGallery({
  name,
  seed,
  image,
  gallery,
  discountPct,
  outOfStock,
}: {
  name: string;
  seed: number;
  image: string | null;
  gallery: string;
  discountPct: number;
  outOfStock: boolean;
}) {
  const extraImages = (gallery || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const allImages = [image, ...extraImages].filter((x): x is string => Boolean(x));
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const activeImage = allImages[activeIdx] ?? image ?? null;

  return (
    <div>
      <div
        onClick={() => activeImage && setLightbox(true)}
        className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${
          activeImage ? "cursor-zoom-in" : ""
        }`}
      >
        <GalleryThumb label={name} seed={seed} image={activeImage} className="rounded-xl" />

        {discountPct > 0 && (
          <span className="absolute left-3 top-3 rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-white shadow">
            -{discountPct}%
          </span>
        )}
        {outOfStock && (
          <span className="absolute right-3 top-3 rounded-lg bg-gray-900/80 px-2.5 py-1 text-xs font-semibold text-white">
            Hết hàng
          </span>
        )}
        {activeImage && (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
            🔍 Phóng to
          </span>
        )}
      </div>

      {allImages.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {allImages.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                idx === activeIdx ? "border-brand ring-2 ring-brand/20" : "border-gray-200 opacity-75 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl} alt={`${name} - ảnh ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && activeImage && (
        <div
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="relative max-h-[90vh] max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-lg font-bold text-gray-800 shadow-lg hover:bg-gray-100"
              aria-label="Đóng"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeImage} alt={name} className="max-h-[85vh] w-auto rounded-xl object-contain shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
