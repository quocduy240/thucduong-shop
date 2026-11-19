"use client";

import { useState } from "react";
import { vnd } from "@/lib/site";

type LookupResult = {
  order: {
    code: string;
    name: string;
    phone: string;
    payment: string;
    total: number;
    discount_amount: number;
    coupon_code: string;
    status: string;
    created_at: string;
    estimatedPoints: number;
  };
  items: { name: string; price: number; qty: number }[];
};

const STEPS = [
  { key: "new", label: "Đã tiếp nhận", icon: "📝" },
  { key: "confirmed", label: "Đã xác nhận", icon: "✅" },
  { key: "shipping", label: "Đang giao hàng", icon: "🚚" },
  { key: "done", label: "Hoàn thành", icon: "🎉" },
];

export default function OrderLookupClient({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Không tìm thấy đơn hàng.");
      } else {
        setResult(data);
      }
    } finally {
      setBusy(false);
    }
  }

  const activeStep = result
    ? STEPS.findIndex((s) => s.key === result.order.status)
    : -1;

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">Mã đơn hàng *</label>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="VD: TD2025001"
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-mono uppercase outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">Số điện thoại đặt hàng *</label>
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="VD: 0912345678"
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="w-full cursor-pointer rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? "Đang tra..." : "🔍 Tra cứu"}
          </button>
        </div>
      </form>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {err}
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <div className="text-xs text-gray-500">Đơn hàng</div>
              <div className="text-xl font-extrabold text-brand font-mono">{result.order.code}</div>
              <div className="text-xs text-gray-500">
                Khách: <strong>{result.order.name}</strong> ({result.order.phone}) · Đặt lúc {result.order.created_at.slice(0, 16)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Tổng thanh toán</div>
              <div className="text-2xl font-extrabold text-accent">{vnd(result.order.total)}</div>
              {result.order.estimatedPoints > 0 && result.order.status !== "cancelled" && (
                <div className="mt-1 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                  🎁 {result.order.status === "done" ? "Đã cộng" : "Dự kiến cộng"} ~{result.order.estimatedPoints} điểm thưởng
                </div>
              )}
            </div>
          </div>

          {result.order.status === "cancelled" ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              ❌ Đơn hàng này đã bị huỷ.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STEPS.map((st, idx) => {
                const passed = idx <= activeStep;
                return (
                  <div
                    key={st.key}
                    className={`rounded-xl border p-3 text-center transition ${
                      passed
                        ? "border-brand bg-emerald-50 text-brand shadow-2xs"
                        : "border-gray-200 bg-gray-50 text-gray-400"
                    }`}
                  >
                    <div className="text-xl">{st.icon}</div>
                    <div className="mt-1 text-xs font-bold">{st.label}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-bold text-gray-900">Chi tiết sản phẩm</h3>
            <div className="divide-y rounded-xl border bg-gray-50/50">
              {result.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{it.name}</span>
                    <span className="ml-2 text-xs text-gray-500">× {it.qty}</span>
                  </div>
                  <div className="font-bold text-gray-800">{vnd(it.price * it.qty)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
