"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  CleanProductStylePreset,
  DuplicateCheckResult,
  IdleWorkerSummary,
  LegacyTraceWarning,
  ParsedProductDraft,
  ProductImportJobRow,
  SourceDiffResult,
  UncleanedProductItem,
} from "@/lib/product-importer";
import { formatEtaText, useAiIdleQueue } from "./AiIdleQueueProvider";

type CategoryOption = { id: number; name: string; slug: string };

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  fetch_queued: { label: "Chờ lấy dữ liệu", cls: "bg-slate-100 text-slate-700" },
  fetched: { label: "Chờ bấm Nhập SP", cls: "bg-sky-100 text-sky-800" },
  imported: { label: "Đã nhập · Chờ làm sạch", cls: "bg-amber-100 text-amber-800" },
  cleaning_queued: { label: "Đang xếp hàng chạy ngầm", cls: "bg-purple-100 text-purple-800" },
  cleaning_running: { label: "Đang xử lý ảnh & nội dung...", cls: "bg-indigo-100 text-indigo-800 animate-pulse" },
  cleaned: { label: "✓ Hoàn tất sạch 100%", cls: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Lỗi xử lý", cls: "bg-red-100 text-red-700" },
};

function fmtEta(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s <= 0) return "0 giây";
  if (s < 60) return `~${s} giây`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `~${m} phút ${rem}s` : `~${m} phút`;
}

