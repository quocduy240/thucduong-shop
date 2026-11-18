"use client";

import { useState } from "react";

export type QrBadgeItem = {
  id: number;
  slug: string;
  name: string;
  caption: string;
};

export default function QrCornerBadge({
  items,
  label = "Quét mã QR",
  compact = false,
}: {
  items: QrBadgeItem[];
  label?: string;
  compact?: boolean;
}) {
  const [openQr, setOpenQr] = useState<QrBadgeItem | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {items.map((qr) => (
          <button
            key={qr.id}
            type="button"
            onClick={() => setOpenQr(qr)}
            className={`group inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white/95 shadow-sm transition hover:border-brand hover:bg-green-50 cursor-pointer ${
              compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
            }`}
            title={`Bấm để phóng to mã QR: ${qr.name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr/${encodeURIComponent(qr.slug)}`}
              alt={qr.name}
              className={compact ? "h-6 w-6 rounded" : "h-8 w-8 rounded border border-gray-200"}
            />
            <div className="text-left leading-tight">
              <div className="font-bold text-brand">{qr.name}</div>
              <div className="text-[10px] text-gray-500">{label} (Bấm phóng to)</div>
            </div>
          </button>
        ))}
      </div>

      {openQr && (
        <div
          onClick={() => setOpenQr(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
              <div className="text-sm font-bold">📱 {openQr.name}</div>
              <button
                type="button"
                onClick={() => setOpenQr(null)}
                className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-xs font-bold text-white hover:bg-white/30 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-6 text-center space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr/${encodeURIComponent(openQr.slug)}`}
                alt={openQr.name}
                className="mx-auto h-56 w-56 rounded-xl border p-2 shadow-xs"
              />
              {openQr.caption && <p className="text-xs text-gray-600">{openQr.caption}</p>}
              <div className="flex items-center justify-center gap-2 pt-1">
                <a
                  href={`/q/${encodeURIComponent(openQr.slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark"
                >
                  🔗 Mở liên kết ngay ↗
                </a>
                <a
                  href={`/api/qr/${encodeURIComponent(openQr.slug)}?download=1`}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  📥 Tải QR (.svg)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
