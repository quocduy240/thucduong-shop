"use client";

import Link from "next/link";
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
      <div className="mt-5">
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          Sản phẩm hiện đang tạm hết hàng. Vui lòng quay lại sau hoặc liên hệ cửa hàng để đặt trước.
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
      window.dispatchEvent(new Event("td:cart-updated"));
      window.dispatchEvent(new Event("td:open-cart"));
      router.refresh(); // updates header cart badge
    });

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Số lượng:</span>
        <div className="flex items-center rounded-lg border border-gray-300 bg-white">
          <button
            type="button"
            className="px-3 py-1.5 text-lg font-medium text-gray-600 hover:bg-gray-100"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={maxQty}
            value={qty}
            onChange={(e) => setQty(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
            className="w-14 border-x border-gray-300 py-1.5 text-center text-sm font-semibold outline-none"
          />
          <button
            type="button"
            className="px-3 py-1.5 text-lg font-medium text-gray-600 hover:bg-gray-100"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
          >
            +
          </button>
        </div>
        <span className="text-xs text-gray-500">({stock} sản phẩm có sẵn)</span>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          disabled={pending}
          onClick={() => add(false)}
          className="flex-1 rounded-xl border-2 border-brand bg-green-50/40 px-4 py-3 text-sm font-bold text-brand transition hover:bg-brand hover:text-white disabled:opacity-50"
        >
          🛒 Thêm vào giỏ hàng
        </button>
        <button
          disabled={pending}
          onClick={() => add(true)}
          className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          ⚡ Mua ngay
        </button>
      </div>

      {msg && (
        <div
          className={`mt-3 flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm ${
            isErr ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-brand"
          }`}
        >
          <span className="font-medium">{isErr ? `⚠️ ${msg}` : `✓ ${msg}`}</span>
          {!isErr && (
            <Link href="/cart" className="font-semibold underline hover:opacity-80">
              Xem giỏ hàng →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
