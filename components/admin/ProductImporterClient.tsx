"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  LegacyTraceWarning,
  ParsedProductDraft,
  ProductImportJobRow,
} from "@/lib/product-importer";

type CategoryOption = { id: number; name: string; slug: string };

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  fetched: { label: "Chờ bấm Nhập SP", cls: "bg-sky-100 text-sky-800" },
  imported: { label: "Đã nhập · Chờ làm sạch", cls: "bg-amber-100 text-amber-800" },
  cleaning_queued: { label: "Đang xếp hàng chạy ngầm", cls: "bg-purple-100 text-purple-800" },
  cleaning_running: { label: "Đang xử lý ảnh & nội dung...", cls: "bg-indigo-100 text-indigo-800 animate-pulse" },
  cleaned: { label: "✓ Hoàn tất sạch 100%", cls: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Lỗi xử lý", cls: "bg-red-100 text-red-700" },
};

export default function ProductImporterClient({
  initialJobs,
  categories,
}: {
  initialJobs: ProductImportJobRow[];
  categories: CategoryOption[];
}) {
  const [jobs, setJobs] = useState<ProductImportJobRow[]>(initialJobs);
  const [activeJobId, setActiveJobId] = useState<number | null>(initialJobs[0]?.id ?? null);
  const [urlInput, setUrlInput] = useState("");
  const [showHtmlFallback, setShowHtmlFallback] = useState(false);
  const [rawHtml, setRawHtml] = useState("");
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 0);
  const [priceAdjustPct, setPriceAdjustPct] = useState<number>(0);
  const [holdStockZero, setHoldStockZero] = useState<boolean>(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ id: number; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const activeJob = useMemo(
    () => jobs.find((j) => j.id === activeJobId) ?? jobs[0] ?? null,
    [jobs, activeJobId],
  );

  const activeDraft = useMemo<ParsedProductDraft | null>(() => {
    if (!activeJob?.normalized_payload) return null;
    try {
      return JSON.parse(activeJob.normalized_payload) as ParsedProductDraft;
    } catch {
      return null;
    }
  }, [activeJob]);

  const activeTraces = useMemo<LegacyTraceWarning[]>(() => {
    if (!activeJob?.audit_notes) return [];
    try {
      return JSON.parse(activeJob.audit_notes) as LegacyTraceWarning[];
    } catch {
      return [];
    }
  }, [activeJob]);

  // Background idle worker polling when there are queued/running jobs
  const hasQueued = useMemo(
    () => jobs.some((j) => j.status === "cleaning_queued" || j.status === "cleaning_running"),
    [jobs],
  );

  useEffect(() => {
    if (!hasQueued) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        await fetch("/api/admin/product-import/idle-worker", { method: "POST" });
        const res = await fetch("/api/admin/product-import");
        if (res.ok && !cancelled) {
          const d = await res.json();
          if (Array.isArray(d.jobs)) setJobs(d.jobs);
        }
      } catch {
        /* ignore transient poll error */
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasQueued, jobs]);

  async function callApi(payload: Record<string, unknown>, okText: string) {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/product-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error ?? "Thao tác thất bại.");
        return null;
      }
      if (Array.isArray(d.jobs)) setJobs(d.jobs);
      if (d.job?.id) setActiveJobId(d.job.id);
      if (d.duplicateProduct) setDuplicateInfo(d.duplicateProduct);
      else if (payload.action === "fetch") setDuplicateInfo(null);
      setMsg(okText);
      return d;
    } catch {
      setErr("Lỗi kết nối máy chủ.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {(msg || err) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            err
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || msg}
        </div>
      )}

      {/* Step 1: Paste URL */}
      <section className="rounded-2xl border bg-white p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">
              1️⃣ Dán Link sản phẩm trang thứ 3 để lấy &amp; chuyển đổi theo Motif Shop
            </h2>
            <p className="text-xs text-gray-500">
              Hệ thống tự động trích xuất Tên, Giá, Ảnh, Mô tả → chuẩn hoá về bố cục Thực Dưỡng Phúc Thọ và quét dấu vết trang cũ.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHtmlFallback((v) => !v)}
            className="cursor-pointer text-xs font-bold text-brand hover:underline"
          >
            {showHtmlFallback ? "Ẩn ô HTML dự phòng" : "+ Nếu web nguồn chặn bot (dán HTML)"}
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await callApi(
              { action: "fetch", url: urlInput, raw_html: showHtmlFallback ? rawHtml : "" },
              "✓ Đã lấy & chuyển đổi dữ liệu xong! Vui lòng xem trước bên dưới rồi bấm Nhập sản phẩm.",
            );
            if (res) {
              setRawHtml("");
            }
          }}
          className="space-y-3"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://trang-khac.com/san-pham/..."
              className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={busy}
              className="cursor-pointer rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? "Đang lấy dữ liệu..." : "🔍 Lấy dữ liệu"}
            </button>
          </div>

          {showHtmlFallback && (
            <textarea
              rows={4}
              value={rawHtml}
              onChange={(e) => setRawHtml(e.target.value)}
              placeholder="Mở trang sản phẩm trên trình duyệt → bấm Ctrl+U (hoặc Chuột phải → Xem nguồn trang) → Copy toàn bộ HTML dán vào đây nếu web kia chặn tải tự động..."
              className="w-full rounded-xl border border-gray-300 p-3 font-mono text-xs outline-none focus:border-brand"
            />
          )}
        </form>

        {duplicateInfo && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
            <span>
              ⚠️ Link này trước đó đã được nhập thành sản phẩm:{" "}
              <strong>#{duplicateInfo.id} — {duplicateInfo.name}</strong>
            </span>
            <Link
              href={`/admin/products/${duplicateInfo.id}/`}
              className="rounded-lg bg-amber-600 px-3 py-1 font-bold text-white hover:bg-amber-700"
            >
              Xem sản phẩm cũ ↗
            </Link>
          </div>
        )}
      </section>

      {/* Step 2 & 3: Preview + Import + Manual / Auto Clean */}
      {activeJob && activeDraft && (
        <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-gray-900">
                  2️⃣ Bản xem trước &amp; Chuẩn hoá ({activeJob.source_domain})
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    STATUS_BADGE[activeJob.status]?.cls ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {STATUS_BADGE[activeJob.status]?.label ?? activeJob.status}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                Nguồn: <span className="font-mono">{activeJob.source_url}</span>
              </p>
            </div>
            {activeJob.product_id && (
              <Link
                href={`/admin/products/${activeJob.product_id}/`}
                className="rounded-xl border border-brand px-3.5 py-1.5 text-xs font-extrabold text-brand hover:bg-emerald-50"
              >
                ✏️ Mở trang Sửa Sản phẩm #{activeJob.product_id} ↗
              </Link>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            {/* Preview Content */}
            <div className="space-y-3">
              <div className="rounded-xl border bg-gray-50/70 p-4 space-y-2">
                <div className="text-base font-extrabold text-gray-900">{activeDraft.name}</div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="font-bold text-brand">
                    Giá: {activeDraft.price > 0 ? `${activeDraft.price.toLocaleString("vi-VN")}đ` : "Liên hệ"}
                  </span>
                  {activeDraft.brand && <span className="text-gray-600">Thương hiệu: {activeDraft.brand}</span>}
                  {activeDraft.sku && <span className="text-gray-600">SKU: {activeDraft.sku}</span>}
                  <span className="text-gray-600">Ảnh lấy được: {activeDraft.images.length}</span>
                </div>
                {activeDraft.summary && (
                  <p className="text-xs leading-relaxed text-gray-700">{activeDraft.summary}</p>
                )}
              </div>

              {activeDraft.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeDraft.images.map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${img}-${i}`}
                      src={img}
                      alt={`Ảnh ${i + 1}`}
                      className="h-20 w-20 rounded-xl border bg-white object-cover"
                    />
                  ))}
                </div>
              )}

              <div className="max-h-60 overflow-y-auto rounded-xl border bg-white p-4 text-xs prose-content">
                <div dangerouslySetInnerHTML={{ __html: activeDraft.description_html }} />
              </div>
            </div>

            {/* Right Control Column: Audit Traces + Import + Clean */}
            <div className="space-y-4">
              {/* Audit Warnings */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs space-y-2">
                <div className="font-extrabold text-amber-900">
                  🔎 Dấu vết trang cũ phát hiện ({activeTraces.length})
                </div>
                {activeTraces.length === 0 ? (
                  <p className="text-emerald-800 font-semibold">
                    ✓ Không phát hiện SĐT, Email hay link nguồn cũ trong nội dung.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-[11px] text-amber-950">
                    {activeTraces.map((tr, idx) => (
                      <li key={idx} className="rounded-lg bg-white/80 p-2 border border-amber-200/70">
                        <div className="font-bold">{tr.label}</div>
                        <div className="text-gray-600 break-all">{tr.detail}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Action Box: Not imported yet vs Already imported */}
              {!activeJob.product_id ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3 text-xs">
                  <div className="font-extrabold text-emerald-950">📥 Sẵn sàng nhập vào Website</div>
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">Chọn Danh mục sản phẩm *</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(Number(e.target.value))}
                      className="w-full rounded-lg border bg-white px-2.5 py-2 font-semibold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">Điều chỉnh giá (% so với nguồn)</label>
                    <input
                      type="number"
                      value={priceAdjustPct}
                      onChange={(e) => setPriceAdjustPct(Number(e.target.value))}
                      placeholder="0 = giữ nguyên, -5 = giảm 5%"
                      className="w-full rounded-lg border bg-white px-3 py-1.5"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={holdStockZero}
                      onChange={(e) => setHoldStockZero(e.target.checked)}
                      className="h-4 w-4 accent-brand"
                    />
                    Tạm đặt tồn kho = 0 cho tới khi làm sạch xong
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      callApi(
                        {
                          action: "import",
                          job_id: activeJob.id,
                          category_id: categoryId,
                          price_adjust_pct: priceAdjustPct,
                          hold_stock_zero: holdStockZero,
                        },
                        "✓ Đã nhập sản phẩm mới! Hãy chọn 1 trong 2 cách làm sạch bên dưới.",
                      )
                    }
                    className="w-full cursor-pointer rounded-xl bg-brand py-2.5 text-sm font-extrabold text-white shadow hover:bg-brand-dark disabled:opacity-50"
                  >
                    📥 Nhập sản phẩm vào trang
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-2.5 text-xs">
                  <div className="font-extrabold text-purple-950">
                    3️⃣ Chọn cách Làm sạch &amp; Chuẩn hoá Thương hiệu
                  </div>
                  <Link
                    href={`/admin/products/${activeJob.product_id}/`}
                    className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center font-bold text-gray-800 hover:bg-gray-50"
                  >
                    ✏️ Cách 1: Chỉnh sửa Thủ công (theo gợi ý)
                  </Link>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      activeJob.status === "cleaning_queued" ||
                      activeJob.status === "cleaning_running"
                    }
                    onClick={() =>
                      callApi(
                        { action: "queue_auto_clean", job_id: activeJob.id },
                        "✓ Đã đưa vào hàng chờ chạy ngầm! Hệ thống đang tự động làm sạch nội dung & tái tạo ảnh.",
                      )
                    }
                    className="w-full cursor-pointer rounded-xl bg-purple-700 px-3 py-2.5 font-extrabold text-white shadow hover:bg-purple-800 disabled:opacity-50"
                  >
                    {activeJob.status === "cleaned"
                      ? "🔄 Chạy lại Tự động Làm sạch Ảnh & Nội dung"
                      : activeJob.status === "cleaning_queued" || activeJob.status === "cleaning_running"
                        ? "⏳ Đang chạy ngầm xử lý ảnh..."
                        : "🤖 Cách 2: Tự động Tích hợp & Xoá Watermark ngầm"}
                  </button>
                  <p className="text-[11px] leading-relaxed text-gray-600">
                    Chạy ngầm sẽ lọc từng ảnh: ảnh sạch sẽ tải về lưu nội bộ; ảnh có SĐT/Email/Watermark trang cũ sẽ được Gemini AI tái tạo ảnh mới sạch hoàn toàn.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Step 4: Import History Table */}
      <section className="rounded-2xl border bg-white p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-gray-900">
            📜 Lịch sử Lấy &amp; Cập nhật Sản phẩm từ nguồn ({jobs.length})
          </h2>
          {hasQueued && (
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800 animate-pulse">
              ⚙️ Idle Worker đang chạy ngầm xử lý ảnh...
            </span>
          )}
        </div>

        {jobs.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-500">
            Chưa có lịch sử lấy sản phẩm nào. Hãy dán link sản phẩm ở khung trên để bắt đầu.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-gray-50 uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2.5">Sản phẩm / Nguồn</th>
                  <th className="px-3 py-2.5">Trạng thái</th>
                  <th className="px-3 py-2.5">Ảnh sạch / Tái tạo</th>
                  <th className="px-3 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.map((j) => {
                  const badge = STATUS_BADGE[j.status] ?? {
                    label: j.status,
                    cls: "bg-gray-100 text-gray-700",
                  };
                  return (
                    <tr key={j.id} className={activeJob?.id === j.id ? "bg-emerald-50/30" : ""}>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveJobId(j.id)}
                          className="cursor-pointer text-left font-bold text-gray-900 hover:text-brand"
                        >
                          {j.product_name || `Phiên lấy #${j.id} (${j.source_domain})`}
                        </button>
                        <div className="max-w-xs truncate font-mono text-[11px] text-gray-400">
                          {j.source_url}
                        </div>
                        {j.error_message && (
                          <div className="mt-0.5 text-[11px] text-red-600">{j.error_message}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {j.source_cleared === 1 && (
                          <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                            Đã xoá note nguồn
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {j.images_cleaned}/{j.images_total} ảnh
                        {j.images_recreated > 0 && (
                          <span className="ml-1 font-bold text-purple-700">
                            ({j.images_recreated} AI vẽ lại)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setActiveJobId(j.id)}
                          className="cursor-pointer rounded border px-2 py-1 font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            callApi(
                              { action: "check_update", job_id: j.id },
                              "✓ Đã lấy dữ liệu mới nhất từ link nguồn vào lịch sử.",
                            )
                          }
                          className="cursor-pointer rounded border px-2 py-1 font-semibold text-sky-700 hover:bg-sky-50"
                        >
                          🔄 Cập nhật nguồn
                        </button>
                        {j.product_id && !j.source_cleared && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (
                                confirm(
                                  "Xoá ghi chú & link nguồn khỏi sản phẩm này để chuyển thành sản phẩm chính thống độc lập?",
                                )
                              ) {
                                callApi(
                                  { action: "clear_source", product_id: j.product_id },
                                  "✓ Đã xoá dấu vết link nguồn khỏi sản phẩm.",
                                );
                              }
                            }}
                            className="cursor-pointer rounded border border-amber-200 px-2 py-1 font-semibold text-amber-800 hover:bg-amber-50"
                          >
                            🧹 Xoá note nguồn
                          </button>
                        )}
                        {j.product_id && (
                          <Link
                            href={`/admin/products/${j.product_id}/`}
                            className="inline-block rounded border border-brand px-2 py-1 font-bold text-brand hover:bg-emerald-50"
                          >
                            Sửa SP
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
