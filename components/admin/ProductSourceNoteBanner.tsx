"use client";

import Link from "next/link";
import { useState } from "react";

export default function ProductSourceNoteBanner({
  productId,
  sourceUrl,
  sourceNote,
}: {
  productId: number;
  sourceUrl?: string | null;
  sourceNote?: string | null;
}) {
  const [cleared, setCleared] = useState(false);
  const [busy, setBusy] = useState(false);

  if (cleared || (!sourceUrl && !sourceNote)) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-950">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="font-extrabold">📌 Ghi chú nguồn tham khảo (chỉ hiển thị trong Admin)</div>
        {sourceNote && <div className="text-amber-900">{sourceNote}</div>}
        {sourceUrl && (
          <div className="truncate font-mono text-[11px] text-gray-600">{sourceUrl}</div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/admin/products/import/"
          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-900 hover:bg-amber-100"
        >
          🤖 Làm sạch tự động / Lịch sử
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!confirm("Xoá ghi chú & link nguồn khỏi sản phẩm này?")) return;
            setBusy(true);
            try {
              const res = await fetch("/api/admin/product-import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "clear_source", product_id: productId }),
              });
              if (res.ok) setCleared(true);
            } finally {
              setBusy(false);
            }
          }}
          className="cursor-pointer rounded-lg bg-amber-700 px-3 py-1.5 font-bold text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {busy ? "Đang xoá..." : "🧹 Xoá dấu vết nguồn"}
        </button>
      </div>
    </div>
  );
}
