"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** "Thêm giỏ hàng" / "Mua ngay" - POST /api/v2/add-to-cart/{id} like the reference site. */
export default function AddToCart({ productId, stock }: { productId: number; stock: number }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState("");
  const [isErr, setIsErr] = useState(false);
  const [pending, start] = useTransition();

  if (stock <= 0) {
    return (
      <div className="mt-6">
        <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          Sản phẩm hiện đang tạm hết hàng. Vui lòng quay lại sau hoặc liên hệ cửa hàng.
        </p>
      </div>
    );
  }

  const maxQty = Math.min(stock, 999);

  const add = (buyNow: boolean) =>
    start(async () => {
      setMsg("");
      setIsErr(false);
      const res = await fetch(`/api/v2/add-to-cart/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setIsErr(true);
        return setMsg(data.error ?? "Không thêm được sản phẩm.");
      }
      if (buyNow) return router.push("/cart");
      setMsg("Đã thêm vào giỏ hàng!");
      router.refresh(); // updates header cart badge
    });

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className="text-sm">Số lượng</span>
        <div className="flex items-center rounded border">
          <button type="button" className="px-3 py-1" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <input
            type="number"
            min={1}
            max={maxQty}
            value={qty}
            onChange={(e) => setQty(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
            className="w-14 border-x py-1 text-center outline-none"
          />
          <button type="button" className="px-3 py-1" onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>+</button>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          disabled={pending}
          onClick={() => add(false)}
          className="flex-1 rounded-lg border-2 border-brand px-4 py-3 font-semibold text-brand hover:bg-green-50 disabled:opacity-50"
        >
          Thêm giỏ hàng
        </button>
        <button
          disabled={pending}
          onClick={() => add(true)}
          className="flex-1 rounded-lg bg-accent px-4 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          Mua ngay
        </button>
      </div>
      {msg && <p className={`mt-2 text-sm ${isErr ? "text-red-600" : "text-brand"}`}>{msg}</p>}
    </div>
  );
}
