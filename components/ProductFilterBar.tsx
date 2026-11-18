"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Facets = {
  brands: { brand: string; count: number }[];
  origins: { origin: string; count: number }[];
};

const PRICE_RANGES = [
  { value: "", label: "Tất cả mức giá" },
  { value: "under-100", label: "Dưới 100.000₫" },
  { value: "100-300", label: "100.000₫ – 300.000₫" },
  { value: "300-500", label: "300.000₫ – 500.000₫" },
  { value: "over-500", label: "Trên 500.000₫" },
];

const SORT_OPTIONS = [
  { value: "featured", label: "Nổi bật nhất" },
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá: Thấp → Cao" },
  { value: "price-desc", label: "Giá: Cao → Thấp" },
  { value: "discount", label: "Khuyến mãi nhiều nhất" },
];

export default function ProductFilterBar({
  facets,
  totalCount,
}: {
  facets: Facets;
  totalCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const q = sp.get("q") ?? "";
  const brand = sp.get("brand") ?? "";
  const origin = sp.get("origin") ?? "";
  const priceRange = sp.get("price") ?? "";
  const onSale = sp.get("sale") === "1";
  const inStock = sp.get("stock") === "1";
  const sort = sp.get("sort") ?? "featured";

  const [keyword, setKeyword] = useState(q);

  function updateParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAll() {
    setKeyword("");
    router.push(pathname);
  }

  const hasActiveFilter = Boolean(q || brand || origin || priceRange || onSale || inStock || (sort && sort !== "featured"));

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Row 1: Search within products + Sort + Quick Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateParams({ q: keyword.trim() || null });
          }}
          className="flex flex-1 items-center gap-2 min-w-[220px]"
        >
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên SP, mã SKU, thương hiệu..."
            className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Lọc
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => updateParams({ sale: onSale ? null : "1" })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              onSale
                ? "border-accent bg-accent text-white"
                : "border-gray-300 bg-gray-50 text-gray-700 hover:border-accent hover:text-accent"
            }`}
          >
            🔥 Đang giảm giá
          </button>
          <button
            type="button"
            onClick={() => updateParams({ stock: inStock ? null : "1" })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              inStock
                ? "border-brand bg-brand text-white"
                : "border-gray-300 bg-gray-50 text-gray-700 hover:border-brand hover:text-brand"
            }`}
          >
            ✓ Còn hàng
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Sắp xếp:</span>
            <select
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value === "featured" ? null : e.target.value })}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-brand"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row 2: Price Range Pills + Brand & Origin Dropdowns */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-medium text-gray-500">Mức giá:</span>
          {PRICE_RANGES.map((pr) => {
            const active = priceRange === pr.value;
            return (
              <button
                key={pr.value}
                type="button"
                onClick={() => updateParams({ price: pr.value || null })}
                className={`rounded-full px-2.5 py-1 font-medium transition ${
                  active
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-brand"
                }`}
              >
                {pr.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {facets.brands.length > 0 && (
            <select
              value={brand}
              onChange={(e) => updateParams({ brand: e.target.value || null })}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 outline-none focus:border-brand"
            >
              <option value="">Tất cả thương hiệu ({facets.brands.length})</option>
              {facets.brands.map((b) => (
                <option key={b.brand} value={b.brand}>
                  {b.brand} ({b.count})
                </option>
              ))}
            </select>
          )}

          {facets.origins.length > 0 && (
            <select
              value={origin}
              onChange={(e) => updateParams({ origin: e.target.value || null })}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 outline-none focus:border-brand"
            >
              <option value="">Tất cả xuất xứ ({facets.origins.length})</option>
              {facets.origins.map((o) => (
                <option key={o.origin} value={o.origin}>
                  {o.origin} ({o.count})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Row 3: Result count & Clear filters */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>
          Hiển thị <strong className="text-gray-800">{totalCount}</strong> sản phẩm phù hợp
        </span>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="font-medium text-red-600 hover:underline"
          >
            ✕ Xoá tất cả bộ lọc
          </button>
        )}
      </div>
    </div>
  );
}
