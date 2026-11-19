"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { vnd } from "@/lib/site";

type CartSummaryData = {
  count: number;
  subtotal: number;
  freeshipThreshold: number;
  items: {
    id: number;
    name: string;
    image: string | null;
    unitPrice: number;
    qty: number;
    lineTotal: number;
    href: string;
  }[];
  suggestions: {
    id: number;
    name: string;
    image: string | null;
    price: number;
  }[];
};

export default function MiniCartDrawer() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CartSummaryData | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v2/cart-summary", { credentials: "same-origin" });
      if (res.ok) setData(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    function onOpenCart() {
      setOpen(true);
      load();
    }
    window.addEventListener("td:open-cart", onOpenCart);
    return () => window.removeEventListener("td:open-cart", onOpenCart);
  }, [load]);

  async function addSuggestion(productId: number) {
    setAddingId(productId);
    try {
      await fetch(`/api/v2/add-to-cart/${productId}?quantity=1`, { method: "POST" });
      window.dispatchEvent(new Event("td:cart-updated"));
      await load();
    } finally {
      setAddingId(null);
    }
  }

  if (!open) return null;

  const subtotal = data?.subtotal ?? 0;
  const threshold = data?.freeshipThreshold ?? 500000;
  const remaining = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[100] flex justify-end bg-black/45 backdrop-blur-xs print:hidden"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-3.5">
          <div className="font-extrabold text-gray-900">
            🛒 Giỏ hàng của bạn ({data?.count ?? 0})
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Freeship Progress Bar */}
        <div className="border-b bg-emerald-50/70 px-4 py-3 text-xs">
          {remaining === 0 ? (
            <div className="font-bold text-emerald-800">
              🎉 Chúc mừng! Đơn hàng của bạn đã đủ điều kiện <strong>Miễn phí vận chuyển</strong>!
            </div>
          ) : (
            <div className="text-gray-700">
              Mua thêm <strong className="text-accent">{vnd(remaining)}</strong> để được{" "}
              <strong className="text-brand">Miễn phí vận chuyển</strong>
            </div>
          )}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-200/70">
            <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!data ? (
            <div className="py-10 text-center text-xs text-gray-400">Đang tải giỏ hàng...</div>
          ) : data.items.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">Giỏ hàng đang trống.</div>
          ) : (
            data.items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-2.5">
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image} alt={it.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-emerald-50 text-lg">🌿</div>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={it.href} onClick={() => setOpen(false)} className="line-clamp-2 text-xs font-bold text-gray-900 hover:text-brand">
                    {it.name}
                  </Link>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {vnd(it.unitPrice)} × {it.qty}
                    </span>
                    <span className="font-bold text-accent">{vnd(it.lineTotal)}</span>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Cross-sell suggestions */}
          {data && data.suggestions.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-gray-500">
                ✨ Thường được mua kèm
              </div>
              <div className="space-y-2">
                {data.suggestions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/70 p-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {s.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.image} alt={s.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50">🌿</div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-gray-800">{s.name}</div>
                        <div className="text-[11px] font-bold text-accent">{vnd(s.price)}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={addingId === s.id}
                      onClick={() => addSuggestion(s.id)}
                      className="shrink-0 cursor-pointer rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                    >
                      {addingId === s.id ? "..." : "+ Thêm"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="border-t bg-gray-50 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-600">Tạm tính:</span>
            <span className="text-lg font-extrabold text-accent">{vnd(subtotal)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-brand bg-white py-2.5 text-center text-xs font-bold text-brand hover:bg-emerald-50"
            >
              Xem giỏ hàng
            </Link>
            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-brand py-2.5 text-center text-xs font-bold text-white shadow hover:bg-brand-dark"
            >
              Thanh toán ngay →
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
