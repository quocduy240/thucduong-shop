"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { vnd } from "@/lib/site";

export type ShopBlockProduct = {
  id: number;
  name: string;
  slug: string;
  category_slug: string;
  category_name: string;
  price: number;
  sale_price: number | null;
  stock: number;
  image: string | null;
  sku: string;
  brand: string;
  unit: string;
  summary: string;
  rating_avg: number;
  rating_count: number;
};

const palette = ["#e8f5e9", "#fff3e0", "#e3f2fd", "#fce4ec", "#f3e5f5", "#e0f7fa"];

function ProdImg({ p, className = "" }: { p: ShopBlockProduct; className?: string }) {
  if (p.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={p.image} alt={p.name} className={`aspect-square w-full object-cover ${className}`} />
    );
  }
  return (
    <div
      className={`grid aspect-square place-items-center p-2 text-center text-xs font-semibold text-gray-600 ${className}`}
      style={{ background: palette[p.id % palette.length] }}
    >
      {p.name}
    </div>
  );
}

/**
 * Renders article HTML and enhances any inline [data-add-product-id] buttons
 * so readers can add inline-recommended products to cart with 1 click without leaving the article.
 */
export function ShoppableArticleBody({ html }: { html: string }) {
  const router = useRouter();
  const [toast, setToast] = useState("");

  async function onBodyClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest("[data-add-product-id]") as HTMLElement | null;
    if (!target) return;
    const pid = Number(target.getAttribute("data-add-product-id"));
    if (!pid) return;
    e.preventDefault();
    const res = await fetch(`/api/v2/add-to-cart/${pid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty: 1 }),
    });
    if (res.ok) {
      setToast("✓ Đã thêm sản phẩm trong bài viết vào giỏ hàng!");
      router.refresh();
      setTimeout(() => setToast(""), 4000);
    }
  }

  return (
    <div>
      {toast && (
        <div className="sticky top-16 z-30 mb-4 flex items-center justify-between rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-xs font-bold text-brand shadow-md">
          <span>{toast}</span>
          <Link href="/cart" className="underline">
            Xem giỏ hàng →
          </Link>
        </div>
      )}
      <div
        onClick={onBodyClick}
        className="prose-content mt-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/**
 * Block 1: Gói / Set Sản phẩm liên quan đến bài viết ("Frequently Bought Together" / "Shop The Post Set")
 */
export function ArticleProductSet({
  title,
  products,
}: {
  title: string;
  products: ShopBlockProduct[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>(() => products.map((p) => p.id));
  const [busy, setBusy] = useState(false);
  const [addedMsg, setAddedMsg] = useState("");

  if (products.length === 0) return null;

  const chosen = products.filter((p) => selectedIds.includes(p.id));
  const totalSetPrice = chosen.reduce((sum, p) => sum + (p.sale_price ?? p.price), 0);
  const originalSetPrice = chosen.reduce((sum, p) => sum + p.price, 0);
  const savedAmount = Math.max(0, originalSetPrice - totalSetPrice);

  function toggleItem(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function addSetToCart(buyNow: boolean) {
    if (chosen.length === 0 || busy) return;
    setBusy(true);
    setAddedMsg("");
    try {
      for (const p of chosen) {
        if ((p.sale_price ?? p.price) > 0 && p.stock > 0) {
          await fetch(`/api/v2/add-to-cart/${p.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qty: 1 }),
          });
        }
      }
      router.refresh();
      if (buyNow) {
        router.push("/cart");
        return;
      }
      setAddedMsg(`✓ Đã thêm trọn bộ ${chosen.length} sản phẩm vào giỏ hàng!`);
      setTimeout(() => setAddedMsg(""), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="my-8 overflow-hidden rounded-2xl border-2 border-brand/30 bg-gradient-to-br from-green-50/80 via-white to-emerald-50/50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-green-200/80 pb-3.5">
        <div>
          <span className="rounded-full bg-brand px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
            🎁 Gói Sản Phẩm Theo Bài Viết (Set Khuyên Dùng)
          </span>
          <h2 className="mt-1.5 text-lg font-bold text-gray-900">
            {title || "Combo Thực Dưỡng Kết Hợp Khuyên Dùng"}
          </h2>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Đã chọn {chosen.length} / {products.length} sản phẩm</div>
          <div className="text-xl font-extrabold text-accent">{vnd(totalSetPrice)}</div>
          {savedAmount > 0 && (
            <div className="text-[11px] font-semibold text-brand">
              Tiết kiệm {vnd(savedAmount)} so với giá gốc
            </div>
          )}
        </div>
      </div>

      {/* Visual Set Equation Row */}
      <div className="my-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        {products.map((p, idx) => {
          const checked = selectedIds.includes(p.id);
          return (
            <div key={p.id} className="flex items-center gap-2">
              {idx > 0 && <span className="text-lg font-bold text-brand">+</span>}
              <button
                type="button"
                onClick={() => toggleItem(p.id)}
                className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition ${
                  checked ? "border-brand shadow-sm" : "border-gray-200 opacity-40"
                }`}
                title={p.name}
              >
                <ProdImg p={p} />
                <span
                  className={`absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold ${
                    checked ? "bg-brand text-white" : "bg-gray-300 text-gray-600"
                  }`}
                >
                  ✓
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Individual Checkable Product Rows in Set */}
      <div className="space-y-2.5">
        {products.map((p) => {
          const checked = selectedIds.includes(p.id);
          const href = `/san-pham/${p.category_slug}/${p.slug}.html`;
          const effPrice = p.sale_price ?? p.price;
          return (
            <div
              key={p.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition ${
                checked ? "border-green-200 bg-white shadow-xs" : "border-gray-200 bg-gray-50/60 opacity-60"
              }`}
            >
              <label className="flex flex-1 cursor-pointer items-center gap-3 min-w-[200px]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleItem(p.id)}
                  className="h-4 w-4 accent-brand"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                    {p.brand && <span className="font-semibold text-brand">{p.brand}</span>}
                    {p.unit && <span>· {p.unit}</span>}
                  </div>
                  <Link href={href} className="line-clamp-1 text-sm font-bold text-gray-900 hover:text-brand">
                    {p.name}
                  </Link>
                </div>
              </label>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold text-accent">{effPrice ? vnd(effPrice) : "Liên hệ"}</div>
                  {p.sale_price && p.sale_price < p.price && (
                    <div className="text-[11px] text-gray-400 line-through">{vnd(p.price)}</div>
                  )}
                </div>
                <Link
                  href={href}
                  className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-brand hover:text-brand"
                >
                  Chi tiết
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Entire Set to Cart Action Bar */}
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          disabled={busy || chosen.length === 0}
          onClick={() => addSetToCart(false)}
          className="flex-1 rounded-xl border-2 border-brand bg-white py-2.5 text-xs font-bold text-brand transition hover:bg-brand hover:text-white disabled:opacity-50 sm:text-sm"
        >
          {busy ? "Đang thêm..." : `🛒 Thêm cả Gói (${chosen.length} sản phẩm) vào giỏ hàng`}
        </button>
        <button
          type="button"
          disabled={busy || chosen.length === 0}
          onClick={() => addSetToCart(true)}
          className="rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-white shadow transition hover:opacity-90 disabled:opacity-50 sm:text-sm"
        >
          ⚡ Mua ngay Gói này ({vnd(totalSetPrice)})
        </button>
      </div>

      {addedMsg && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-green-300 bg-green-100/70 px-3.5 py-2 text-xs font-bold text-brand">
          <span>{addedMsg}</span>
          <Link href="/cart" className="underline">
            Mở giỏ hàng →
          </Link>
        </div>
      )}
    </section>
  );
}

