"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function QuickAddButton({
  productId,
  price,
  stock,
}: {
  productId: number;
  price: number;
  stock: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  if (!price) {
    return (
      <span className="rounded-lg border border-brand/30 bg-green-50/60 px-2.5 py-1 text-xs font-medium text-brand">
        Liên hệ
      </span>
    );
  }

  if (stock <= 0) {
    return (
      <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-400">
        Hết hàng
      </span>
    );
  }

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/v2/add-to-cart/${productId}?quantity=1`, { method: "POST" });
      setAdded(true);
      router.refresh();
      setTimeout(() => setAdded(false), 1800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={busy}
      title="Thêm nhanh vào giỏ hàng"
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
        added
          ? "bg-green-600 text-white"
          : "bg-brand/10 text-brand hover:bg-brand hover:text-white"
      } disabled:opacity-50`}
    >
      {added ? "✓ Đã thêm" : busy ? "..." : "+ Giỏ hàng"}
    </button>
  );
}
