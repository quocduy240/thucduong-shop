"use client";

import { useMemo, useState } from "react";
import { createPosOrderAction } from "@/app/admin/actions";
import { vnd } from "@/lib/site";

export type PosProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  sale_price: number | null;
  stock: number;
  category_name: string;
};

export default function AdminPosClient({ products }: { products: PosProduct[] }) {
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<{ product: PosProduct; qty: number }[]>([]);
  const [discount, setDiscount] = useState(0);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 40);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.sku.toLowerCase().includes(s) ||
          p.category_name.toLowerCase().includes(s),
      )
      .slice(0, 40);
  }, [products, q]);

  function addItem(p: PosProduct) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === p.id);
      if (idx >= 0) {
        return prev.map((i, k) => (k === idx ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function setQty(id: number, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== id));
    } else {
      setCart((prev) => prev.map((i) => (i.product.id === id ? { ...i, qty } : i)));
    }
  }

  const subtotal = cart.reduce((acc, i) => acc + (i.product.sale_price ?? i.product.price) * i.qty, 0);
  const total = Math.max(0, subtotal - discount);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Left: Product Search & Grid */}
      <div className="lg:col-span-7 space-y-3">
        <div className="rounded-2xl border bg-white p-3 shadow-xs">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 Tìm nhanh theo tên sản phẩm, mã SKU hoặc danh mục..."
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {filtered.map((p) => {
            const price = p.sale_price ?? p.price;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => addItem(p)}
                className="flex flex-col justify-between rounded-xl border bg-white p-3 text-left transition hover:border-brand hover:bg-green-50/40 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
                    <span className="font-mono">{p.sku || `#${p.id}`}</span>
                    <span className={p.stock > 0 ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>
                      Tồn: {p.stock}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-bold text-gray-900 line-clamp-2">{p.name}</div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-accent">{vnd(price)}</span>
                  <span className="rounded-lg bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">+ Thêm</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-2 rounded-xl border bg-white p-8 text-center text-sm text-gray-500">
              Không tìm thấy sản phẩm phù hợp.
            </div>
          )}
        </div>
      </div>

      {/* Right: Active POS Bill */}
      <form action={createPosOrderAction} className="lg:col-span-5 rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm space-y-4 h-fit sticky top-4">
        <input type="hidden" name="items_json" value={JSON.stringify(cart.map((c) => ({ id: c.product.id, qty: c.qty })))} />
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-base font-extrabold text-brand">🧾 Hoá đơn bán hàng ({cart.length} món)</h2>
          {cart.length > 0 && (
            <button type="button" onClick={() => setCart([])} className="text-xs text-red-600 hover:underline cursor-pointer">
              Xoá giỏ
            </button>
          )}
        </div>

        {/* Cart Items */}
        {cart.length > 0 ? (
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {cart.map((c) => {
              const unit = c.product.sale_price ?? c.product.price;
              return (
                <div key={c.product.id} className="flex items-center justify-between gap-2 rounded-xl border bg-gray-50/70 p-2.5 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-900 truncate">{c.product.name}</div>
                    <div className="text-[11px] text-gray-500">{vnd(unit)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQty(c.product.id, c.qty - 1)}
                      className="h-6 w-6 rounded border bg-white font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold">{c.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(c.product.id, c.qty + 1)}
                      className="h-6 w-6 rounded border bg-white font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-20 text-right font-extrabold text-gray-900">{vnd(unit * c.qty)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center text-xs text-gray-400">
            Bấm vào sản phẩm bên trái để thêm vào hoá đơn.
          </div>
        )}

        {/* Customer Info */}
        <div className="grid gap-2.5 border-t pt-3 sm:grid-cols-2">
          <input
            name="name"
            placeholder="Tên khách (VD: Anh Minh / Khách lẻ)"
            className="rounded-xl border px-3 py-2 text-xs outline-none focus:border-brand"
          />
          <input
            name="phone"
            placeholder="Số điện thoại"
            className="rounded-xl border px-3 py-2 text-xs outline-none focus:border-brand"
          />
          <input
            name="address"
            placeholder="Địa chỉ giao hàng (nếu giao tận nơi)"
            className="sm:col-span-2 rounded-xl border px-3 py-2 text-xs outline-none focus:border-brand"
          />
          <select name="payment" className="rounded-xl border px-3 py-2 text-xs outline-none focus:border-brand">
            <option value="cash">💵 Tiền mặt (Hoàn thành ngay)</option>
            <option value="bank">🏦 Chuyển khoản NH (Hoàn thành ngay)</option>
            <option value="kiotviet">🔗 Theo KiotViet (Hoàn thành ngay)</option>
            <option value="cod">🚚 Giao hàng thu hộ (COD)</option>
          </select>
          <input
            name="discount"
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
            placeholder="Giảm giá (VNĐ)"
            className="rounded-xl border px-3 py-2 text-xs outline-none focus:border-brand"
          />
          <input
            name="note"
            placeholder="Ghi chú đơn hàng..."
            className="sm:col-span-2 rounded-xl border px-3 py-2 text-xs outline-none focus:border-brand"
          />
        </div>

        {/* Totals */}
        <div className="space-y-1 border-t pt-3 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Tạm tính:</span>
            <span className="font-semibold">{vnd(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Giảm giá:</span>
              <span className="font-semibold">-{vnd(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-gray-900 pt-1">
            <span>Khách phải trả:</span>
            <span className="text-accent">{vnd(total)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={cart.length === 0}
          className="w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
        >
          💾 Tạo Đơn Hàng &amp; Trừ Kho Ngay
        </button>
      </form>
    </div>
  );
}
