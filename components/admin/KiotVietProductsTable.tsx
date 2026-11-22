"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import {
  cloneProductAction,
  deleteProductAction,
  quickUpdateProductPricingAction,
  updateProductStockAction,
} from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import type { AdminProductRow } from "@/lib/admin-data";
import { vnd } from "@/lib/site";

type ColumnKey =
  | "image"
  | "sku"
  | "barcode"
  | "name"
  | "category"
  | "price"
  | "cost_price"
  | "stock"
  | "reserved"
  | "min_stock"
  | "location"
  | "supplier";

const ALL_COLUMNS: { key: ColumnKey; label: string; defaultOn: boolean }[] = [
  { key: "image", label: "Hình ảnh", defaultOn: true },
  { key: "sku", label: "Mã hàng", defaultOn: true },
  { key: "barcode", label: "Mã vạch", defaultOn: false },
  { key: "name", label: "Tên hàng", defaultOn: true },
  { key: "category", label: "Nhóm hàng", defaultOn: true },
  { key: "price", label: "Giá bán", defaultOn: true },
  { key: "cost_price", label: "Giá vốn", defaultOn: true },
  { key: "stock", label: "Tồn kho", defaultOn: true },
  { key: "reserved", label: "Khách đặt", defaultOn: true },
  { key: "min_stock", label: "Định mức tồn", defaultOn: false },
  { key: "location", label: "Vị trí", defaultOn: false },
  { key: "supplier", label: "Nhà cung cấp", defaultOn: false },
];

const COL_STORAGE_KEY = "td_kv_product_cols_v1";

