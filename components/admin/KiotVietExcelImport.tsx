"use client";

import { useState } from "react";
import type { KiotVietApplyResult, KiotVietPreviewResult } from "@/lib/kiotviet-import-types";

const cls = {
  card: "rounded-xl border border-gray-200 bg-white shadow-sm",
  label: "mb-1 block text-xs font-semibold text-gray-700",
  primary: "rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50 cursor-pointer",
  secondary: "rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer",
};

export default function KiotVietExcelImport() {
  const [file, setFile] = useState<File | null>(null);
  const [createCategories, setCreateCategories] = useState(true);
  const [overwritePriceStock, setOverwritePriceStock] = useState(true);
  const [publishImported, setPublishImported] = useState(true);
  const [skipServices, setSkipServices] = useState(true);
  const [loading, setLoading] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<KiotVietPreviewResult | null>(null);
  const [applyResult, setApplyResult] = useState<KiotVietApplyResult | null>(null);

  async function runImport(mode: "preview" | "apply") {
    if (!file) {
      setError("Vui lòng chọn file .xlsx hoặc .csv xuất từ KiotViet.");
      return;
    }
    setLoading(mode);
    setError(null);
    if (mode === "preview") setApplyResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", mode);
      fd.append("create_categories", createCategories ? "1" : "0");
      fd.append("overwrite_price_stock", overwritePriceStock ? "1" : "0");
      fd.append("publish_imported", publishImported ? "1" : "0");
      fd.append("skip_services", skipServices ? "1" : "0");

      const res = await fetch("/api/admin/kiotviet/import/", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        preview?: KiotVietPreviewResult;
        result?: KiotVietApplyResult;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      if (mode === "preview" && json.preview) setPreview(json.preview);
      if (mode === "apply" && json.result) {
        setApplyResult(json.result);
        setPreview(null);
      }
    } catch (e) {
      setError((e as Error).message || "Không thể xử lý file.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={`${cls.card} p-6 space-y-4 border-2 border-emerald-200`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">📥 Nhập &amp; Đồng bộ Sản phẩm từ Excel KiotViet (.xlsx / .csv)</h2>
          <p className="text-xs text-gray-500">
            Tải file export từ KiotViet (Hàng hóa → Xuất file), xem trước phân loại &amp; mã SKU (<code>kv_code</code>) trước khi ghi vào CSDL.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={cls.label}>Chọn file KiotViet (.xlsx hoặc .csv)</label>
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setApplyResult(null);
              setError(null);
            }}
            className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-emerald-800 hover:file:bg-emerald-100"
          />
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
          <input
            type="checkbox"
            checked={createCategories}
            onChange={(e) => setCreateCategories(e.target.checked)}
            className="accent-brand"
          />
          <span>Tự tạo danh mục mới theo Nhóm hàng KiotViet</span>
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
          <input
            type="checkbox"
            checked={overwritePriceStock}
            onChange={(e) => setOverwritePriceStock(e.target.checked)}
            className="accent-brand"
          />
          <span>KiotViet ghi đè Giá bán, Giá vốn &amp; Tồn kho trên web</span>
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
          <input
            type="checkbox"
            checked={publishImported}
            onChange={(e) => setPublishImported(e.target.checked)}
            className="accent-brand"
          />
          <span>Hiển thị công khai ngay sản phẩm nhập mới</span>
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
          <input
            type="checkbox"
            checked={skipServices}
            onChange={(e) => setSkipServices(e.target.checked)}
            className="accent-brand"
          />
          <span>Bỏ qua dòng &ldquo;Dịch vụ&rdquo; (phí ship, thu khác, quà tặng)</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!file || loading !== null}
          onClick={() => runImport("preview")}
          className={cls.secondary}
        >
          {loading === "preview" ? "⏳ Đang phân tích..." : "🔍 Xem trước (Preview)"}
        </button>
        <button
          type="button"
          disabled={!file || loading !== null}
          onClick={() => runImport("apply")}
          className={cls.primary}
        >
          {loading === "apply" ? "⏳ Đang ghi dữ liệu..." : "⚡ Xác nhận Import vào Website"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          ⚠️ {error}
        </div>
      )}

      {applyResult && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900 space-y-1.5">
          <div className="font-bold text-sm">✅ Đã import xong từ KiotViet!</div>
          <div>
            • Danh mục mới tạo: <strong>{applyResult.createdCategories}</strong> · Sản phẩm thêm mới:{" "}
            <strong>{applyResult.createdProducts}</strong> · Cập nhật (khớp SKU/tên):{" "}
            <strong>{applyResult.updatedProducts}</strong> · Bỏ qua: <strong>{applyResult.skippedRows}</strong>
          </div>
          {applyResult.warnings.map((w, i) => (
            <div key={i} className="text-amber-800">• {w}</div>
          ))}
        </div>
      )}

      {preview && (
        <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4 text-xs">
          <div className="grid gap-2 sm:grid-cols-4 font-semibold">
            <div className="rounded-lg bg-white p-2.5 border">Tổng dòng: {preview.totalRows}</div>
            <div className="rounded-lg bg-white p-2.5 border text-emerald-700">Thêm mới: {preview.createCount}</div>
            <div className="rounded-lg bg-white p-2.5 border text-blue-700">Cập nhật: {preview.updateCount}</div>
            <div className="rounded-lg bg-white p-2.5 border text-gray-600">Bỏ qua (Dịch vụ): {preview.skipCount}</div>
          </div>

          <div className="flex flex-wrap gap-3 text-amber-800">
            <span>• Tồn âm tự đưa về 0: <strong>{preview.negativeStockCount}</strong></span>
            <span>• Giá = 0 (Liên hệ): <strong>{preview.zeroPriceCount}</strong></span>
            <span>• Chưa có ảnh: <strong>{preview.missingImageCount}</strong></span>
          </div>

          {preview.newCategories.length > 0 && (
            <div>
              <div className="font-bold text-gray-800 mb-1">
                Danh mục mới sẽ tạo ({preview.newCategories.length}):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {preview.newCategories.map((c) => (
                  <span key={c.slug} className="rounded-full border bg-white px-2.5 py-0.5 text-[11px]">
                    {c.name} ({c.count}){c.showInMenu ? "" : " · ẩn menu"}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-72 overflow-auto rounded-lg border bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-2">Mã KV</th>
                  <th className="p-2">Tên sản phẩm</th>
                  <th className="p-2">Danh mục đích</th>
                  <th className="p-2">Giá</th>
                  <th className="p-2">Tồn</th>
                  <th className="p-2">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.sample.map((item) => (
                  <tr key={`${item.rowNum}-${item.kvCode}`}>
                    <td className="p-2 font-mono">{item.kvCode}</td>
                    <td className="p-2 font-medium">{item.name}</td>
                    <td className="p-2">{item.targetCategoryName}</td>
                    <td className="p-2">{item.price.toLocaleString("vi-VN")}</td>
                    <td className="p-2">{item.stock}</td>
                    <td className="p-2">
                      {item.action === "create" && <span className="text-emerald-700 font-bold">Thêm mới</span>}
                      {item.action === "update" && <span className="text-blue-700 font-bold">Cập nhật ({item.matchedBy})</span>}
                      {item.action === "skip" && <span className="text-gray-500">Bỏ qua</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
