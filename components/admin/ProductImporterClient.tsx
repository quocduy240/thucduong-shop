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
  fetched: { label: "Bước 2: Chờ làm sạch / Nhập", cls: "bg-sky-100 text-sky-800" },
  imported: { label: "Đã nhập · Chờ làm sạch", cls: "bg-amber-100 text-amber-800" },
  cleaning_queued: { label: "Chờ Idle Worker", cls: "bg-purple-100 text-purple-800" },
  cleaning_running: { label: "Đang xử lý ngầm...", cls: "bg-indigo-100 text-indigo-800 animate-pulse" },
  cleaned: { label: "✓ Hoàn tất sạch 100%", cls: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Lỗi xử lý", cls: "bg-red-100 text-red-700" },
};

function fmtEta(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s <= 0) return "0 giây";
  if (s < 60) return `~${s} giây`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `~${m}p ${rem}s` : `~${m} phút`;
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

  // Step 1 input
  const [inputMode, setInputMode] = useState<"single" | "bulk">("single");
  const [urlInput, setUrlInput] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [bulkCategoryId, setBulkCategoryId] = useState<number>(categories[0]?.id ?? 0);
  const [showHtmlFallback, setShowHtmlFallback] = useState(false);
  const [rawHtml, setRawHtml] = useState("");

  // Duplicate pre-check
  const [checkingDup, setCheckingDup] = useState(false);
  const [preCheck, setPreCheck] = useState<DuplicateCheckResult | null>(null);
  const [recleanCategoryId, setRecleanCategoryId] = useState<number>(categories[0]?.id ?? 0);

  // Step 2/3 editable fields
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState<string>("");
  const [editSalePrice, setEditSalePrice] = useState<string>("");
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 0);
  const [priceAdjustPct, setPriceAdjustPct] = useState<number>(0);
  const [holdStockZero, setHoldStockZero] = useState<boolean>(false);

  // Clean data AI config
  const { enqueueAiTask, getTaskByKey } = useAiIdleQueue();
  const [cleanConfigOpen, setCleanConfigOpen] = useState(false);
  const [cleanStylePreset, setCleanStylePreset] = useState<CleanProductStylePreset>("expert_east_west");
  const [cleanCustomInstruction, setCleanCustomInstruction] = useState("");
  const [cleanImages, setCleanImages] = useState(true);
  const [cleaningData, setCleaningData] = useState(false);

  // Bottom tabs & Smart Diff
  const [bottomTab, setBottomTab] = useState<"history" | "uncleaned">("history");
  const [sourceDiff, setSourceDiff] = useState<SourceDiffResult | null>(null);

  const [workerPaused, setWorkerPaused] = useState(false);
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

  // Sync quick-edit fields when activeJob changes
  useEffect(() => {
    if (!activeDraft) return;
    setEditName(activeDraft.name || "");
    setEditPrice(activeDraft.price ? String(activeDraft.price) : "0");
    setEditSalePrice(activeDraft.sale_price ? String(activeDraft.sale_price) : "");
    if (activeJob?.target_category_id) {
      setCategoryId(activeJob.target_category_id);
    }
  }, [activeJob?.id, activeJob?.target_category_id, activeDraft]);

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

  // Instant duplicate URL check
  useEffect(() => {
    const trimmed = urlInput.trim();
    if (!trimmed.startsWith("http")) {
      setPreCheck(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingDup(true);
      try {
        const res = await fetch(`/api/admin/product-import?check_url=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const d = (await res.json()) as DuplicateCheckResult;
          setPreCheck(d);
          if (d.duplicateProduct?.category_id) {
            setRecleanCategoryId(d.duplicateProduct.category_id);
          }
        }
      } catch {
        /* ignore */
      } finally {
        setCheckingDup(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [urlInput]);

  // Background idle-worker loop (0 polling when idle)
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
        /* ignore */
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
      setMsg(okText);
      return d;
    } catch {
      setErr("Lỗi kết nối máy chủ.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  // Determine current visual step (1, 2, or 3)
  const currentStepNum = !activeJob
    ? 1
    : activeJob.product_id
      ? 3
      : activeTraces.length === 0 && activeJob.images_cleaned > 0
        ? 3
        : 2;

  return (
    <div className="space-y-5">
      {/* Compact Idle Worker Strip */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-xs ${
          summary.state === "busy"
            ? "border-indigo-300 bg-indigo-50 text-indigo-950"
            : "border-emerald-200 bg-emerald-50/60 text-emerald-950"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-extrabold">
            {summary.state === "busy"
              ? `⚡ Idle Worker đang xử lý (${summary.queuedCount} việc · ETA ${fmtEta(summary.totalEtaSeconds)})`
              : "🟢 Hệ thống rảnh — Lấy link < 1s (0đ token), chỉ dùng AI 1 lần khi bấm Làm sạch"}
          </span>
          {summary.state === "busy" && summary.activeJob && (
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
              {summary.activeJob.name}: {summary.activeJob.current_step} ({summary.activeJob.progress_pct}%)
            </span>
          )}
        </div>
        {summary.state === "busy" && (
          <button
            type="button"
            onClick={() => setWorkerPaused((p) => !p)}
            className="cursor-pointer rounded-lg border border-indigo-300 bg-white px-3 py-1 font-bold text-indigo-800 hover:bg-indigo-100"
          >
            {workerPaused ? "▶ Tiếp tục" : "⏸️ Tạm dừng"}
          </button>
        )}
      </div>

      {/* Visual 3-Step Stepper */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border bg-white p-3 text-xs shadow-2xs">
        {[
          { num: 1, title: "Bước 1: Dán Link & Quét nhanh", desc: "Lấy tên, giá, ảnh, mô tả (< 1s)" },
          { num: 2, title: "Bước 2: Sửa nhanh & Làm sạch AI", desc: "Tẩy CSS cũ, lọc SĐT/domain, AI sửa ảnh" },
          { num: 3, title: "Bước 3: Chọn Danh mục & Nhập Kho", desc: "Xuất bản lên website bán hàng" },
        ].map((st) => {
          const active = currentStepNum === st.num;
          const done = currentStepNum > st.num;
          return (
            <div
              key={st.num}
              className={`rounded-xl border px-3 py-2 transition ${
                active
                  ? "border-brand bg-emerald-50/80 text-emerald-950"
                  : done
                    ? "border-emerald-200 bg-white text-emerald-800"
                    : "border-gray-100 bg-gray-50/70 text-gray-500"
              }`}
            >
              <div className="font-extrabold">
                {done ? "✅" : active ? "👉" : "○"} {st.title}
              </div>
              <div className="mt-0.5 text-[11px] opacity-80 hidden sm:block">{st.desc}</div>
            </div>
          );
        })}
      </div>

      {(msg || err) && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-bold ${
            err ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || msg}
        </div>
      )}

      {/* STEP 1: Paste Link (Single or Bulk) */}
      <section className="rounded-2xl border bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-gray-900">
            1️⃣ Dán Link Sản phẩm nguồn
          </h2>
          <div className="flex rounded-lg border bg-gray-50 p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setInputMode("single")}
              className={`cursor-pointer rounded-md px-3 py-1 ${
                inputMode === "single" ? "bg-brand text-white" : "text-gray-600"
              }`}
            >
              1 Link (Xem trước ngay)
            </button>
            <button
              type="button"
              onClick={() => setInputMode("bulk")}
              className={`cursor-pointer rounded-md px-3 py-1 ${
                inputMode === "bulk" ? "bg-brand text-white" : "text-gray-600"
              }`}
            >
              Nhiều Link (Tối đa 20)
            </button>
          </div>
        </div>

        {inputMode === "single" ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await callApi(
                { action: "fetch", url: urlInput, raw_html: showHtmlFallback ? rawHtml : "" },
                "✓ Đã quét nhanh dữ liệu từ link! Tiếp tục Bước 2 bên dưới để làm sạch hoặc sửa nhanh.",
              );
              if (res) {
                setUrlInput("");
                setRawHtml("");
                setPreCheck(null);
              }
            }}
            className="space-y-2.5"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://... (Dán link sản phẩm muốn nhập)"
                className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-sm outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={busy}
                className="cursor-pointer rounded-xl bg-brand px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
              >
                {busy ? "Đang quét..." : "⚡ Quét nhanh từ Link"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowHtmlFallback((v) => !v)}
              className="cursor-pointer text-[11px] font-semibold text-gray-500 hover:text-brand hover:underline"
            >
              {showHtmlFallback ? "− Ẩn ô dán HTML dự phòng" : "+ Nếu web nguồn chặn tải, bấm dán HTML (Ctrl+U)"}
            </button>
            {showHtmlFallback && (
              <textarea
                rows={4}
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                placeholder="Dán mã HTML nguồn vào đây..."
                className="w-full rounded-xl border p-2.5 font-mono text-xs"
              />
            )}
          </form>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const urls = bulkUrls
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean);
              const res = await callApi(
                { action: "bulk_queue", urls, category_id: bulkCategoryId },
                "✓ Đã đưa danh sách link vào hàng đợi Idle Worker!",
              );
              if (res) setBulkUrls("");
            }}
            className="space-y-2.5"
          >
            <textarea
              rows={3}
              required
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder="Mỗi dòng 1 đường dẫn sản phẩm (tối đa 20 link)..."
              className="w-full rounded-xl border p-2.5 font-mono text-xs outline-none focus:border-brand"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-700">Danh mục đích:</span>
                <select
                  value={bulkCategoryId}
                  onChange={(e) => setBulkCategoryId(Number(e.target.value))}
                  className="cursor-pointer rounded-lg border bg-white px-2.5 py-1.5 font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="cursor-pointer rounded-xl bg-brand px-4 py-2 font-extrabold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                🚀 Lấy &amp; Làm sạch hàng loạt
              </button>
            </div>
          </form>
        )}

        {/* Duplicate Pre-Check Banner */}
        {(checkingDup || preCheck?.duplicateProduct) && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs space-y-2">
            {checkingDup ? (
              <span className="text-amber-900">⏳ Đang kiểm tra trùng link trong kho...</span>
            ) : (
              preCheck?.duplicateProduct && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong className="text-amber-950">
                      ⚠️ Link này đã có sản phẩm #{preCheck.duplicateProduct.id}: {preCheck.duplicateProduct.name}
                    </strong>{" "}
                    <span className="text-gray-600">
                      ({preCheck.duplicateProduct.hasLegacyTraces
                        ? `Còn ${preCheck.duplicateProduct.traces.length} dấu vết cần dọn`
                        : "Đã sạch"})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={recleanCategoryId}
                      onChange={(e) => setRecleanCategoryId(Number(e.target.value))}
                      className="rounded-lg border bg-white px-2 py-1 text-[11px] font-semibold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
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
                          "✓ Đã đưa sản phẩm cũ vào hàng đợi làm sạch!",
                        )
                      }
                      className="cursor-pointer rounded-lg bg-brand px-3 py-1 font-bold text-white"
                    >
                      🤖 Làm sạch lại SP cũ
                    </button>
                    <Link
                      href={`/admin/products/${preCheck.duplicateProduct.id}/`}
                      className="rounded-lg border bg-white px-3 py-1 font-bold text-gray-800 hover:bg-gray-50"
                    >
                      Mở SP cũ ↗
                    </Link>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* STEP 2 & 3: Main Workspace (2 balanced columns) */}
      {activeJob && activeDraft && (
        <section className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">
                2️⃣ &amp; 3️⃣ Xem trước, Làm sạch AI &amp; Nhập Kho (#{activeJob.id})
              </h2>
              <p className="truncate text-[11px] text-gray-500">
                Nguồn: <span className="font-mono">{activeJob.source_url}</span>
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                STATUS_BADGE[activeJob.status]?.cls ?? "bg-gray-100 text-gray-700"
              }`}
            >
              {STATUS_BADGE[activeJob.status]?.label ?? activeJob.status}
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            {/* Left Column: Quick-Edit + Images + Description Preview */}
            <div className="space-y-3 text-xs">
              <div className="grid gap-2.5 rounded-xl border bg-gray-50/70 p-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label className="mb-1 block font-bold text-gray-700">Tên sản phẩm (Có thể sửa nhanh)</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={Boolean(activeJob.product_id)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-bold text-gray-900 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-gray-700">Giá gốc (đ)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    disabled={Boolean(activeJob.product_id)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-bold text-gray-900 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-gray-700">Giá khuyến mãi (đ)</label>
                  <input
                    type="number"
                    value={editSalePrice}
                    onChange={(e) => setEditSalePrice(e.target.value)}
                    disabled={Boolean(activeJob.product_id)}
                    placeholder="Để trống nếu không KM"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-bold text-brand disabled:bg-gray-100"
                  />
                </div>
                <div className="flex items-end text-[11px] text-gray-500 pb-1">
                  {activeDraft.brand ? `Hãng: ${activeDraft.brand}` : "Chưa rõ hãng"}
                  {activeDraft.sku ? ` · SKU: ${activeDraft.sku}` : ""}
                </div>
              </div>

              {(activeDraft.images ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(activeDraft.images ?? []).map((img, i) => {
                    const isLocalClean = img.startsWith("/api/media/") || img.startsWith("/uploads/");
                    return (
                      <div key={`${img}-${i}`} className="relative overflow-hidden rounded-xl border bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Ảnh ${i + 1}`} className="h-20 w-20 object-cover" />
                        <span
                          className={`absolute bottom-0 inset-x-0 px-1 py-0.5 text-center text-[9px] font-bold text-white ${
                            isLocalClean ? "bg-emerald-600/90" : "bg-amber-600/90"
                          }`}
                        >
                          {isLocalClean ? "✓ Đã sạch" : "Ảnh ngoài"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeDraft.description_html && (
                <div className="max-h-72 overflow-y-auto rounded-xl border bg-white p-4 text-xs prose-content">
                  <div dangerouslySetInnerHTML={{ __html: activeDraft.description_html }} />
                </div>
              )}
            </div>

            {/* Right Column: Traces + 1 Clean Button + 1 Import Box */}
            <div className="space-y-3.5 text-xs">
              <div
                className={`rounded-xl border p-3.5 space-y-2 ${
                  activeTraces.length === 0
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-amber-200 bg-amber-50/60"
                }`}
              >
                <div className="font-extrabold text-gray-900">
                  🔎 Dấu vết trang cũ phát hiện ({activeTraces.length})
                </div>
                {activeTraces.length === 0 ? (
                  <p className="font-semibold text-emerald-800">
                    ✓ Đã sạch dấu vết trang nguồn (0 SĐT, 0 domain lạ).
                  </p>
                ) : (
                  <ul className="space-y-1 text-[11px] text-amber-950">
                    {activeTraces.map((tr, idx) => (
                      <li key={idx} className="rounded-lg border border-amber-200/70 bg-white/80 p-1.5">
                        <span className="font-bold">{tr.label}:</span>{" "}
                        <span className="text-gray-600 break-all">{tr.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Single Clean & Personalize Action */}
              {(() => {
                const cleanTask = getTaskByKey(`clean_product:${activeJob.id}`);
                const isRunningClean =
                  cleaningData || cleanTask?.status === "running" || cleanTask?.status === "queued";
                return (
                  <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-indigo-950">
                        ✨ Làm sạch &amp; Cá nhân hoá AI
                      </span>
                      <button
                        type="button"
                        onClick={() => setCleanConfigOpen((v) => !v)}
                        className="cursor-pointer rounded-lg border border-indigo-200 bg-white px-2 py-0.5 text-[11px] font-bold text-indigo-800 hover:bg-indigo-50"
                      >
                        ⚙️ {cleanConfigOpen ? "Ẩn" : "Đề nghị AI"}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Tẩy HTML/CSS cũ · Lọc SĐT, domain, nút mua · AI xoá logo web cũ trên ảnh (giữ hãng gốc) · Viết lại chuẩn shop mình.
                    </p>

                    {cleanConfigOpen && (
                      <div className="space-y-2 rounded-xl border border-indigo-100 bg-white p-2.5">
                        <select
                          value={cleanStylePreset}
                          onChange={(e) => setCleanStylePreset(e.target.value as CleanProductStylePreset)}
                          className="w-full cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                        >
                          <option value="expert_east_west">🩺 Chuyên gia Thực dưỡng (Đông–Tây Y &amp; YMYL)</option>
                          <option value="seo_sales">🛍️ Chuẩn SEO &amp; Chuyển đổi bán hàng</option>
                          <option value="senior_friendly">👵 Ngắn gọn, dễ đọc cho người lớn tuổi</option>
                        </select>
                        <textarea
                          rows={2}
                          value={cleanCustomInstruction}
                          onChange={(e) => setCleanCustomInstruction(e.target.value)}
                          placeholder="Đề nghị bổ sung cho AI (tuỳ chọn)..."
                          className="w-full rounded-lg border p-2 text-xs"
                        />
                        <label className="flex cursor-pointer items-center gap-2 font-semibold text-gray-700">
                          <input
                            type="checkbox"
                            checked={cleanImages}
                            onChange={(e) => setCleanImages(e.target.checked)}
                            className="h-3.5 w-3.5 accent-indigo-600"
                          />
                          <span>AI làm sạch ảnh dính logo/SĐT web cũ</span>
                        </label>
                      </div>
                    )}

                    {isRunningClean && (
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-[11px] font-extrabold text-white">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-white" />
                          <span>
                            {cleanTask?.status === "queued"
                              ? `⏳ Đang chờ (#${cleanTask.queuePosition})`
                              : "⚡ Đang tẩy HTML, sửa ảnh & viết lại..."}
                          </span>
                        </span>
                        <span className="rounded-full bg-white/20 px-2 py-0.5">
                          Còn {formatEtaText(cleanTask?.remainingSeconds ?? 12)}
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
                            title: `Làm sạch SP: ${(editName || activeDraft.name).slice(0, 22)}`,
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
                              if (!res.ok) throw new Error(d.error || "Không thể làm sạch dữ liệu.");
                              if (Array.isArray(d.jobs)) setJobs(d.jobs);
                              if (d.workerSummary) setSummary(d.workerSummary);
                              if (Array.isArray(d.uncleanedProducts)) setUncleaned(d.uncleanedProducts);
                              if (d.job?.id) setActiveJobId(d.job.id);
                              const st = d.stats ?? {};
                              setMsg(
                                `✓ Đã làm sạch & cá nhân hoá xong! (${st.imagesProcessed ?? 0} ảnh kiểm tra, ${st.imagesRecreated ?? 0} ảnh AI vẽ sạch).`,
                              );
                            },
                          });
                        } catch (e) {
                          setErr((e as Error).message || "Không thể làm sạch dữ liệu.");
                        } finally {
                          setCleaningData(false);
                        }
                      }}
                      className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-indigo-600 to-brand px-4 py-2.5 font-extrabold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
                    >
                      {isRunningClean ? "⏳ Đang làm sạch dữ liệu..." : "🧹 Làm sạch dữ liệu ngay"}
                    </button>
                  </div>
                );
              })()}

              {/* Import Box */}
              {!activeJob.product_id ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2.5">
                  <div className="font-extrabold text-emerald-950">3️⃣ Nhập vào Kho Sản phẩm</div>
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">Chọn Danh mục *</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(Number(e.target.value))}
                      className="w-full cursor-pointer rounded-lg border bg-white px-2.5 py-1.5 font-semibold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block font-bold text-gray-700">Chỉnh giá (%)</label>
                      <input
                        type="number"
                        value={priceAdjustPct}
                        onChange={(e) => setPriceAdjustPct(Number(e.target.value))}
                        className="w-full rounded-lg border bg-white px-2.5 py-1"
                      />
                    </div>
                    <label className="flex cursor-pointer items-end gap-1.5 pb-1 font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={holdStockZero}
                        onChange={(e) => setHoldStockZero(e.target.checked)}
                        className="h-3.5 w-3.5 accent-brand"
                      />
                      <span>Tồn kho = 0</span>
                    </label>
                  </div>
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
                          override_name: editName,
                          override_price: editPrice !== "" ? Number(editPrice) : undefined,
                          override_sale_price: editSalePrice !== "" ? Number(editSalePrice) : null,
                        },
                        "✓ Đã nhập sản phẩm vào kho thành công!",
                      )
                    }
                    className="w-full cursor-pointer rounded-xl bg-brand px-4 py-2.5 font-extrabold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
                  >
                    📥 Nhập vào Kho Sản phẩm
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 space-y-2">
                  <div className="font-extrabold text-emerald-900">
                    ✓ Đã nhập thành Sản phẩm #{activeJob.product_id}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/products/${activeJob.product_id}/`}
                      className="rounded-lg bg-brand px-3 py-1.5 font-bold text-white hover:bg-brand-dark"
                    >
                      ✏️ Sửa chi tiết
                    </Link>
                    {activeJob.category_slug && activeJob.product_slug && (
                      <a
                        href={`/san-pham/${activeJob.category_slug}/${activeJob.product_slug}.html`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-brand bg-white px-3 py-1.5 font-bold text-brand hover:bg-emerald-50"
                      >
                        👁️ Xem ngoài web ↗
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Bottom 2-Tab Section: History + Smart Diff | Uncleaned Queue */}
      <section className="rounded-2xl border bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
          <div className="flex flex-wrap gap-2 text-xs font-extrabold">
            <button
              type="button"
              onClick={() => setBottomTab("history")}
              className={`cursor-pointer rounded-xl px-3.5 py-1.5 ${
                bottomTab === "history" ? "bg-brand text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              📋 Lịch sử &amp; Kiểm tra nguồn ({jobs.length})
            </button>
            <button
              type="button"
              onClick={() => setBottomTab("uncleaned")}
              className={`cursor-pointer rounded-xl px-3.5 py-1.5 ${
                bottomTab === "uncleaned" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-900 hover:bg-amber-100"
              }`}
            >
              🧹 Kho SP chờ làm sạch ({uncleaned.length})
            </button>
          </div>

          {bottomTab === "uncleaned" && uncleaned.length > 0 && (
            <button
              type="button"
              disabled={busy || selectedUncleanedIds.length === 0}
              onClick={() =>
                callApi(
                  { action: "queue_selected_uncleaned", product_ids: selectedUncleanedIds },
                  `✓ Đã xếp hàng làm sạch ${selectedUncleanedIds.length} sản phẩm!`,
                )
              }
              className="cursor-pointer rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-40"
            >
              🚀 Làm sạch {selectedUncleanedIds.length} SP đã chọn
            </button>
          )}
        </div>

        {/* Smart Diff Panel */}
        {sourceDiff && (
          <div
            className={`rounded-xl border-2 p-3.5 text-xs space-y-2.5 ${
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
                  ? `⚠️ Link nguồn 404 (Job #${sourceDiff.jobId})`
                  : sourceDiff.outOfStock
                    ? `⚠️ Nguồn báo Hết hàng (Job #${sourceDiff.jobId})`
                    : sourceDiff.hasChanges
                      ? `🔍 Có thay đổi từ nguồn (Job #${sourceDiff.jobId} — ${sourceDiff.current.name})`
                      : `✓ Nguồn chưa có thay đổi mới (Job #${sourceDiff.jobId})`}
              </div>
              <button
                type="button"
                onClick={() => setSourceDiff(null)}
                className="cursor-pointer rounded border bg-white px-2 py-0.5 text-[11px] font-semibold"
              >
                Đóng
              </button>
            </div>
            {sourceDiff.hasChanges && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  Shop: <strong>{sourceDiff.current.price.toLocaleString("vi-VN")}đ</strong> → Nguồn:{" "}
                  <strong>{sourceDiff.latest.price.toLocaleString("vi-VN")}đ</strong>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(sourceDiff.priceChanged || sourceDiff.salePriceChanged) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const res = await callApi(
                          { action: "apply_source_update", job_id: sourceDiff.jobId, mode: "price_only" },
                          "✓ Đã cập nhật Giá mới (giữ nguyên bài & ảnh sạch)!",
                        );
                        if (res) setSourceDiff(null);
                      }}
                      className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white"
                    >
                      💰 Chỉ cập nhật Giá
                    </button>
                  )}
                  {(sourceDiff.notFound || sourceDiff.outOfStock) && sourceDiff.productId && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const res = await callApi(
                          { action: "apply_source_update", job_id: sourceDiff.jobId, mode: "mark_out_of_stock" },
                          "✓ Đã đặt Hết hàng (Stock = 0)!",
                        );
                        if (res) setSourceDiff(null);
                      }}
                      className="cursor-pointer rounded-lg bg-red-600 px-3 py-1 font-bold text-white"
                    >
                      🚫 Đặt Hết hàng
                    </button>
                  )}
                  {!sourceDiff.notFound && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const res = await callApi(
                          { action: "apply_source_update", job_id: sourceDiff.jobId, mode: "full_reclean" },
                          "✓ Đã cập nhật toàn bộ & làm sạch AI!",
                        );
                        if (res) setSourceDiff(null);
                      }}
                      className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-1 font-bold text-white"
                    >
                      🧹 Cập nhật toàn bộ &amp; Làm sạch AI
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {bottomTab === "history" ? (
          jobs.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500">Chưa có lịch sử nhập sản phẩm.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-gray-50 uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Sản phẩm / Nguồn</th>
                    <th className="px-3 py-2">Trạng thái</th>
                    <th className="px-3 py-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jobs.map((j) => {
                    const badge = STATUS_BADGE[j.status] ?? {
                      label: j.status,
                      cls: "bg-gray-100 text-gray-700",
                    };
                    return (
                      <tr key={j.id} className={activeJob?.id === j.id ? "bg-emerald-50/40" : ""}>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setActiveJobId(j.id)}
                            className="cursor-pointer text-left font-bold text-gray-900 hover:text-brand"
                          >
                            {j.product_name || `Phiên #${j.id} (${j.source_domain})`}
                          </button>
                          <div className="max-w-xs truncate font-mono text-[11px] text-gray-400">
                            {j.source_url}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <div className="text-[11px] text-gray-500">{j.current_step}</div>
                        </td>
                        <td className="px-3 py-2 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setActiveJobId(j.id)}
                            className="cursor-pointer rounded border px-2 py-1 font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Mở
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              const res = await callApi(
                                { action: "check_update", job_id: j.id },
                                "✓ Đã kiểm tra thay đổi từ nguồn.",
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
                                if (confirm("Xoá note nguồn khỏi sản phẩm này?")) {
                                  callApi(
                                    { action: "clear_source", product_id: j.product_id },
                                    "✓ Đã xoá note nguồn.",
                                  );
                                }
                              }}
                              className="cursor-pointer rounded border border-amber-200 px-2 py-1 font-semibold text-amber-800 hover:bg-amber-50"
                            >
                              🧹 Xoá note
                            </button>
                          )}
                          {j.product_id && (
                            <Link
                              href={`/admin/products/${j.product_id}/`}
                              className="inline-block rounded border border-brand px-2 py-1 font-bold text-brand hover:bg-emerald-50"
                            >
                              Sửa ↗
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : uncleaned.length === 0 ? (
          <p className="py-6 text-center text-xs font-semibold text-emerald-700">
            ✓ Không còn sản phẩm nào cần làm sạch thêm!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-gray-50 uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedUncleanedIds.length === uncleaned.length && uncleaned.length > 0}
                      onChange={(e) =>
                        setSelectedUncleanedIds(e.target.checked ? uncleaned.map((u) => u.id) : [])
                      }
                    />
                  </th>
                  <th className="px-3 py-2">Sản phẩm</th>
                  <th className="px-3 py-2">Dấu vết còn lại</th>
                  <th className="px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {uncleaned.map((u) => {
                  const checked = selectedUncleanedIds.includes(u.id);
                  return (
                    <tr key={u.id}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedUncleanedIds((prev) =>
                              checked ? prev.filter((id) => id !== u.id) : [...prev, u.id],
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 font-bold text-gray-900">
                        #{u.id} — {u.name}
                        <div className="text-[11px] font-normal text-gray-500">{u.category_name}</div>
                      </td>
                      <td className="px-3 py-2 text-amber-800">
                        {u.traces.length} dấu vết · {u.external_image_count} ảnh ngoài
                      </td>
                      <td className="px-3 py-2 text-right space-x-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            callApi(
                              {
                                action: "reclean_existing",
                                product_id: u.id,
                                category_id: u.category_id,
                                mode: "auto",
                              },
                              `✓ Đã đưa SP #${u.id} vào hàng đợi làm sạch!`,
                            )
                          }
                          className="cursor-pointer rounded bg-brand px-2.5 py-1 font-bold text-white"
                        >
                          🤖 Làm sạch
                        </button>
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
