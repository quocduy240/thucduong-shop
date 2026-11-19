"use client";

import { useRef, useState } from "react";

function trimAtWord(text: string, maxLen: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

export default function SeoPanel({
  entityType,
  defaultSeoTitle = "",
  defaultSeoDescription = "",
  defaultSeoKeywords = "",
  titleFieldName,
  summaryFieldName,
  imageFieldName,
  defaultTitle = "",
  defaultSummary = "",
  defaultSlug = "",
  defaultImage = "",
  urlPrefix = "https://thucduongshop.duyvo.win/",
}: {
  entityType: "product" | "post";
  defaultSeoTitle?: string;
  defaultSeoDescription?: string;
  defaultSeoKeywords?: string;
  titleFieldName: string;
  summaryFieldName: string;
  imageFieldName: string;
  defaultTitle?: string;
  defaultSummary?: string;
  defaultSlug?: string;
  defaultImage?: string;
  urlPrefix?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [seoTitle, setSeoTitle] = useState(defaultSeoTitle);
  const [seoDesc, setSeoDesc] = useState(defaultSeoDescription);
  const [seoKeywords, setSeoKeywords] = useState(defaultSeoKeywords);

  function readFormField(name: string, fallback: string): string {
    const form = rootRef.current?.closest("form");
    const el = form?.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
    return el?.value?.trim() || fallback;
  }

  function autoFillFromForm() {
    const rawTitle = readFormField(titleFieldName, defaultTitle);
    const rawSummary = readFormField(summaryFieldName, defaultSummary);
    if (rawTitle) setSeoTitle(trimAtWord(rawTitle, 60));
    if (rawSummary) {
      setSeoDesc(trimAtWord(rawSummary, 155));
    } else if (rawTitle) {
      setSeoDesc(
        trimAtWord(
          entityType === "product"
            ? `${rawTitle} chính hãng tại Thực Dưỡng Phúc Thọ. Tư vấn thực dưỡng chuẩn, giao hàng toàn quốc.`
            : `${rawTitle} - Kiến thức Thực dưỡng & Sức khoẻ tự nhiên tại Thực Dưỡng Phúc Thọ.`,
          155,
        ),
      );
    }
    if (!seoKeywords.trim() && rawTitle) {
      const words = rawTitle
        .toLowerCase()
        .replace(/[()[\],.:;!?/\\-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2)
        .slice(0, 5)
        .join(" ");
      if (words) setSeoKeywords(words);
    }
  }

  const effectiveTitle = seoTitle.trim() || defaultTitle || (entityType === "product" ? "Tên sản phẩm" : "Tiêu đề bài viết");
  const effectiveDesc =
    seoDesc.trim() ||
    defaultSummary ||
    "Mô tả ngắn sẽ hiển thị dưới tiêu đề trên kết quả tìm kiếm Google.";
  const previewSlug = defaultSlug || "duong-dan-than-thien";

  const titleLen = effectiveTitle.length;
  const descLen = effectiveDesc.length;
  const firstKw = seoKeywords.split(",")[0]?.trim().toLowerCase() || "";

  const checks = [
    {
      ok: titleLen >= 25 && titleLen <= 65,
      label: `Tiêu đề chuẩn Google (25–65 ký tự, hiện tại: ${titleLen})`,
    },
    {
      ok: descLen >= 70 && descLen <= 165,
      label: `Mô tả chuẩn Google (70–165 ký tự, hiện tại: ${descLen})`,
    },
    {
      ok: Boolean(firstKw) && (effectiveTitle.toLowerCase().includes(firstKw) || effectiveDesc.toLowerCase().includes(firstKw)),
      label: firstKw ? `Từ khoá chính "${firstKw}" có trong Tiêu đề hoặc Mô tả` : "Chưa nhập từ khoá chính",
    },
    {
      ok: !previewSlug.includes(" ") && previewSlug.length <= 80,
      label: "Đường dẫn URL (Slug) ngắn gọn, thân thiện SEO",
    },
    {
      ok: Boolean(defaultImage.trim()),
      label: `Có ảnh đại diện (${imageFieldName === "image" ? "Ảnh sản phẩm" : "Ảnh bìa"}) chia sẻ MXH`,
    },
  ];

  const score = checks.filter((c) => c.ok).length * 20;
  const scoreBadge =
    score >= 80
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : score >= 60
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-red-100 text-red-700 border-red-200";

  return (
    <div ref={rootRef} className="rounded-2xl border border-blue-200 bg-blue-50/20 p-4 space-y-3">
      <details className="group">
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 select-none">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-gray-900">
              🔍 Tối ưu SEO Google (SERP Preview &amp; Chấm điểm)
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${scoreBadge}`}>
              {score}/100 điểm {score >= 80 ? "· Tốt" : score >= 60 ? "· Khá" : "· Cần bổ sung"}
            </span>
          </div>
          <span className="text-xs font-semibold text-blue-700 group-open:hidden">Mở tuỳ chỉnh SEO ▾</span>
          <span className="hidden text-xs font-semibold text-blue-700 group-open:inline">Thu gọn ▴</span>
        </summary>

        <div className="mt-4 space-y-4 border-t border-blue-100 pt-4">
          {/* Live Google SERP Preview */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-1 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Xem trước trên kết quả tìm kiếm Google
            </div>
            <div className="truncate text-xs text-emerald-700">
              {urlPrefix}
              {previewSlug}.html
            </div>
            <div className="text-base font-medium text-[#1a0dab] leading-snug line-clamp-1">
              {effectiveTitle}
            </div>
            <div className="text-xs text-gray-600 leading-relaxed line-clamp-2">{effectiveDesc}</div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              Nếu để trống, hệ thống tự dùng Tên và Tóm tắt của {entityType === "product" ? "sản phẩm" : "bài viết"}.
            </p>
            <button
              type="button"
              onClick={autoFillFromForm}
              className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 cursor-pointer"
            >
              ⚡ Tự điền SEO gợi ý
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <label className="font-bold text-gray-700">Tiêu đề SEO (Meta Title)</label>
                <span className={titleLen > 65 ? "font-bold text-red-600" : "text-gray-500"}>
                  {seoTitle.length}/60 ký tự
                </span>
              </div>
              <input
                name="seo_title"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={defaultTitle ? `Mặc định: ${defaultTitle}` : "Nhập tiêu đề hấp dẫn chuẩn SEO (50–60 ký tự)"}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">
                Từ khoá chính (cách nhau bởi dấu phẩy)
              </label>
              <input
                name="seo_keywords"
                value={seoKeywords}
                onChange={(e) => setSeoKeywords(e.target.value)}
                placeholder="VD: canh dưỡng sinh, thực dưỡng, kiềm hoá"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand"
              />
            </div>

            <div className="md:col-span-2">
              <div className="mb-1 flex items-center justify-between text-xs">
                <label className="font-bold text-gray-700">Mô tả SEO (Meta Description)</label>
                <span className={descLen > 165 ? "font-bold text-red-600" : "text-gray-500"}>
                  {seoDesc.length}/160 ký tự
                </span>
              </div>
              <textarea
                name="seo_description"
                rows={2}
                value={seoDesc}
                onChange={(e) => setSeoDesc(e.target.value)}
                placeholder="Tóm tắt lợi ích nổi bật giúp khách bấm vào kết quả trên Google (120–160 ký tự)..."
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* 5-Point SEO Checklist */}
          <div className="grid gap-1.5 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-2">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-xs">
                <span className={c.ok ? "font-bold text-emerald-600" : "font-bold text-amber-600"}>
                  {c.ok ? "✓" : "•"}
                </span>
                <span className={c.ok ? "text-gray-700" : "text-gray-500"}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