export default function ProductImporterClient({
  initialJobs,
  initialSummary,
  initialUncleaned,
  categories,
}: {
  initialJobs: ProductImportJobRow[];
  initialSummary: IdleWorkerSummary;
  initialUncleaned: UncleanedProductItem[];
  categories: CategoryOption[];
}) {
  const [jobs, setJobs] = useState<ProductImportJobRow[]>(initialJobs);
  const [summary, setSummary] = useState<IdleWorkerSummary>(initialSummary);
  const [uncleaned, setUncleaned] = useState<UncleanedProductItem[]>(initialUncleaned);
  const [selectedUncleanedIds, setSelectedUncleanedIds] = useState<number[]>([]);
  const [activeJobId, setActiveJobId] = useState<number | null>(initialJobs[0]?.id ?? null);

  // Input mode: single vs bulk
  const [inputMode, setInputMode] = useState<"single" | "bulk">("single");
  const [urlInput, setUrlInput] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [bulkCategoryId, setBulkCategoryId] = useState<number>(categories[0]?.id ?? 0);
  const [showHtmlFallback, setShowHtmlFallback] = useState(false);
  const [rawHtml, setRawHtml] = useState("");

  // Instant duplicate pre-check
  const [checkingDup, setCheckingDup] = useState(false);
  const [preCheck, setPreCheck] = useState<DuplicateCheckResult | null>(null);
  const [recleanCategoryId, setRecleanCategoryId] = useState<number>(categories[0]?.id ?? 0);

  // Import form
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 0);
  const [priceAdjustPct, setPriceAdjustPct] = useState<number>(0);
  const [holdStockZero, setHoldStockZero] = useState<boolean>(false);

  // Worker pause toggle & UI feedback
  const [workerPaused, setWorkerPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // 4-step data cleaner & AI personalization state
  const { enqueueAiTask, getTaskByKey } = useAiIdleQueue();
  const [cleanConfigOpen, setCleanConfigOpen] = useState(false);
  const [cleanStylePreset, setCleanStylePreset] = useState<CleanProductStylePreset>("expert_east_west");
  const [cleanCustomInstruction, setCleanCustomInstruction] = useState("");
  const [cleanImages, setCleanImages] = useState(true);
  const [cleaningData, setCleaningData] = useState(false);
  const [sourceDiff, setSourceDiff] = useState<SourceDiffResult | null>(null);

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

  const hasQueued = useMemo(
    () =>
      jobs.some(
        (j) =>
          j.status === "fetch_queued" ||
          j.status === "cleaning_queued" ||
          j.status === "cleaning_running",
      ),
    [jobs],
  );

  // Instant duplicate pre-check when pasting or typing URL
  useEffect(() => {
    const trimmed = urlInput.trim();
    if (!trimmed || !/^https?:\/\/\S+\.\S+/i.test(trimmed)) {
      setPreCheck(null);
      return;
    }
    let cancelled = false;
    setCheckingDup(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/product-import?check_url=${encodeURIComponent(trimmed)}`,
        );
        const d = await res.json().catch(() => null);
        if (!cancelled && res.ok && d) {
          setPreCheck(d as DuplicateCheckResult);
          if (d.duplicateProduct?.category_id) {
            setRecleanCategoryId(d.duplicateProduct.category_id);
          }
        }
      } catch {
        /* ignore pre-check error */
      } finally {
        if (!cancelled) setCheckingDup(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [urlInput]);

  // Step-by-step idle worker polling
  useEffect(() => {
    if (!hasQueued || workerPaused) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        await fetch("/api/admin/product-import/idle-worker", { method: "POST" });
        const res = await fetch("/api/admin/product-import");
        if (res.ok && !cancelled) {
          const d = await res.json();
          if (Array.isArray(d.jobs)) setJobs(d.jobs);
          if (d.workerSummary) setSummary(d.workerSummary);
          if (Array.isArray(d.uncleanedProducts)) setUncleaned(d.uncleanedProducts);
        }
      } catch {
        /* ignore transient poll error */
      }
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasQueued, workerPaused, jobs]);

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
      if (d.workerSummary) setSummary(d.workerSummary);
      if (Array.isArray(d.uncleanedProducts)) setUncleaned(d.uncleanedProducts);
      if (d.job?.id) setActiveJobId(d.job.id);
      if (d.duplicate) setPreCheck(d.duplicate);
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

      {/* 0. Idle Worker & Queue Monitor Panel */}
      <section
        className={`rounded-2xl border p-4 shadow-2xs transition ${
          summary.state === "busy"
            ? "border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-purple-50/50"
            : "border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-green-50/40"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${
                summary.state === "busy"
                  ? "bg-indigo-600 text-white animate-pulse"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {summary.state === "busy" ? "⚙️" : "🟢"}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold text-gray-900">
                  {summary.state === "busy"
                    ? `Worker đang chạy ngầm (${summary.queuedCount} việc trong hàng đợi)`
                    : "Worker đang rảnh việc — Sẵn sàng nhận việc mới"}
                </h2>
                {summary.state === "busy" && (
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                    Ước tính xong toàn hàng đợi: {fmtEta(summary.totalEtaSeconds)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600">
                {summary.state === "busy" && summary.activeJob
                  ? `${summary.activeJob.name}: ${summary.activeJob.current_step} (${summary.activeJob.progress_pct}% · Còn ${fmtEta(summary.activeJob.estimated_seconds)})`
                  : "Không có tác vụ nền nào đang chiếm tài nguyên. Bạn có thể dán thêm link hoặc giao việc tồn đọng bên cạnh."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {summary.state === "busy" && (
              <button
                type="button"
                onClick={() => setWorkerPaused((p) => !p)}
                className="cursor-pointer rounded-xl border border-indigo-300 bg-white px-3 py-1.5 font-bold text-indigo-800 hover:bg-indigo-50"
              >
                {workerPaused ? "▶ Tiếp tục chạy ngầm" : "⏸️ Tạm dừng Worker"}
              </button>
            )}
            {summary.suggestions.uncleanedImportedCount > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  callApi(
                    { action: "queue_all_uncleaned" },
                    `✓ Đã giao ${summary.suggestions.uncleanedImportedCount} sản phẩm chưa làm sạch vào hàng đợi ngầm!`,
                  )
                }
                className="cursor-pointer rounded-xl bg-brand px-3 py-1.5 font-bold text-white shadow-2xs hover:bg-brand-dark disabled:opacity-50"
              >
                🤖 Giao làm sạch {summary.suggestions.uncleanedImportedCount} SP chờ xử lý
              </button>
            )}
            {summary.suggestions.failedCount > 0 && (
              <span className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 font-bold text-red-700">
                ⚠️ {summary.suggestions.failedCount} job lỗi cần thử lại
              </span>
            )}
          </div>
        </div>

        {/* Active Job Progress Bar */}
        {summary.state === "busy" && summary.activeJob && (
          <div className="mt-3 space-y-1">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/90 border border-indigo-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
                style={{ width: `${Math.max(5, Math.min(100, summary.activeJob.progress_pct))}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* 1. Paste Single URL or Bulk Queue */}
      <section className="rounded-2xl border bg-white p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">
              1️⃣ Nhập Link sản phẩm từ trang thứ 3
            </h2>
            <p className="text-xs text-gray-500">
              Tự động kiểm tra trùng lặp ngay khi dán link, chuẩn hoá theo Motif Thực Dưỡng Phúc Thọ và quét dấu vết trang cũ.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setInputMode("single")}
              className={`cursor-pointer rounded-lg px-3 py-1.5 font-bold ${
                inputMode === "single" ? "bg-brand text-white" : "border bg-gray-50 text-gray-700"
              }`}
            >
              🔗 1 Link chi tiết
            </button>
            <button
              type="button"
              onClick={() => setInputMode("bulk")}
              className={`cursor-pointer rounded-lg px-3 py-1.5 font-bold ${
                inputMode === "bulk" ? "bg-brand text-white" : "border bg-gray-50 text-gray-700"
              }`}
            >
              📋 Dán hàng loạt vào Hàng đợi
            </button>
          </div>
        </div>

        {inputMode === "single" ? (
          <>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await callApi(
                  { action: "fetch", url: urlInput, raw_html: showHtmlFallback ? rawHtml : "" },
                  "✓ Đã lấy & chuyển đổi dữ liệu xong! Vui lòng xem trước bên dưới rồi bấm Nhập sản phẩm.",
                );
                if (res) setRawHtml("");
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

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {checkingDup ? "🔎 Đang kiểm tra trùng lặp link..." : "Hỗ trợ tự bỏ utm/fbclid khi đối chiếu trùng."}
                </span>
                <button
                  type="button"
                  onClick={() => setShowHtmlFallback((v) => !v)}
                  className="cursor-pointer font-bold text-brand hover:underline"
                >
                  {showHtmlFallback ? "Ẩn ô HTML dự phòng" : "+ Nếu web nguồn chặn bot (dán HTML)"}
                </button>
              </div>

              {showHtmlFallback && (
                <textarea
                  rows={4}
                  value={rawHtml}
                  onChange={(e) => setRawHtml(e.target.value)}
                  placeholder="Mở trang sản phẩm trên trình duyệt → Ctrl+U → Copy HTML dán vào đây nếu web kia chặn tải tự động..."
                  className="w-full rounded-xl border border-gray-300 p-3 font-mono text-xs outline-none focus:border-brand"
                />
              )}
            </form>

            {/* Instant Duplicate Warning & Re-Clean with Category Choice */}
            {preCheck?.queuedJob && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-950">
                ⏳ Link này đang nằm trong hàng đợi xử lý (Job #{preCheck.queuedJob.id} —{" "}
                <strong>{preCheck.queuedJob.current_step}</strong> · {preCheck.queuedJob.progress_pct}%).
              </div>
            )}

            {preCheck?.duplicateProduct && (
              <div
                className={`rounded-2xl border p-4 text-xs space-y-3 ${
                  preCheck.duplicateProduct.hasLegacyTraces
                    ? "border-amber-300 bg-amber-50/90 text-amber-950"
                    : "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-extrabold">
                      {preCheck.duplicateProduct.hasLegacyTraces
                        ? "⚠️ Phát hiện TRÙNG link cũ & Sản phẩm vẫn còn Dấu vết trang cũ!"
                        : "✓ Link này đã có trong kho & đã được làm sạch"}
                    </div>
                    <div className="mt-0.5">
                      Sản phẩm hiện tại:{" "}
                      <strong>
                        #{preCheck.duplicateProduct.id} — {preCheck.duplicateProduct.name}
                      </strong>{" "}
                      (Danh mục hiện tại: <strong>{preCheck.duplicateProduct.category_name}</strong>)
                    </div>
                  </div>
                  <Link
                    href={`/admin/products/${preCheck.duplicateProduct.id}/`}
                    className="rounded-lg border bg-white px-3 py-1.5 font-bold text-gray-800 hover:bg-gray-50"
                  >
                    Mở sản phẩm ↗
                  </Link>
                </div>

                {preCheck.duplicateProduct.hasLegacyTraces && (
                  <>
                    <div className="rounded-xl border border-amber-200 bg-white/80 p-3 space-y-1">
                      <div className="font-bold text-amber-900">
                        Dấu vết trang cũ còn tồn tại trong kho ({preCheck.duplicateProduct.traces.length}):
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-gray-700">
                        {preCheck.duplicateProduct.traces.map((tr, i) => (
                          <li key={i}>
                            <strong>{tr.label}:</strong> {tr.detail}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-amber-200 bg-white p-3">
                      <div className="min-w-[220px] flex-1">
                        <label className="mb-1 block font-bold text-gray-700">
                          Giữ danh mục hiện tại hoặc Chuyển sang danh mục mới:
                        </label>
                        <select
                          value={recleanCategoryId}
                          onChange={(e) => setRecleanCategoryId(Number(e.target.value))}
                          className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                              {c.id === preCheck.duplicateProduct?.category_id ? " (Danh mục hiện tại)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          callApi(
                            {
                              action: "reclean_existing",
                              product_id: preCheck.duplicateProduct!.id,
                              category_id: recleanCategoryId,
                              mode: "auto",
                            },
                            "✓ Đã cập nhật danh mục & đưa sản phẩm vào Hàng đợi Làm sạch ngầm!",
                          )
                        }
                        className="cursor-pointer rounded-xl bg-purple-700 px-4 py-2 font-extrabold text-white shadow hover:bg-purple-800 disabled:opacity-50"
                      >
                        🤖 Đưa vào Hàng đợi Làm sạch &amp; Lưu danh mục
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          const r = await callApi(
                            {
                              action: "reclean_existing",
                              product_id: preCheck.duplicateProduct!.id,
                              category_id: recleanCategoryId,
                              mode: "manual",
                            },
                            "✓ Đã lưu danh mục! Đang mở trang sửa thủ công...",
                          );
                          if (r?.productId) {
                            window.location.href = `/admin/products/${r.productId}/`;
                          }
                        }}
                        className="cursor-pointer rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2 font-bold text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                      >
                        ✏️ Lưu danh mục &amp; Sửa thủ công
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const lines = bulkUrls
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean);
              const res = await callApi(
                { action: "bulk_queue", urls: lines, category_id: bulkCategoryId },
                "✓ Đã đưa danh sách link vào Hàng đợi Worker chạy ngầm!",
              );
              if (res?.stats) {
                setMsg(
                  `✓ Đã xếp hàng ${res.stats.queued} link mới (Bỏ qua ${res.stats.skippedDuplicates} link trùng, ${res.stats.invalid} link lỗi).`,
                );
                setBulkUrls("");
              }
            }}
            className="space-y-3"
          >
            <textarea
              rows={5}
              required
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder={"Dán mỗi dòng 1 đường dẫn sản phẩm (tối đa 20 link/lần)...\nhttps://trang-khac.com/san-pham-1.html\nhttps://trang-khac.com/san-pham-2.html"}
              className="w-full rounded-xl border border-gray-300 p-3 font-mono text-xs outline-none focus:border-brand"
            />
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(Number(e.target.value))}
                className="cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    Danh mục: {c.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={busy}
                className="cursor-pointer rounded-xl bg-brand px-5 py-2 text-xs font-extrabold text-white shadow hover:bg-brand-dark disabled:opacity-50"
              >
                📥 Xếp hàng lấy &amp; làm sạch tự động
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 2. Preview + Import + Clean */}
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
            <div className="space-y-3">
              <div className="rounded-xl border bg-gray-50/70 p-4 space-y-2">
                <div className="text-base font-extrabold text-gray-900">
                  {activeDraft.name || activeJob.product_name || `Phiên #${activeJob.id}`}
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="font-bold text-brand">
                    Giá:{" "}
                    {Number(activeDraft.price) > 0
                      ? `${Number(activeDraft.price).toLocaleString("vi-VN")}đ`
                      : "Liên hệ"}
                  </span>
                  {activeDraft.brand && <span className="text-gray-600">Thương hiệu: {activeDraft.brand}</span>}
                  {activeDraft.sku && <span className="text-gray-600">SKU: {activeDraft.sku}</span>}
                  <span className="text-gray-600">Ảnh lấy được: {(activeDraft.images ?? []).length}</span>
                </div>
                {activeDraft.summary && (
                  <p className="text-xs leading-relaxed text-gray-700">{activeDraft.summary}</p>
                )}
              </div>

              {(activeDraft.images ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(activeDraft.images ?? []).map((img, i) => (
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

              {activeDraft.description_html && (
                <div className="max-h-60 overflow-y-auto rounded-xl border bg-white p-4 text-xs prose-content">
                  <div dangerouslySetInnerHTML={{ __html: activeDraft.description_html }} />
                </div>
              )}
            </div>

            <div className="space-y-4">
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

              {/* Clean Data & Personalize for Our Shop (4-step pipeline) */}
              {(() => {
                const cleanTask = getTaskByKey(`clean_product:${activeJob.id}`);
                const isRunningClean =
                  cleaningData || cleanTask?.status === "running" || cleanTask?.status === "queued";
                return (
                  <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-emerald-50/40 p-3.5 text-xs space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-extrabold text-indigo-950">
                        🧹 Làm sạch dữ liệu &amp; Cá nhân hoá cho Web mình
                      </div>
                      <button
                        type="button"
                        onClick={() => setCleanConfigOpen((v) => !v)}
                        className="cursor-pointer rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-800 hover:bg-indigo-50"
                      >
                        ⚙️ {cleanConfigOpen ? "Ẩn đề nghị AI" : "Đề nghị bổ sung cho AI"}
                      </button>
                    </div>

                    <p className="text-[11px] leading-relaxed text-gray-600">
                      Tự động: (1) Bỏ hết HTML/CSS trang nguồn, chuẩn hoá theo định dạng web mình · (2) Lọc sạch tên miền, SĐT, link mua sàn/web khác &amp; bản quyền · (3) AI xoá logo/SĐT web cũ trên ảnh (giữ nguyên hãng gốc) · (4) Viết lại cá nhân hoá sản phẩm của shop.
                    </p>

                    {cleanConfigOpen && (
                      <div className="space-y-2.5 rounded-xl border border-indigo-100 bg-white p-3">
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">
                            Phong cách viết lại cá nhân hoá
                          </label>
                          <select
                            value={cleanStylePreset}
                            onChange={(e) => setCleanStylePreset(e.target.value as CleanProductStylePreset)}
                            className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-semibold text-gray-800"
                          >
                            <option value="expert_east_west">🩺 Chuyên gia Thực dưỡng (Đông–Tây Y &amp; YMYL)</option>
                            <option value="seo_sales">🛍️ Chuẩn SEO &amp; Tối ưu chuyển đổi bán hàng</option>
                            <option value="senior_friendly">👵 Ngắn gọn, dễ đọc cho người lớn tuổi</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">
                            Đề nghị bổ sung cho AI khi viết lại
                          </label>
                          <textarea
                            rows={2}
                            value={cleanCustomInstruction}
                            onChange={(e) => setCleanCustomInstruction(e.target.value)}
                            placeholder="VD: Nhấn mạnh nguồn gốc hữu cơ, thêm hướng dẫn pha chế chi tiết, nhấn mạnh chính sách giao hàng của shop..."
                            className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:border-indigo-500"
                          />
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 font-semibold text-gray-700">
                          <input
                            type="checkbox"
                            checked={cleanImages}
                            onChange={(e) => setCleanImages(e.target.checked)}
                            className="h-3.5 w-3.5 accent-indigo-600"
                          />
                          <span>Dùng AI làm sạch ảnh có logo/SĐT web khác (giữ nguyên nhãn hãng sản phẩm)</span>
                        </label>
                      </div>
                    )}

                    {isRunningClean && (
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-[11px] font-extrabold text-white shadow-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-white" />
                          <span>
                            {cleanTask?.status === "queued"
                              ? `⏳ Đang xếp hàng (#${cleanTask.queuePosition})`
                              : "⚡ Đang tẩy HTML cũ, lọc dấu vết, sửa ảnh & viết lại..."}
                          </span>
                        </span>
                        <span className="rounded-full bg-white/20 px-2 py-0.5">
                          Còn {formatEtaText(cleanTask?.remainingSeconds ?? 14)}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={busy || isRunningClean}
                      onClick={async () => {
                        setCleaningData(true);
                        setErr("");
                        setMsg("");
                        try {
                          await enqueueAiTask({
                            key: `clean_product:${activeJob.id}`,
                            kind: "product_rewrite",
                            title: `Làm sạch SP: ${(activeDraft?.name || `#${activeJob.id}`).slice(0, 22)}`,
                            run: async () => {
                              const res = await fetch("/api/admin/product-import", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "clean_data",
                                  job_id: activeJob.id,
                                  style_preset: cleanStylePreset,
                                  custom_instruction: cleanCustomInstruction,
                                  clean_images: cleanImages,
                                }),
                              });
                              const d = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                throw new Error(d.error || "Không thể làm sạch dữ liệu.");
                              }
                              if (Array.isArray(d.jobs)) setJobs(d.jobs);
                              if (d.workerSummary) setSummary(d.workerSummary);
                              if (Array.isArray(d.uncleanedProducts)) setUncleaned(d.uncleanedProducts);
                              if (d.job?.id) setActiveJobId(d.job.id);
                              const st = d.stats ?? {};
                              setMsg(
                                `✓ Đã làm sạch & cá nhân hoá dữ liệu! (${st.imagesProcessed ?? 0} ảnh xử lý, ${st.imagesRecreated ?? 0} ảnh AI vẽ sạch logo/SĐT).`,
                              );
                            },
                          });
                        } catch (e) {
                          setErr((e as Error).message || "Không thể làm sạch dữ liệu.");
                        } finally {
                          setCleaningData(false);
                        }
                      }}
                      className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-indigo-600 to-brand px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                    >
                      {isRunningClean ? "⏳ Đang làm sạch dữ liệu..." : "🧹 Làm sạch dữ liệu ngay"}
                    </button>
                  </div>
                );
              })()}

              {!activeJob.product_id ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3 text-xs">
                  <div className="font-extrabold text-emerald-950">📥 Sẵn sàng nhập vào Website</div>
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">Chọn Danh mục sản phẩm *</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(Number(e.target.value))}
                      className="w-full cursor-pointer rounded-lg border bg-white px-2.5 py-2 font-semibold text-gray-900"
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
                        "✓ Đã đưa vào hàng chờ chạy ngầm! Theo dõi tiến độ ở khung Worker phía trên.",
                      )
                    }
                    className="w-full cursor-pointer rounded-xl bg-purple-700 px-3 py-2.5 font-extrabold text-white shadow hover:bg-purple-800 disabled:opacity-50"
                  >
                    {activeJob.status === "cleaned"
                      ? "🔄 Chạy lại Tự động Làm sạch Ảnh & Nội dung"
                      : activeJob.status === "cleaning_queued" || activeJob.status === "cleaning_running"
                        ? `⏳ ${activeJob.current_step || "Đang xử lý ngầm..."} (${activeJob.progress_pct}%)`
                        : "🤖 Cách 2: Tự động Tích hợp & Xoá Watermark ngầm"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 2.5 Uncleaned Imported Products Checklist */}
      <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">
              🧹 Sản phẩm đã lấy nhưng CHƯA làm sạch ({uncleaned.length})
            </h2>
            <p className="text-xs text-gray-500">
              Check chọn nhiều sản phẩm để Worker làm sạch tuần tự từ từ từng ảnh &amp; tự động lưu lại đúng trong danh mục cũ của từng sản phẩm.
            </p>
          </div>
          {uncleaned.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border bg-gray-50 px-2.5 py-1.5 font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedUncleanedIds.length > 0 && selectedUncleanedIds.length === uncleaned.length}
                  onChange={(e) =>
                    setSelectedUncleanedIds(e.target.checked ? uncleaned.map((u) => u.id) : [])
                  }
                  className="h-4 w-4 accent-brand"
                />
                Chọn tất cả ({uncleaned.length})
              </label>
              <button
                type="button"
                disabled={busy || selectedUncleanedIds.length === 0}
                onClick={async () => {
                  const res = await callApi(
                    { action: "queue_selected_uncleaned", product_ids: selectedUncleanedIds },
                    `✓ Đã đưa ${selectedUncleanedIds.length} sản phẩm vào hàng đợi làm sạch tuần tự (giữ nguyên danh mục cũ)!`,
                  );
                  if (res) setSelectedUncleanedIds([]);
                }}
                className="cursor-pointer rounded-xl bg-purple-700 px-4 py-2 font-extrabold text-white shadow hover:bg-purple-800 disabled:opacity-40"
              >
                🤖 Làm sạch tuần tự ({selectedUncleanedIds.length} SP đã chọn)
              </button>
            </div>
          )}
        </div>

        {uncleaned.length === 0 ? (
          <p className="py-4 text-center text-xs font-semibold text-emerald-700">
            ✓ Tuyệt vời! Không còn sản phẩm nào trong kho còn tồn đọng dấu vết nguồn cũ chưa làm sạch.
          </p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {uncleaned.map((item) => {
              const checked = selectedUncleanedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs transition ${
                    checked ? "border-purple-300 bg-purple-50/40" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelectedUncleanedIds((prev) =>
                          e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id),
                        )
                      }
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-purple-700"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/products/${item.id}/`}
                          className="font-bold text-gray-900 hover:text-brand"
                        >
                          #{item.id} — {item.name}
                        </Link>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                          📁 Lưu danh mục cũ: {item.category_name}
                        </span>
                      </div>
                      <div className="truncate font-mono text-[11px] text-gray-400">
                        {item.source_url}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {item.traces.map((tr, i) => (
                          <span
                            key={i}
                            className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900"
                          >
                            ⚠️ {tr.label}
                          </span>
                        ))}
                        {item.external_image_count > 0 && item.traces.every((t) => t.type !== "images") && (
                          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                            🖼️ {item.external_image_count} ảnh nguồn ngoài
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        callApi(
                          { action: "queue_selected_uncleaned", product_ids: [item.id] },
                          `✓ Đã đưa "${item.name}" vào hàng đợi làm sạch (lưu danh mục: ${item.category_name}).`,
                        )
                      }
                      className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                    >
                      🤖 Làm sạch SP này
                    </button>
                    <Link
                      href={`/admin/products/${item.id}/`}
                      className="rounded-lg border px-2.5 py-1.5 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      ✏️ Sửa
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Queue & History Table */}
      <section className="rounded-2xl border bg-white p-5 shadow-2xs space-y-3">
        <h2 className="text-base font-extrabold text-gray-900">
          📜 Hàng đợi &amp; Lịch sử Lấy Sản Phẩm ({jobs.length})
        </h2>

        {sourceDiff && (
          <div
            className={`rounded-xl border-2 p-4 text-xs space-y-3 ${
              sourceDiff.notFound || sourceDiff.outOfStock
                ? "border-red-300 bg-red-50/70 text-red-950"
                : sourceDiff.hasChanges
                  ? "border-sky-300 bg-sky-50/70 text-sky-950"
                  : "border-emerald-200 bg-emerald-50/70 text-emerald-950"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-extrabold">
                {sourceDiff.notFound
                  ? `⚠️ Link nguồn trả về 404 / Không còn tồn tại (Job #${sourceDiff.jobId})`
                  : sourceDiff.outOfStock
                    ? `⚠️ Nguồn báo Hết hàng / Ngừng kinh doanh (Job #${sourceDiff.jobId})`
                    : sourceDiff.hasChanges
                      ? `🔍 Phát hiện thay đổi từ nguồn (Job #${sourceDiff.jobId} — ${sourceDiff.current.name})`
                      : `✓ Nguồn chưa có thay đổi mới (Job #${sourceDiff.jobId} — ${sourceDiff.current.name})`}
              </div>
              <button
                type="button"
                onClick={() => setSourceDiff(null)}
                className="cursor-pointer rounded border bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-100"
              >
                Đóng
              </button>
            </div>

            {sourceDiff.hasChanges && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-white/90 p-2.5 space-y-1">
                    <div className="text-[11px] font-bold text-gray-500">Hiện tại trên Shop</div>
                    <div>
                      Giá: <strong>{sourceDiff.current.price.toLocaleString("vi-VN")}đ</strong>
                      {sourceDiff.current.sale_price
                        ? ` (KM: ${sourceDiff.current.sale_price.toLocaleString("vi-VN")}đ)`
                        : ""}
                    </div>
                    <div>Số ảnh: <strong>{sourceDiff.current.imageCount}</strong></div>
                  </div>
                  <div className="rounded-lg border bg-white/90 p-2.5 space-y-1">
                    <div className="text-[11px] font-bold text-sky-700">Mới nhất từ Link nguồn</div>
                    <div>
                      Giá: <strong>{sourceDiff.latest.price.toLocaleString("vi-VN")}đ</strong>
                      {sourceDiff.latest.sale_price
                        ? ` (KM: ${sourceDiff.latest.sale_price.toLocaleString("vi-VN")}đ)`
                        : ""}
                      {sourceDiff.priceChanged && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                          Đổi giá
                        </span>
                      )}
                    </div>
                    <div>
                      Số ảnh: <strong>{sourceDiff.latest.imageCount}</strong>
                      {sourceDiff.imagesChanged && (
                        <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-900">
                          Đổi ảnh
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(sourceDiff.priceChanged || sourceDiff.salePriceChanged) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const res = await callApi(
                          { action: "apply_source_update", job_id: sourceDiff.jobId, mode: "price_only" },
                          "✓ Đã cập nhật Giá mới từ nguồn (giữ nguyên bài & ảnh đã cá nhân hoá)!",
                        );
                        if (res) setSourceDiff(null);
                      }}
                      className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      💰 Chỉ cập nhật Giá (Giữ bài &amp; ảnh sạch)
                    </button>
                  )}
                  {(sourceDiff.notFound || sourceDiff.outOfStock) && sourceDiff.productId && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const res = await callApi(
                          { action: "apply_source_update", job_id: sourceDiff.jobId, mode: "mark_out_of_stock" },
                          "✓ Đã đặt Hết hàng (Stock = 0) cho sản phẩm theo nguồn!",
                        );
                        if (res) setSourceDiff(null);
                      }}
                      className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      🚫 Đặt Hết hàng (Stock = 0)
                    </button>
                  )}
                  {!sourceDiff.notFound && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const res = await callApi(
                          { action: "apply_source_update", job_id: sourceDiff.jobId, mode: "full_reclean" },
                          "✓ Đã cập nhật toàn bộ từ nguồn & làm sạch AI lại!",
                        );
                        if (res) setSourceDiff(null);
                      }}
                      className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      🧹 Cập nhật toàn bộ &amp; Làm sạch AI
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

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
                  <th className="px-3 py-2.5">Trạng thái &amp; Tiến độ</th>
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
                  const isQueueItem =
                    j.status === "fetch_queued" ||
                    j.status === "cleaning_queued" ||
                    j.status === "cleaning_running";
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
                      <td className="px-3 py-2.5 space-y-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {j.source_cleared === 1 && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                              Đã xoá note nguồn
                            </span>
                          )}
                        </div>
                        {isQueueItem && (
                          <div className="text-[11px] text-indigo-700">
                            {j.current_step} · <strong>{j.progress_pct}%</strong>{" "}
                            {j.estimated_seconds > 0 && `(${fmtEta(j.estimated_seconds)})`}
                          </div>
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
                        {j.status === "failed" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              callApi(
                                { action: "retry_job", job_id: j.id },
                                "✓ Đã đưa job vào lại hàng đợi!",
                              )
                            }
                            className="cursor-pointer rounded border border-amber-300 bg-amber-50 px-2 py-1 font-bold text-amber-800 hover:bg-amber-100"
                          >
                            ↻ Thử lại
                          </button>
                        )}
                        {(j.status === "fetch_queued" || j.status === "cleaning_queued" || j.status === "failed") && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              callApi({ action: "cancel_job", job_id: j.id }, "✓ Đã huỷ khỏi hàng đợi.")
                            }
                            className="cursor-pointer rounded border border-red-200 px-2 py-1 font-semibold text-red-600 hover:bg-red-50"
                          >
                            Huỷ
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            const res = await callApi(
                              { action: "check_update", job_id: j.id },
                              "✓ Đã đối chiếu Smart Diff với trang nguồn.",
                            );
                            if (res?.diff) setSourceDiff(res.diff as SourceDiffResult);
                          }}
                          className="cursor-pointer rounded border px-2 py-1 font-semibold text-sky-700 hover:bg-sky-50"
                        >
                          🔄 Kiểm tra nguồn
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