/**
 * Block 2: Sản phẩm được mua nhiều & Thường xuyên (Best-Sellers / Frequently Purchased)
 */
export function FrequentlyPurchasedBlock({
  title = "🔥 Sản phẩm được mua nhiều & Thường xuyên",
  subtitle = "Các sản phẩm thực dưỡng thiết yếu được khách hàng đặt mua định kỳ nhiều nhất",
  products,
}: {
  title?: string;
  subtitle?: string;
  products: ShopBlockProduct[];
}) {
  const router = useRouter();
  const [addedId, setAddedId] = useState<number | null>(null);

  if (products.length === 0) return null;

  async function quickAdd(p: ShopBlockProduct) {
    await fetch(`/api/v2/add-to-cart/${p.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty: 1 }),
    });
    setAddedId(p.id);
    router.refresh();
    setTimeout(() => setAddedId(null), 1800);
  }

  return (
    <section className="my-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b pb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 sm:text-lg">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <Link href="/san-pham/" className="text-xs font-semibold text-brand hover:underline">
          Xem tất cả sản phẩm »
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {products.map((p) => {
          const href = `/san-pham/${p.category_slug}/${p.slug}.html`;
          const effPrice = p.sale_price ?? p.price;
          const isAdded = addedId === p.id;
          return (
            <div
              key={p.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:border-brand/40 hover:shadow-md"
            >
              <Link href={href} className="relative block overflow-hidden">
                <ProdImg p={p} className="transition duration-300 group-hover:scale-105" />
                <span className="absolute left-2 top-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                  ★ Mua nhiều
                </span>
              </Link>
              <div className="flex flex-1 flex-col gap-1 p-3">
                {(p.brand || p.unit) && (
                  <div className="truncate text-[10px] text-gray-500">
                    <span className="font-semibold text-brand">{p.brand}</span>
                    {p.brand && p.unit ? " · " : ""}
                    {p.unit}
                  </div>
                )}
                <Link href={href} className="line-clamp-2 text-xs font-bold text-gray-900 group-hover:text-brand sm:text-sm">
                  {p.name}
                </Link>
                <div className="mt-auto flex items-center justify-between gap-1 pt-2">
                  <span className="text-xs font-extrabold text-accent sm:text-sm">
                    {effPrice ? vnd(effPrice) : "Liên hệ"}
                  </span>
                  {effPrice > 0 && p.stock > 0 && (
                    <button
                      type="button"
                      onClick={() => quickAdd(p)}
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                        isAdded
                          ? "bg-green-600 text-white"
                          : "bg-brand/10 text-brand hover:bg-brand hover:text-white"
                      }`}
                    >
                      {isAdded ? "✓ Đã thêm" : "+ Giỏ"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Block 3: Sidebar Cross-Sell Widget (Gợi ý kết hợp hiển thị dọc ở cột bên phải bài viết)
 */
export function CrossSellSidebarWidget({ products }: { products: ShopBlockProduct[] }) {
  const router = useRouter();
  const [addedId, setAddedId] = useState<number | null>(null);

  if (products.length === 0) return null;

  async function quickAdd(id: number) {
    await fetch(`/api/v2/add-to-cart/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty: 1 }),
    });
    setAddedId(id);
    router.refresh();
    setTimeout(() => setAddedId(null), 1800);
  }

  return (
    <div className="rounded-xl border border-green-200 bg-white p-4 shadow-sm">
      <div className="mb-3 border-b pb-2">
        <div className="text-xs font-bold uppercase tracking-wider text-brand">
          🔄 Sản phẩm Gợi ý Kết hợp
        </div>
        <p className="text-[11px] text-gray-500">Thường được mua kèm khi áp dụng thực dưỡng</p>
      </div>
      <div className="space-y-3">
        {products.map((p) => {
          const href = `/san-pham/${p.category_slug}/${p.slug}.html`;
          const effPrice = p.sale_price ?? p.price;
          const isAdded = addedId === p.id;
          return (
            <div key={p.id} className="flex items-start gap-2.5 rounded-lg border border-gray-100 p-2 hover:bg-green-50/40">
              <Link href={href} className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border">
                <ProdImg p={p} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={href} className="line-clamp-2 text-xs font-bold text-gray-800 hover:text-brand">
                  {p.name}
                </Link>
                <div className="mt-1 flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-accent">
                    {effPrice ? vnd(effPrice) : "Liên hệ"}
                  </span>
                  {effPrice > 0 && p.stock > 0 && (
                    <button
                      type="button"
                      onClick={() => quickAdd(p.id)}
                      className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                        isAdded
                          ? "bg-green-600 text-white"
                          : "bg-brand text-white hover:bg-brand-dark"
                      }`}
                    >
                      {isAdded ? "✓ Đã thêm" : "+ Mua"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