export default function KiotVietProductsTable({
  rows,
  total,
  summary,
  returnTo,
  viewMode,
}: {
  rows: AdminProductRow[];
  total: number;
  summary: { totalStock: number; totalReserved: number; totalInventoryValue: number };
  returnTo: string;
  viewMode: "list" | "pricebook";
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showColMenu, setShowColMenu] = useState(false);
  const [cols, setCols] = useState<Record<ColumnKey, boolean>>(() => {
    const init = {} as Record<ColumnKey, boolean>;
    for (const c of ALL_COLUMNS) init[c.key] = c.defaultOn;
    return init;
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCols((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCol(k: ColumnKey) {
    setCols((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      try {
        localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // PriceBook Mode (#/PriceBook - Thiết lập giá nhanh)
  if (viewMode === "pricebook") {
    return (
      <div className="rounded-2xl border bg-white shadow-xs overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-amber-50/60 px-4 py-3 text-xs">
          <div className="font-extrabold text-amber-950">
            💰 Chế độ Thiết lập Bảng giá nhanh (#/PriceBook) — Chỉnh trực tiếp Giá vốn, Giá bán, Giá KM &amp; Tùy chọn &quot;Liên hệ&quot;
          </div>
          <span className="text-gray-600">Tổng: <strong>{total}</strong> hàng hóa</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2.5 text-left">Mã hàng</th>
              <th className="px-3 py-2.5 text-left">Tên hàng hóa</th>
              <th className="px-3 py-2.5 text-right">Tồn</th>
              <th className="px-3 py-2.5 text-left">Thiết lập Giá vốn · Giá bán · Giá KM · Liên hệ Web</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => {
              const eff = p.sale_price ?? p.price;
              const profit = eff > 0 && p.cost_price > 0 ? eff - p.cost_price : null;
              const pct = profit !== null && eff > 0 ? Math.round((profit / eff) * 100) : null;
              return (
                <tr key={p.id} className="hover:bg-amber-50/20">
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gray-700">
                    {p.sku || `#${p.id}`}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/products/${p.id}/`} className="font-semibold text-gray-900 hover:text-brand">
                      {p.name}
                    </Link>
                    <div className="text-[11px] text-gray-500">
                      {p.category_name}
                      {profit !== null && (
                        <span className={`ml-2 font-semibold ${profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                          · Lãi gộp: {vnd(profit)} ({pct}%)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-gray-700">{p.stock}</td>
                  <td className="px-3 py-2.5">
                    <form action={quickUpdateProductPricingAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <label className="text-[11px] text-gray-500">
                        Giá vốn:
                        <input
                          name="cost_price"
                          type="number"
                          min={0}
                          defaultValue={p.cost_price}
                          className="ml-1 w-24 rounded border px-2 py-1 text-right text-xs font-semibold"
                        />
                      </label>
                      <label className="text-[11px] text-gray-500">
                        Giá bán:
                        <input
                          name="price"
                          type="number"
                          min={0}
                          defaultValue={p.price}
                          className="ml-1 w-24 rounded border border-amber-300 px-2 py-1 text-right text-xs font-bold text-gray-900"
                        />
                      </label>
                      <label className="text-[11px] text-gray-500">
                        Giá KM:
                        <input
                          name="sale_price"
                          type="number"
                          min={0}
                          defaultValue={p.sale_price ?? ""}
                          placeholder="Trống"
                          className="ml-1 w-24 rounded border px-2 py-1 text-right text-xs font-bold text-accent"
                        />
                      </label>
                      <label className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-900 cursor-pointer">
                        <input
                          type="checkbox"
                          name="contact_only"
                          value="1"
                          defaultChecked={Boolean(p.contact_only)}
                          className="accent-purple-700"
                        />
                        <span>📞 Liên hệ Web</span>
                      </label>
                      <button className="rounded-lg bg-brand px-3 py-1 text-xs font-bold text-white hover:bg-brand-dark cursor-pointer">
                        Lưu giá
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Standard KiotViet #/Products Table with Summary Row, Column Visibility Selector & Master-Detail Inline Row Expansion
  const activeColCount =
    2 + // checkbox + actions
    Object.values(cols).filter(Boolean).length;

  return (
    <div className="space-y-2">
      {/* KiotViet Column Visibility Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2 text-xs shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 text-gray-600">
          <span>
            Tổng số: <strong className="text-gray-900">{total}</strong> hàng hóa
          </span>
          <span>·</span>
          <span>
            Tổng Tồn kho: <strong className="text-brand">{summary.totalStock.toLocaleString("vi-VN")}</strong>
          </span>
          <span>·</span>
          <span>
            Khách đang đặt: <strong className="text-amber-700">{summary.totalReserved}</strong>
          </span>
          <span>·</span>
          <span>
            Giá trị tồn: <strong className="text-emerald-800">{vnd(summary.totalInventoryValue)}</strong>
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColMenu((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-brand hover:text-brand cursor-pointer"
          >
            <span>☰ Ẩn/Hiện cột ({Object.values(cols).filter(Boolean).length}/12)</span>
          </button>
          {showColMenu && (
            <div className="absolute right-0 top-9 z-30 w-64 rounded-xl border bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between border-b pb-1.5 font-bold text-gray-800">
                <span>Tùy chọn cột hiển thị</span>
                <button
                  type="button"
                  onClick={() => setShowColMenu(false)}
                  className="text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_COLUMNS.map((c) => (
                  <label key={c.key} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cols[c.key]}
                      onChange={() => toggleCol(c.key)}
                      className="accent-brand"
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main KiotViet Table */}
      <div className="rounded-2xl border bg-white shadow-xs overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-600">
            <tr>
              <th className="px-3 py-3 text-left w-8"></th>
              {cols.image && <th className="px-2 py-3 text-left w-14">Ảnh</th>}
              {cols.sku && <th className="px-3 py-3 text-left">Mã hàng</th>}
              {cols.barcode && <th className="px-3 py-3 text-left">Mã vạch</th>}
              {cols.name && <th className="px-3 py-3 text-left">Tên hàng</th>}
              {cols.category && <th className="px-3 py-3 text-left">Nhóm hàng</th>}
              {cols.price && <th className="px-3 py-3 text-right">Giá bán</th>}
              {cols.cost_price && <th className="px-3 py-3 text-right">Giá vốn</th>}
              {cols.stock && <th className="px-3 py-3 text-right">Tồn kho</th>}
              {cols.reserved && <th className="px-3 py-3 text-right">Khách đặt</th>}
              {cols.min_stock && <th className="px-3 py-3 text-right">Định mức</th>}
              {cols.location && <th className="px-3 py-3 text-left">Vị trí</th>}
              {cols.supplier && <th className="px-3 py-3 text-left">Nhà cung cấp</th>}
              <th className="px-3 py-3 text-right"></th>
            </tr>
            {/* KiotViet Summary Row right below header */}
            <tr className="border-t bg-emerald-50/60 text-xs font-extrabold text-gray-900">
              <td className="px-3 py-2"></td>
              {cols.image && <td className="px-2 py-2"></td>}
              {cols.sku && <td className="px-3 py-2 text-brand">Tổng ({total})</td>}
              {cols.barcode && <td className="px-3 py-2"></td>}
              {cols.name && <td className="px-3 py-2 text-gray-500 font-normal">Bấm vào dòng bất kỳ để mở rộng chi tiết KiotViet ▾</td>}
              {cols.category && <td className="px-3 py-2"></td>}
              {cols.price && <td className="px-3 py-2"></td>}
              {cols.cost_price && <td className="px-3 py-2 text-right text-emerald-800">{vnd(summary.totalInventoryValue)}</td>}
              {cols.stock && <td className="px-3 py-2 text-right text-brand">{summary.totalStock.toLocaleString("vi-VN")}</td>}
              {cols.reserved && <td className="px-3 py-2 text-right text-amber-800">{summary.totalReserved}</td>}
              {cols.min_stock && <td className="px-3 py-2"></td>}
              {cols.location && <td className="px-3 py-2"></td>}
              {cols.supplier && <td className="px-3 py-2"></td>}
              <td className="px-3 py-2"></td>
            </tr>
          </thead>

          <tbody className="divide-y">
            {rows.map((p) => {
              const isExpanded = expandedId === p.id;
              const effPrice = p.sale_price ?? p.price;
              const marginPct =
                effPrice > 0 && p.cost_price > 0
                  ? Math.round(((effPrice - p.cost_price) / effPrice) * 100)
                  : null;
              const publicUrl = `/san-pham/${p.category_slug}/${p.slug}.html`;

              return (
                <Fragment key={p.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className={`cursor-pointer transition ${
                      isExpanded
                        ? "bg-emerald-50/80 font-medium"
                        : p.is_published
                          ? "hover:bg-gray-50/80"
                          : "bg-gray-50/70 text-gray-600"
                    }`}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" form="bulk" name="ids" value={p.id} className="accent-brand" />
                    </td>
                    {cols.image && (
                      <td className="px-2 py-2.5">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover border" />
                        ) : (
                          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gray-100 text-[10px] text-gray-400">
                            SP
                          </span>
                        )}
                      </td>
                    )}
                    {cols.sku && (
                      <td className="px-3 py-2.5 font-mono text-xs font-bold text-brand whitespace-nowrap">
                        {p.sku || `#${p.id}`}
                      </td>
                    )}
                    {cols.barcode && (
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                        {p.barcode || "—"}
                      </td>
                    )}
                    {cols.name && (
                      <td className="px-3 py-2.5 max-w-md">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-gray-900">{p.name}</span>
                          {!p.is_published && (
                            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                              Ngừng KD (Ẩn)
                            </span>
                          )}
                          {Boolean(p.featured) && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                              ★ Nổi bật
                            </span>
                          )}
                          {Boolean(p.contact_only) && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                              📞 Web: Liên hệ
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-gray-500">
                          {p.brand && <span>Thương hiệu: {p.brand}</span>}
                          {p.unit && <span>· ĐVT: {p.unit}</span>}
                          {p.location && <span className="text-emerald-700">· 📍 {p.location}</span>}
                        </div>
                      </td>
                    )}
                    {cols.category && <td className="px-3 py-2.5 text-xs text-gray-700">{p.category_name}</td>}
                    {cols.price && (
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {p.price > 0 ? (
                          <>
                            <div className="font-bold text-gray-900">{vnd(effPrice)}</div>
                            {p.sale_price ? (
                              <div className="text-[11px] text-gray-400 line-through">{vnd(p.price)}</div>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-gray-500">Liên hệ (0đ)</span>
                        )}
                      </td>
                    )}
                    {cols.cost_price && (
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="font-mono text-xs text-gray-800">
                          {p.cost_price > 0 ? vnd(p.cost_price) : "0đ"}
                        </div>
                        {marginPct !== null && (
                          <div className={`text-[10px] font-bold ${marginPct >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                            Lãi: {marginPct}%
                          </div>
                        )}
                      </td>
                    )}
                    {cols.stock && (
                      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <form action={updateProductStockAction} className="inline-flex items-center justify-end gap-1">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="return_to" value={returnTo} />
                          <input
                            name="stock"
                            type="number"
                            min={0}
                            defaultValue={p.stock}
                            className={`w-16 rounded border px-1.5 py-1 text-center text-xs font-bold ${
                              p.stock <= 0 || (p.min_stock > 0 && p.stock <= p.min_stock)
                                ? "border-red-300 bg-red-50 text-red-700"
                                : p.stock <= 5
                                  ? "border-amber-300 bg-amber-50 text-amber-800"
                                  : "border-gray-300"
                            }`}
                          />
                          <button className="rounded border bg-white px-1.5 py-1 text-[11px] text-gray-600 hover:bg-gray-50 cursor-pointer">
                            Lưu
                          </button>
                        </form>
                      </td>
                    )}
                    {cols.reserved && (
                      <td className="px-3 py-2.5 text-right font-bold text-xs text-amber-700">
                        {p.customer_reserved || 0}
                      </td>
                    )}
                    {cols.min_stock && (
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-500">
                        {p.min_stock}
                      </td>
                    )}
                    {cols.location && (
                      <td className="px-3 py-2.5 text-xs text-gray-600">{p.location || "—"}</td>
                    )}
                    {cols.supplier && (
                      <td className="px-3 py-2.5 text-xs text-gray-600">{p.supplier || "—"}</td>
                    )}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        className="mr-2 rounded border px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        {isExpanded ? "▴ Đóng" : "▾ Chi tiết"}
                      </button>
                      <Link
                        href={`/admin/products/${p.id}/`}
                        className="rounded bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand hover:bg-brand hover:text-white"
                      >
                        Sửa
                      </Link>
                    </td>
                  </tr>

                  {/* KiotViet Master-Detail Inline Row Expansion (.k-detail-row) */}
                  {isExpanded && (
                    <tr className="bg-emerald-50/40">
                      <td colSpan={activeColCount} className="p-4">
                        <div className="rounded-2xl border-2 border-emerald-300 bg-white p-5 shadow-sm space-y-4">
                          {/* Detail Header */}
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-extrabold text-gray-900">{p.name}</h3>
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                  Nhóm hàng: {p.category_name}
                                </span>
                                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-700">
                                  {p.is_published ? "Đang kinh doanh (Công khai)" : "Ngừng kinh doanh (Đang ẩn)"}
                                </span>
                                {Boolean(p.contact_only) && (
                                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
                                    📞 Web hiển thị: Liên hệ
                                  </span>
                                )}
                              </div>
                            </div>
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-brand hover:underline"
                            >
                              👁️ Xem ngoài trang khách ↗
                            </a>
                          </div>

                          {/* 4-column KiotViet Info Grid */}
                          <div className="grid gap-4 md:grid-cols-4 text-xs">
                            <div className="flex items-start gap-3">
                              {p.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="h-24 w-24 rounded-xl border object-cover shrink-0"
                                />
                              ) : (
                                <div className="grid h-24 w-24 place-items-center rounded-xl border bg-gray-50 text-gray-400">
                                  Chưa có ảnh
                                </div>
                              )}
                              <div className="space-y-1">
                                <div>
                                  <span className="text-gray-500">Mã hàng: </span>
                                  <strong className="font-mono text-gray-900">{p.sku || "Chưa có"}</strong>
                                </div>
                                <div>
                                  <span className="text-gray-500">Mã KiotViet: </span>
                                  <strong className="font-mono text-indigo-700">{p.kv_code || p.sku || "—"}</strong>
                                </div>
                                <div>
                                  <span className="text-gray-500">Mã vạch: </span>
                                  <strong className="font-mono">{p.barcode || "Chưa có"}</strong>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5 border-l pl-3">
                              <div>
                                <span className="text-gray-500">Giá bán gốc: </span>
                                <strong className="text-sm text-gray-900">{vnd(p.price)}</strong>
                              </div>
                              <div>
                                <span className="text-gray-500">Giá khuyến mãi: </span>
                                <strong className="text-sm text-accent">
                                  {p.sale_price ? vnd(p.sale_price) : "Không giảm"}
                                </strong>
                              </div>
                              <div>
                                <span className="text-gray-500">Giá vốn: </span>
                                <strong className="font-mono text-gray-800">{vnd(p.cost_price)}</strong>
                                {marginPct !== null && (
                                  <span className="ml-1 font-bold text-emerald-700">(Lãi {marginPct}%)</span>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-500">Hiển thị ngoài Web: </span>
                                <strong className="text-purple-800">
                                  {p.contact_only || p.price === 0 ? "📞 Liên hệ" : vnd(effPrice)}
                                </strong>
                              </div>
                            </div>

                            <div className="space-y-1.5 border-l pl-3">
                              <div>
                                <span className="text-gray-500">Tồn kho hiện tại: </span>
                                <strong className="text-sm text-brand">{p.stock}</strong> {p.unit}
                              </div>
                              <div>
                                <span className="text-gray-500">Khách đang đặt: </span>
                                <strong className="text-amber-800">{p.customer_reserved}</strong>
                              </div>
                              <div>
                                <span className="text-gray-500">Tồn khả dụng: </span>
                                <strong className="text-emerald-800">
                                  {Math.max(0, p.stock - p.customer_reserved)}
                                </strong>
                              </div>
                              <div>
                                <span className="text-gray-500">Định mức tồn ít nhất: </span>
                                <strong>{p.min_stock}</strong>
                              </div>
                            </div>

                            <div className="space-y-1.5 border-l pl-3">
                              <div>
                                <span className="text-gray-500">Thương hiệu: </span>
                                <strong>{p.brand || "Chưa có"}</strong>
                              </div>
                              <div>
                                <span className="text-gray-500">Xuất xứ: </span>
                                <strong>{p.origin || "Chưa có"}</strong>
                              </div>
                              <div>
                                <span className="text-gray-500">Trọng lượng: </span>
                                <strong>{p.weight_grams ? `${p.weight_grams} g` : "Chưa có"}</strong>
                              </div>
                              <div>
                                <span className="text-gray-500">Vị trí kệ: </span>
                                <strong>{p.location || "Chưa có"}</strong>
                              </div>
                              <div>
                                <span className="text-gray-500">Nhà cung cấp: </span>
                                <strong className="text-emerald-800">{p.supplier || "Chưa có"}</strong>
                              </div>
                            </div>
                          </div>

                          {/* KiotViet Detail Bottom Action Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <form action={deleteProductAction}>
                                <input type="hidden" name="id" value={p.id} />
                                <ConfirmButton
                                  message={`Xoá vĩnh viễn sản phẩm "${p.name}"?`}
                                  className="rounded-xl border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                                >
                                  🗑️ Xóa
                                </ConfirmButton>
                              </form>

                              <form action={cloneProductAction}>
                                <input type="hidden" name="id" value={p.id} />
                                <button
                                  type="submit"
                                  className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                                >
                                  📋 Sao chép (Nhân bản SP)
                                </button>
                              </form>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/admin/products/${p.id}/`}
                                className="rounded-xl bg-brand px-4 py-1.5 text-xs font-extrabold text-white hover:bg-brand-dark"
                              >
                                ✏️ Chỉnh sửa &amp; Xem Thẻ kho (5 Tab)
                              </Link>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={activeColCount} className="p-8 text-center text-sm text-gray-500">
                  Không tìm thấy hàng hóa nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
