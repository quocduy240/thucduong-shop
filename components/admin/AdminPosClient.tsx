"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type PosBillTab = {
  id: string;
  label: string;
  cart: { product: PosProduct; qty: number }[];
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  payment: "cash" | "bank" | "kiotviet" | "cod";
  discount: number;
  note: string;
};

function createEmptyTab(index: number): PosBillTab {
  return {
    id: `bill-${Date.now()}-${index}`,
    label: `Hóa đơn ${index}`,
    cart: [],
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    payment: "cash",
    discount: 0,
    note: "",
  };
}

export default function AdminPosClient({ products }: { products: PosProduct[] }) {
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tabs, setTabs] = useState<PosBillTab[]>(() => [createEmptyTab(1), createEmptyTab(2)]);
  const [activeTabId, setActiveTabId] = useState<string>(() => "");
  const [scanNotice, setScanNotice] = useState<string>("");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const currentTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  }, [tabs, activeTabId]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category_name).filter(Boolean)));
  }, [products]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products
      .filter((p) => {
        if (categoryFilter && p.category_name !== categoryFilter) return false;
        if (!s) return true;
        return (
          p.name.toLowerCase().includes(s) ||
          p.sku.toLowerCase().includes(s) ||
          String(p.id) === s ||
          p.category_name.toLowerCase().includes(s)
        );
      })
      .slice(0, 40);
  }, [products, q, categoryFilter]);

  function updateCurrentTab(updater: (tab: PosBillTab) => PosBillTab) {
    setTabs((prev) =>
      prev.map((t) => (t.id === currentTab.id ? updater(t) : t)),
    );
  }

  function addItem(p: PosProduct) {
    updateCurrentTab((tab) => {
      const idx = tab.cart.findIndex((i) => i.product.id === p.id);
      const nextCart =
        idx >= 0
          ? tab.cart.map((i, k) => (k === idx ? { ...i, qty: i.qty + 1 } : i))
          : [...tab.cart, { product: p, qty: 1 }];
      return { ...tab, cart: nextCart };
    });
  }

  function setQty(id: number, qty: number) {
    updateCurrentTab((tab) => ({
      ...tab,
      cart:
        qty <= 0
          ? tab.cart.filter((i) => i.product.id !== id)
          : tab.cart.map((i) => (i.product.id === id ? { ...i, qty } : i)),
    }));
  }

  function addNewBillTab() {
    const nextIdx = tabs.length + 1;
    const newTab = createEmptyTab(nextIdx);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }

  function closeBillTab(id: string) {
    if (tabs.length <= 1) return;
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (currentTab.id === id) {
      setActiveTabId(next[0].id);
    }
  }

  // Handle Barcode / SKU Scanner Enter key
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const clean = q.trim().toLowerCase();
    if (!clean) return;
    e.preventDefault();

    const exactSku = products.find(
      (p) => p.sku.toLowerCase() === clean || String(p.id) === clean,
    );
    const match = exactSku ?? (filtered.length === 1 ? filtered[0] : null);
    if (match) {
      addItem(match);
      setQ("");
      setScanNotice(`✓ Đã quét thêm: ${match.name}`);
      setTimeout(() => setScanNotice(""), 2200);
    }
  }

  // Keyboard shortcuts: F2 (Search/Barcode), F4 (Customer Name), F9 (Submit Order)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        customerInputRef.current?.focus();
      } else if (e.key === "F9") {
        e.preventDefault();
        if (currentTab.cart.length > 0) {
          formRef.current?.requestSubmit();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentTab.cart.length]);

  const subtotal = currentTab.cart.reduce(
    (acc, i) => acc + (i.product.sale_price ?? i.product.price) * i.qty,
    0,
  );
  const total = Math.max(0, subtotal - currentTab.discount);

  return (
    <div className="space-y-3">
      {/* Top KiotViet POS Multi-Bill Tabs & Keyboard Shortcuts Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-white px-4 py-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((t) => {
            const isActive = t.id === currentTab.id;
            const count = t.cart.reduce((s, i) => s + i.qty, 0);
            return (
              <div
                key={t.id}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  isActive
                    ? "border-brand bg-brand text-white shadow-2xs"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:border-brand"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveTabId(t.id)}
                  className="cursor-pointer"
                >
                  🧾 {t.label} {count > 0 && `(${count})`}
                </button>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => closeBillTab(t.id)}
                    title="Đóng hóa đơn chờ này"
                    className={`ml-1 rounded-full px-1 text-[10px] cursor-pointer ${
                      isActive ? "hover:bg-white/20 text-white" : "hover:bg-gray-200 text-gray-500"
                    }`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={addNewBillTab}
            className="rounded-xl border border-dashed border-brand/50 bg-emerald-50/50 px-3 py-1.5 text-xs font-bold text-brand hover:bg-emerald-50 cursor-pointer"
          >
            + Thêm HĐ chờ
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-500">
          <span className="rounded bg-gray-100 px-2 py-0.5 font-mono font-semibold text-gray-700">
            F2: Quét mã / Tìm SP
          </span>
          <span className="rounded bg-gray-100 px-2 py-0.5 font-mono font-semibold text-gray-700">
            F4: Khách hàng
          </span>
          <span className="rounded bg-gray-100 px-2 py-0.5 font-mono font-semibold text-gray-700">
            F9: Thanh toán
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left: Product Search, Barcode Scanner & Category Pills */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-2xl border bg-white p-3 shadow-xs space-y-2.5">
            <div className="relative">
              <input
                ref={searchInputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="🔍 [F2] Quét mã vạch / Nhập SKU rồi nhấn Enter hoặc tìm theo tên sản phẩm..."
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
              />
              {scanNotice && (
                <span className="absolute right-3 top-2.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  {scanNotice}
                </span>
              )}
            </div>

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                    !categoryFilter
                      ? "bg-brand text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Tất cả ({products.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat === categoryFilter ? "" : cat)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                      categoryFilter === cat
                        ? "bg-brand text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
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
        <form
          ref={formRef}
          action={createPosOrderAction}
          className="lg:col-span-5 rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm space-y-4 h-fit sticky top-4"
        >
          <input
            type="hidden"
            name="items_json"
            value={JSON.stringify(currentTab.cart.map((c) => ({ id: c.product.id, qty: c.qty })))}
          />
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-extrabold text-brand">
              🧾 {currentTab.label} ({currentTab.cart.length} món)
            </h2>
            {currentTab.cart.length > 0 && (
              <button
                type="button"
                onClick={() => updateCurrentTab((t) => ({ ...t, cart: [] }))}
                className="text-xs text-red-600 hover:underline cursor-pointer"
              >
                Xoá giỏ
              </button>
            )}
          </div>

          {/* Cart Items */}
          {currentTab.cart.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {currentTab.cart.map((c) => {
                const unit = c.product.sale_price ?? c.product.price;
                return (
                  <div
                    key={c.product.id}
                    className="flex items-center justify-between gap-2 rounded-xl border bg-gray-50/70 p-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-900 truncate">{c.product.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {c.product.sku ? `[${c.product.sku}] · ` : ""}
                        {vnd(unit)}
                      </div>
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
                    <div className="w-20 text-right font-extrabold text-gray-900">
                      {vnd(unit * c.qty)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-xs text-gray-400">
              Quét mã vạch hoặc bấm vào sản phẩm bên trái để thêm vào {currentTab.label}.
            </div>
          )}

          {/* Customer Info */}
          <div className="grid gap-2.5 border-t pt-3 sm:grid-cols-2">
            <input
              ref={customerInputRef}
              name="name"
              value={currentTab.customerName}
              onChange={(e) =>
                updateCurrentTab((t) => ({ ...t, customerName: e.target.value }))
              }
              placeholder="[F4] Tên khách (VD: Anh Minh / Khách lẻ)"
              className="rounded-xl border px-3 py-2 text-xs outline-none focus:border-brand"
            />
            <input
              name="phone"
              value={currentTab.customerPhone}
              onChange={(e) =>
                updateCurrentTab((t) => ({ ...t, customerPhone: e.target.value }))
              }
              placeholder="Số điện thoại"
              className="rounded-xl border px-3 py-2 text-xs outline-none focus:border-brand"
            />
            <input
              name="address"
              value={currentTab.customerAddress}
              onChange={(e) =>
                updateCurrentTab((t) => ({ ...t, customerAddress: e.target.value }))
              }
              placeholder="Địa chỉ giao hàng (nếu giao tận nơi)"
              className="sm:col-span-2 rounded-xl border px-3 py-2 text-xs outline-none focus:border-brand"
            />
            <select
              name="payment"
              value={currentTab.payment}
              onChange={(e) =>
                updateCurrentTab((t) => ({
                  ...t,
                  payment: e.target.value as PosBillTab["payment"],
                }))
              }
              className="rounded-xl border px-3 py-2 text-xs outline-none focus:border-brand"
            >
              <option value="cash">💵 Tiền mặt (Hoàn thành ngay)</option>
              <option value="bank">🏦 Chuyển khoản NH (Hoàn thành ngay)</option>
              <option value="kiotviet">🔗 Theo KiotViet (Hoàn thành ngay)</option>
              <option value="cod">🚚 Giao hàng thu hộ (COD)</option>
            </select>
            <input
              name="discount"
              type="number"
              min={0}
              value={currentTab.discount}
              onChange={(e) =>
                updateCurrentTab((t) => ({
                  ...t,
                  discount: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              placeholder="Giảm giá (VNĐ)"
              className="rounded-xl border px-3 py-2 text-xs outline-none focus:border-brand"
            />
            <input
              name="note"
              value={currentTab.note}
              onChange={(e) =>
                updateCurrentTab((t) => ({ ...t, note: e.target.value }))
              }
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
            {currentTab.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Giảm giá:</span>
                <span className="font-semibold">-{vnd(currentTab.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-gray-900 pt-1">
              <span>Khách phải trả:</span>
              <span className="text-accent">{vnd(total)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={currentTab.cart.length === 0}
            className="w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
          >
            💾 [F9] Thanh Toán &amp; Mở Bản In Hóa Đơn A5 Ngay
          </button>
        </form>
      </div>
    </div>
  );
}
