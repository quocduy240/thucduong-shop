"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  PolicyAuditResult,
  PostDraftPayload,
  PostIdleWorkerSummary,
  PostImportJobRow,
  PostResearchBrief,
  PostTonePreset,
} from "@/lib/post-importer";
import RichTextEditor from "./RichTextEditor";

type CategoryOption = { id: number; slug: string; section_slug: string; name: string };
type ProductOption = { id: number; name: string };

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  queued: { label: "Chờ nghiên cứu", cls: "bg-slate-100 text-slate-700" },
  researching: { label: "Đang nghiên cứu Đông–Tây Y", cls: "bg-sky-100 text-sky-800 animate-pulse" },
  writing: { label: "Đang viết bài độc bản...", cls: "bg-indigo-100 text-indigo-800 animate-pulse" },
  generating_images: { label: "Đang tạo bộ ảnh AI...", cls: "bg-purple-100 text-purple-800 animate-pulse" },
  ready_review: { label: "✓ Chờ Review & Xuất bản", cls: "bg-amber-100 text-amber-900" },
  published: { label: "✓ Đã xuất bản", cls: "bg-emerald-100 text-emerald-800" },
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

export default function PostImporterClient({
  initialJobs,
  initialSummary,
  categories,
  products,
}: {
  initialJobs: PostImportJobRow[];
  initialSummary: PostIdleWorkerSummary;
  categories: CategoryOption[];
  products: ProductOption[];
}) {
  const [jobs, setJobs] = useState<PostImportJobRow[]>(initialJobs);
  const [summary, setSummary] = useState<PostIdleWorkerSummary>(initialSummary);
  const [activeJobId, setActiveJobId] = useState<number | null>(initialJobs[0]?.id ?? null);

  // Input form
  const [sourceUrl, setSourceUrl] = useState("");
  const [extraUrlsText, setExtraUrlsText] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [rawTextOverride, setRawTextOverride] = useState("");
  const [showRawFallback, setShowRawFallback] = useState(false);
  const [tonePreset, setTonePreset] = useState<PostTonePreset>("expert_east_west");
  const [imagesCount, setImagesCount] = useState<number>(4);

  // Instant duplicate pre-check
  const [dupInfo, setDupInfo] = useState<{
    isYoutube: boolean;
    existingPost: { id: number; title: string } | null;
    queuedJob: { id: number; current_step: string; progress_pct: number } | null;
  } | null>(null);

  // Review editor fields & tabs
  const [reviewTab, setReviewTab] = useState<"edit" | "preview" | "compare">("edit");
  const [editorRevision, setEditorRevision] = useState(0);
  const [revTitle, setRevTitle] = useState("");
  const [revExcerpt, setRevExcerpt] = useState("");
  const [revContent, setRevContent] = useState("");
  const [revCategoryId, setRevCategoryId] = useState<number>(categories[0]?.id ?? 1);
  const [revCover, setRevCover] = useState("");
  const [revComboTitle, setRevComboTitle] = useState("");
  const [revProductIds, setRevProductIds] = useState<number[]>([]);
  const [keepSourceUrl, setKeepSourceUrl] = useState(true);

  const [workerPaused, setWorkerPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [regenKey, setRegenKey] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const reviewSectionRef = useRef<HTMLElement>(null);
  const loadedJobKeyRef = useRef<string>("");

  const activeJob = useMemo(
    () => jobs.find((j) => j.id === activeJobId) ?? jobs[0] ?? null,
    [jobs, activeJobId],
  );

  const activeResearch = useMemo<PostResearchBrief | null>(() => {
    if (!activeJob?.research_json || activeJob.research_json === "{}") return null;
    try {
      return JSON.parse(activeJob.research_json) as PostResearchBrief;
    } catch {
      return null;
    }
  }, [activeJob]);

  const activeAudit = useMemo<PolicyAuditResult | null>(() => {
    if (!activeJob?.policy_audit_json || activeJob.policy_audit_json === "{}") return null;
    try {
      return JSON.parse(activeJob.policy_audit_json) as PolicyAuditResult;
    } catch {
      return null;
    }
  }, [activeJob]);

  const activeDraft = useMemo<PostDraftPayload | null>(() => {
    if (!activeJob?.draft_json || activeJob.draft_json === "{}") return null;
    try {
      return JSON.parse(activeJob.draft_json) as PostDraftPayload;
    } catch {
      return null;
    }
  }, [activeJob]);

  // Only sync review fields when switching job OR when job finishes transitioning to ready_review/published
  useEffect(() => {
    if (!activeJob || !activeDraft) return;
    const key = `${activeJob.id}:${activeJob.status}`;
    if (loadedJobKeyRef.current === key) return;
    loadedJobKeyRef.current = key;
    setRevTitle(activeDraft.title || "");
    setRevExcerpt(activeDraft.excerpt || "");
    setRevContent(activeDraft.content_html || "");
    setRevCategoryId(activeDraft.category_id || categories[0]?.id || 1);
    setRevCover(activeDraft.cover || "");
    setRevComboTitle(activeDraft.combo_title || "");
    setRevProductIds(activeDraft.related_product_ids || []);
    setEditorRevision((v) => v + 1);
  }, [activeJob, activeDraft, categories]);

  function selectJobForReview(jobId: number) {
    loadedJobKeyRef.current = "";
    setActiveJobId(jobId);
    setReviewTab("edit");
    setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  // Instant URL check (YouTube detection + duplicate check)
  useEffect(() => {
    const trimmed = sourceUrl.trim();
    if (!trimmed || !/^https?:\/\/\S+\.\S+/i.test(trimmed)) {
      setDupInfo(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/post-import?check_url=${encodeURIComponent(trimmed)}`);
        const d = await res.json().catch(() => null);
        if (!cancelled && res.ok && d) {
          setDupInfo({
            isYoutube: Boolean(d.isYoutube),
            existingPost: d.existingPost ?? null,
            queuedJob: d.queuedJob ?? null,
          });
        }
      } catch {
        /* ignore */
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sourceUrl]);

  const hasQueued = useMemo(
    () =>
      jobs.some((j) =>
        ["queued", "researching", "writing", "generating_images"].includes(j.status),
      ),
    [jobs],
  );

  // Idle worker background polling
  useEffect(() => {
    if (!hasQueued || workerPaused) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        await fetch("/api/admin/post-import/idle-worker", { method: "POST" });
        const res = await fetch("/api/admin/post-import");
        if (res.ok && !cancelled) {
          const d = await res.json();
          if (Array.isArray(d.jobs)) setJobs(d.jobs);
          if (d.workerSummary) setSummary(d.workerSummary);
        }
      } catch {
        /* ignore transient */
      }
    }, 1400);
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
      const res = await fetch("/api/admin/post-import", {
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

  async function handleRegenerateImage(role: "cover" | "section", sectionIndex = 0) {
    if (!activeJob) return;
    const key = `${role}:${sectionIndex}`;
    setRegenKey(key);
    const customPrompt = prompt("Nhập mô tả thêm cho ảnh mới (hoặc để trống để AI tự vẽ theo chủ đề bài):");
    if (customPrompt === null) {
      setRegenKey("");
      return;
    }
    const res = await callApi(
      {
        action: "regenerate_image",
        job_id: activeJob.id,
        role,
        section_index: sectionIndex,
        custom_prompt: customPrompt,
      },
      "✓ Đã vẽ lại ảnh AI mới và tự động cập nhật vào bài viết!",
    );
    if (res?.job?.draft_json) {
      try {
        const updatedDraft = JSON.parse(res.job.draft_json) as PostDraftPayload;
        setRevCover(updatedDraft.cover || "");
        setRevContent(updatedDraft.content_html || "");
        setEditorRevision((v) => v + 1);
      } catch {
        /* ignore */
      }
    }
    setRegenKey("");
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

      {/* 0. Idle Worker Monitor */}
      <section
        className={`rounded-2xl border p-4 shadow-2xs ${
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
              {summary.state === "busy" ? "🧠" : "🟢"}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold text-gray-900">
                  {summary.state === "busy"
                    ? `Trợ lý AI đang chạy ngầm (${summary.queuedCount} bài trong hàng đợi)`
                    : "Trợ lý Nghiên cứu AI đang rảnh — Sẵn sàng nhận link bài viết / YouTube"}
                </h2>
                {summary.state === "busy" && (
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                    ETA toàn hàng đợi: {fmtEta(summary.totalEtaSeconds)}
                  </span>
                )}
                {summary.readyReviewCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                    📝 {summary.readyReviewCount} bài đã viết xong đang chờ bạn Review
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600">
                {summary.state === "busy" && summary.activeJob
                  ? `${summary.activeJob.title}: ${summary.activeJob.current_step} (${summary.activeJob.progress_pct}% · Còn ${fmtEta(summary.activeJob.estimated_seconds)})`
                  : "Dán link bài báo hoặc video YouTube bên dưới để AI tự lấy nội dung, nghiên cứu Đông–Tây Y, kiểm tra chuẩn y tế Google/YouTube và tạo bộ 3–5 ảnh thương hiệu."}
              </p>
            </div>
          </div>

          {summary.state === "busy" && (
            <button
              type="button"
              onClick={() => setWorkerPaused((p) => !p)}
              className="cursor-pointer rounded-xl border border-indigo-300 bg-white px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-50"
            >
              {workerPaused ? "▶ Tiếp tục chạy ngầm" : "⏸️ Tạm dừng"}
            </button>
          )}
        </div>

        {summary.state === "busy" && summary.activeJob && (
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full border border-indigo-100 bg-white">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
              style={{ width: `${Math.max(5, Math.min(100, summary.activeJob.progress_pct))}%` }}
            />
          </div>
        )}
      </section>

      {/* 1. Input Link / YouTube + Options */}
      <section className="rounded-2xl border bg-white p-5 shadow-2xs space-y-4">
        <div>
          <h2 className="text-base font-extrabold text-gray-900">
            1️⃣ Dán Link Bài viết hoặc Link Video YouTube để Nghiên cứu &amp; Viết Độc Bản
          </h2>
          <p className="text-xs text-gray-500">
            Với link YouTube, hệ thống tự động lấy Transcript lời nói trong video; có thể thêm 1–2 link tham khảo phụ để AI tổng hợp đa chiều.
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const extraUrls = extraUrlsText
              .split(/\r?\n/)
              .map((s) => s.trim())
              .filter(Boolean);
            const res = await callApi(
              {
                action: "create",
                source_url: sourceUrl,
                extra_urls: extraUrls,
                raw_text: showRawFallback ? rawTextOverride : "",
                tone_preset: tonePreset,
                images_count: imagesCount,
              },
              "✓ Đã đưa vào Hàng đợi Nghiên cứu & Viết bài độc bản chạy ngầm!",
            );
            if (res) {
              setSourceUrl("");
              setExtraUrlsText("");
              setRawTextOverride("");
            }
          }}
          className="space-y-3"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              required
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... hoặc https://trang-bai-viet..."
              className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={busy}
              className="cursor-pointer rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? "Đang xếp hàng..." : "🧠 Nghiên cứu & Tạo bài ngầm"}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            <div>
              <label className="mb-1 block font-bold text-gray-700">Phong cách chuyên gia</label>
              <select
                value={tonePreset}
                onChange={(e) => setTonePreset(e.target.value as PostTonePreset)}
                className="w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-900"
              >
                <option value="expert_east_west">🩺 Chuyên gia Thực dưỡng · Đông Tây Y kết hợp</option>
                <option value="practical_senior">👓 Hướng dẫn thực hành dễ hiểu cho người lớn tuổi</option>
                <option value="storytelling">🌿 Kể chuyện truyền cảm hứng & dẫn chứng khoa học</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-bold text-gray-700">Số ảnh AI tự tạo theo phong cách web</label>
              <select
                value={imagesCount}
                onChange={(e) => setImagesCount(Number(e.target.value))}
                className="w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-900"
              >
                <option value={3}>3 ảnh (1 Ảnh bìa + 2 Ảnh minh hoạ)</option>
                <option value={4}>4 ảnh (1 Ảnh bìa + 3 Ảnh minh hoạ)</option>
                <option value={5}>5 ảnh (1 Ảnh bìa + 4 Ảnh minh hoạ)</option>
              </select>
            </div>
            <div className="flex items-end gap-3 pb-1">
              <button
                type="button"
                onClick={() => setShowExtra((v) => !v)}
                className="cursor-pointer font-bold text-brand hover:underline"
              >
                {showExtra ? "− Ẩn link phụ" : "+ Thêm link tham khảo"}
              </button>
              <button
                type="button"
                onClick={() => setShowRawFallback((v) => !v)}
                className="cursor-pointer font-bold text-gray-600 hover:underline"
              >
                {showRawFallback ? "− Ẩn dán text" : "+ Dán Transcript/Text"}
              </button>
            </div>
          </div>

          {showExtra && (
            <textarea
              rows={2}
              value={extraUrlsText}
              onChange={(e) => setExtraUrlsText(e.target.value)}
              placeholder="Dán thêm tối đa 2 link bài viết / YouTube tham khảo (mỗi dòng 1 link) để AI tổng hợp đa chiều..."
              className="w-full rounded-xl border border-gray-300 p-3 font-mono text-xs outline-none focus:border-brand"
            />
          )}

          {showRawFallback && (
            <textarea
              rows={4}
              value={rawTextOverride}
              onChange={(e) => setRawTextOverride(e.target.value)}
              placeholder="Nếu video YouTube tắt phụ đề hoặc bài web chặn tải tự động, bạn dán nội dung / transcript vào đây..."
              className="w-full rounded-xl border border-gray-300 p-3 text-xs outline-none focus:border-brand"
            />
          )}
        </form>

        {dupInfo && (
          <div className="space-y-2 text-xs">
            {dupInfo.isYoutube && (
              <div className="rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-2 font-semibold text-red-900">
                🎬 Nhận diện Link YouTube: Hệ thống sẽ tự trích xuất Transcript lời nói từ video để phân tích &amp; viết lại.
              </div>
            )}
            {dupInfo.existingPost && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-amber-950">
                <span>
                  ⚠️ Link nguồn này trước đó đã xuất bản thành bài:{" "}
                  <strong>#{dupInfo.existingPost.id} — {dupInfo.existingPost.title}</strong>
                </span>
                <Link
                  href={`/admin/posts/${dupInfo.existingPost.id}/`}
                  className="rounded-lg bg-amber-600 px-3 py-1 font-bold text-white"
                >
                  Mở bài viết cũ ↗
                </Link>
              </div>
            )}
            {dupInfo.queuedJob && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-indigo-900">
                ⏳ Link này đang có trong hàng đợi (Job #{dupInfo.queuedJob.id} — {dupInfo.queuedJob.current_step} · {dupInfo.queuedJob.progress_pct}%).
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. Review & Publish Staging */}
      {activeJob && (
        <section
          ref={reviewSectionRef}
          className="scroll-mt-4 rounded-2xl border-2 border-emerald-300 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-gray-900">
                  2️⃣ Hồ sơ Nghiên cứu, Kiểm tra Y tế &amp; Chờ Review (#{activeJob.id})
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
                Nguồn ({activeJob.source_type === "youtube" ? "YouTube" : "Bài viết"}):{" "}
                <span className="font-mono">{activeJob.source_url}</span>
              </p>
            </div>
            {activeJob.post_id && (
              <Link
                href={`/admin/posts/${activeJob.post_id}/`}
                className="rounded-xl border border-brand px-3.5 py-1.5 text-xs font-extrabold text-brand hover:bg-emerald-50"
              >
                ✏️ Mở bài viết đã xuất bản #{activeJob.post_id} ↗
              </Link>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
            {/* Left Column: Intermediate Research + Policy Audit + AI Gallery */}
            <div className="space-y-4 text-xs">
              {activeResearch && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2.5">
                  <div className="font-extrabold text-emerald-950">
                    🔬 Bản Nghiên cứu Trung gian (Đông – Tây Y)
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">Luận điểm khoa học cốt lõi:</div>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5 text-gray-700">
                      {activeResearch.core_points.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">Góc nhìn Tây y / Sinh học:</div>
                    <p className="mt-0.5 text-gray-700">{activeResearch.western_medicine_view}</p>
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">Góc nhìn Đông y &amp; Thực dưỡng:</div>
                    <p className="mt-0.5 text-gray-700">{activeResearch.eastern_macrobiotic_view}</p>
                  </div>
                </div>
              )}

              {activeAudit && (
                <div
                  className={`rounded-xl border p-3.5 space-y-1.5 ${
                    activeAudit.safe
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                      : "border-amber-200 bg-amber-50 text-amber-950"
                  }`}
                >
                  <div className="font-extrabold">
                    🛡️ Chính sách Y tế Google / YouTube ({activeAudit.score}/100)
                  </div>
                  <div className="font-semibold">{activeAudit.status_label}</div>
                  {activeAudit.fixed_issues.length > 0 && (
                    <ul className="list-disc pl-4 text-[11px]">
                      {activeAudit.fixed_issues.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[11px] opacity-80">{activeAudit.warnings[0]}</p>
                </div>
              )}

              {/* Generated AI Images with Individual Regenerate */}
              {activeDraft && (activeDraft.cover || (activeDraft.images ?? []).length > 0) && (
                <div className="rounded-xl border bg-gray-50 p-3.5 space-y-2.5">
                  <div className="font-extrabold text-gray-900">
                    🎨 Bộ ảnh AI đồng bộ Thực Dưỡng ({(activeDraft.cover ? 1 : 0) + (activeDraft.images?.length || 0)} ảnh)
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {activeDraft.cover && (
                      <div className="space-y-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={revCover || activeDraft.cover}
                          alt="Ảnh bìa AI"
                          className="h-24 w-full rounded-lg border object-cover"
                        />
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-brand">Ảnh bìa</span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleRegenerateImage("cover", 0)}
                            className="cursor-pointer rounded border bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            {regenKey === "cover:0" ? "Đang vẽ..." : "🎨 Vẽ lại"}
                          </button>
                        </div>
                      </div>
                    )}
                    {(activeDraft.images ?? []).map((img, i) => (
                      <div key={`${img}-${i}`} className="space-y-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={`Ảnh minh hoạ ${i + 1}`}
                          className="h-24 w-full rounded-lg border object-cover"
                        />
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] text-gray-500">Minh hoạ #{i + 1}</span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleRegenerateImage("section", i)}
                            className="cursor-pointer rounded border bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            {regenKey === `section:${i}` ? "Đang vẽ..." : "🎨 Vẽ lại"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Final Review Editor with RichTextEditor + Preview + Source Compare */}
            <div className="space-y-3 text-xs">
              {!activeDraft ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
                  {activeJob.status === "failed"
                    ? `Phiên xử lý gặp lỗi: ${activeJob.error_message}`
                    : `Đang chạy ngầm: ${activeJob.current_step} (${activeJob.progress_pct}%)...`}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          ["edit", "📝 Biên tập Trực quan (Đầy đủ công cụ)"],
                          ["preview", "👁️ Xem trước Bài viết thật"],
                          ["compare", "🔬 Đối chiếu Tài liệu gốc"],
                        ] as const
                      ).map(([tabId, label]) => (
                        <button
                          key={tabId}
                          type="button"
                          onClick={() => setReviewTab(tabId)}
                          className={`cursor-pointer rounded-lg px-3 py-1.5 font-bold ${
                            reviewTab === tabId
                              ? "bg-brand text-white"
                              : "border bg-gray-50 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {reviewTab === "edit" && (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="mb-1 block font-bold text-gray-700">
                            Tiêu đề bài viết (Chỉnh sửa trước khi xuất bản) *
                          </label>
                          <input
                            value={revTitle}
                            onChange={(e) => setRevTitle(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-bold outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">
                            Chuyên mục bài viết (AI gợi ý) *
                          </label>
                          <select
                            value={revCategoryId}
                            onChange={(e) => setRevCategoryId(Number(e.target.value))}
                            className="w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-900"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.section_slug} / {c.name}
                                {activeResearch?.suggested_category_id === c.id ? " ★ (AI gợi ý)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">
                            Tiêu đề khối Sản phẩm gợi ý cuối bài
                          </label>
                          <input
                            value={revComboTitle}
                            onChange={(e) => setRevComboTitle(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-brand"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bold text-gray-700">Tóm tắt ngắn (Excerpt SEO)</label>
                        <textarea
                          rows={2}
                          value={revExcerpt}
                          onChange={(e) => setRevExcerpt(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-brand"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block font-bold text-gray-700">
                          Nội dung bài viết độc bản (Trình soạn thảo trực quan đầy đủ công cụ)
                        </label>
                        <RichTextEditor
                          key={`${activeJob.id}-${editorRevision}`}
                          name="review_content_html"
                          defaultValue={revContent}
                          onChange={setRevContent}
                        />
                      </div>

                      {products.length > 0 && (
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">
                            Sản phẩm liên quan gắn cuối bài ({revProductIds.length} đã chọn)
                          </label>
                          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-xl border bg-gray-50 p-2">
                            {products.slice(0, 24).map((p) => {
                              const on = revProductIds.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() =>
                                    setRevProductIds((prev) =>
                                      on ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                                    )
                                  }
                                  className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                                    on
                                      ? "border-brand bg-brand text-white"
                                      : "bg-white text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  {p.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {reviewTab === "preview" && (
                    <article className="rounded-2xl border bg-white p-5 space-y-4">
                      {revCover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={revCover}
                          alt={revTitle}
                          className="max-h-72 w-full rounded-xl object-cover"
                        />
                      )}
                      <h1 className="text-xl font-extrabold text-gray-900">{revTitle}</h1>
                      {revExcerpt && (
                        <p className="rounded-xl bg-emerald-50/70 p-3 text-xs italic text-emerald-950">
                          {revExcerpt}
                        </p>
                      )}
                      <div
                        className="prose-content text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: revContent }}
                      />
                    </article>
                  )}

                  {reviewTab === "compare" && (
                    <div className="rounded-xl border bg-gray-50 p-4 space-y-2">
                      <div className="font-extrabold text-gray-800">
                        📄 Văn bản / Transcript trích xuất từ nguồn gốc ({activeJob.source_url})
                      </div>
                      <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-white p-3 text-xs leading-relaxed text-gray-700">
                        {activeJob.raw_text || "Chưa có dữ liệu thô."}
                      </div>
                    </div>
                  )}

                  {!activeJob.post_id && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                      <label className="flex cursor-pointer items-center gap-2 font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={keepSourceUrl}
                          onChange={(e) => setKeepSourceUrl(e.target.checked)}
                          className="h-4 w-4 accent-brand"
                        />
                        Lưu kín link nguồn trong Admin để đối chiếu (tắt nếu muốn xoá dấu vết nguồn ngay)
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            callApi(
                              {
                                action: "save_review_draft",
                                job_id: activeJob.id,
                                title: revTitle,
                                excerpt: revExcerpt,
                                content_html: revContent,
                                category_id: revCategoryId,
                                cover: revCover,
                                related_product_ids: revProductIds,
                                combo_title: revComboTitle,
                              },
                              "✓ Đã lưu bản nháp chỉnh sửa & chấm điểm lại Chính sách Y tế!",
                            )
                          }
                          className="cursor-pointer rounded-xl border border-brand bg-white px-4 py-2.5 text-xs font-extrabold text-brand hover:bg-emerald-50 disabled:opacity-50"
                        >
                          💾 Lưu nháp &amp; Chấm điểm Y tế
                        </button>
                        <button
                          type="button"
                          disabled={busy || activeJob.status !== "ready_review"}
                          onClick={() =>
                            callApi(
                              {
                                action: "publish",
                                job_id: activeJob.id,
                                title: revTitle,
                                excerpt: revExcerpt,
                                content_html: revContent,
                                category_id: revCategoryId,
                                cover: revCover,
                                related_product_ids: revProductIds,
                                combo_title: revComboTitle,
                                keep_source_url: keepSourceUrl,
                              },
                              "✓ Đã xuất bản bài viết độc bản vào chuyên mục thành công!",
                            )
                          }
                          className="cursor-pointer rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white shadow hover:bg-brand-dark disabled:opacity-50"
                        >
                          🚀 Xuất bản vào Chuyên mục
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 3. History Table */}
      <section className="rounded-2xl border bg-white p-5 shadow-2xs space-y-3">
        <h2 className="text-base font-extrabold text-gray-900">
          📜 Hàng đợi &amp; Lịch sử Nghiên cứu Bài viết ({jobs.length})
        </h2>

        {jobs.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-500">
            Chưa có bài viết nào trong hàng đợi. Hãy dán link bài viết hoặc link YouTube ở khung trên.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-gray-50 uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2.5">Nguồn / Tiêu đề</th>
                  <th className="px-3 py-2.5">Trạng thái &amp; Tiến độ</th>
                  <th className="px-3 py-2.5">Ảnh AI</th>
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
                    <tr key={j.id} className={activeJob?.id === j.id ? "bg-emerald-50/40" : ""}>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => selectJobForReview(j.id)}
                          className="cursor-pointer text-left font-bold text-gray-900 hover:text-brand"
                        >
                          {j.post_title || `Phiên #${j.id} (${j.source_type === "youtube" ? "YouTube" : "Web"})`}
                        </button>
                        <div className="max-w-xs truncate font-mono text-[11px] text-gray-400">
                          {j.source_url}
                        </div>
                        {j.error_message && (
                          <div className="text-[11px] text-red-600">{j.error_message}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 space-y-1">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <div className="text-[11px] text-gray-600">
                          {j.current_step} · <strong>{j.progress_pct}%</strong>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {j.images_done}/{j.images_target} ảnh
                      </td>
                      <td className="px-3 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => selectJobForReview(j.id)}
                          className={`cursor-pointer rounded px-2.5 py-1 font-bold ${
                            activeJob?.id === j.id
                              ? "bg-brand text-white"
                              : "border text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {activeJob?.id === j.id ? "Đang Review ↑" : "Review"}
                        </button>
                        {j.status === "failed" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              callApi({ action: "retry_job", job_id: j.id }, "✓ Đã xếp hàng thử lại!")
                            }
                            className="cursor-pointer rounded border border-amber-300 bg-amber-50 px-2 py-1 font-bold text-amber-800"
                          >
                            ↻ Thử lại
                          </button>
                        )}
                        {j.post_id && !j.source_cleared && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              callApi(
                                { action: "clear_source", post_id: j.post_id },
                                "✓ Đã xoá dấu vết link nguồn khỏi bài viết.",
                              )
                            }
                            className="cursor-pointer rounded border border-amber-200 px-2 py-1 font-semibold text-amber-800"
                          >
                            🧹 Xoá note nguồn
                          </button>
                        )}
                        {j.post_id && (
                          <Link
                            href={`/admin/posts/${j.post_id}/`}
                            className="inline-block rounded border border-brand px-2 py-1 font-bold text-brand"
                          >
                            Sửa bài
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
