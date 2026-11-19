"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";

type TabKey = "basic" | "media" | "content";

export default function ProductEditTabs({
  isNew,
  productUrl,
  checks,
  basicTab,
  mediaTab,
  contentTab,
}: {
  isNew: boolean;
  productUrl?: string;
  checks: {
    hasBasic: boolean;
    hasPrice: boolean;
    hasMedia: boolean;
    hasDescription: boolean;
  };
  basicTab: ReactNode;
  mediaTab: ReactNode;
  contentTab: ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("basic");

  const tabs: { key: TabKey; step: string; label: string; hint: string; done: boolean }[] = [
    {
      key: "basic",
      step: "Bước 1",
      label: "Thông tin & Giá bán",
      hint: "Tên, danh mục, giá, tồn kho, xuất xứ",
      done: checks.hasBasic && checks.hasPrice,
    },
    {
      key: "media",
      step: "Bước 2",
      label: "Hình ảnh & Video",
      hint: "Ảnh bìa, bộ sưu tập, video YouTube",
      done: checks.hasMedia,
    },
    {
      key: "content",
      step: "Bước 3",
      label: "Mô tả chi tiết & AI",
      hint: "Soạn thảo sạch & viết lại bằng AI",
      done: checks.hasDescription,
    },
  ];

  const activeIdx = tabs.findIndex((t) => t.key === tab);

  return (
    <div className="space-y-5">
      {/* Quick Completeness Checklist + 3-Step Tab Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-gray-500 mr-1">Tình trạng hồ sơ:</span>
            <button
              type="button"
              onClick={() => setTab("basic")}
              className={`rounded-full px-2.5 py-0.5 font-semibold transition cursor-pointer ${
                checks.hasBasic
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {checks.hasBasic ? "✓" : "•"} Tên &amp; Danh mục
            </button>
            <button
              type="button"
              onClick={() => setTab("basic")}
              className={`rounded-full px-2.5 py-0.5 font-semibold transition cursor-pointer ${
                checks.hasPrice
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {checks.hasPrice ? "✓" : "•"} Giá bán
            </button>
            <button
              type="button"
              onClick={() => setTab("media")}
              className={`rounded-full px-2.5 py-0.5 font-semibold transition cursor-pointer ${
                checks.hasMedia
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {checks.hasMedia ? "✓" : "•"} Ảnh bìa
            </button>
            <button
              type="button"
              onClick={() => setTab("content")}
              className={`rounded-full px-2.5 py-0.5 font-semibold transition cursor-pointer ${
                checks.hasDescription
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {checks.hasDescription ? "✓" : "•"} Mô tả chi tiết
            </button>
          </div>
          <span className="text-[11px] text-gray-400">
            Chuyển tab tự do — bấm Lưu ở dưới sẽ lưu cả 3 bước
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition cursor-pointer ${
                  active
                    ? "border-brand bg-green-50/70 shadow-xs ring-1 ring-brand/20"
                    : "border-gray-200 bg-gray-50/60 hover:border-gray-300 hover:bg-white"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
                    active
                      ? "bg-brand text-white"
                      : item.done
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {item.done && !active ? "✓" : item.step.replace("Bước ", "")}
                </span>
                <div className="min-w-0">
                  <div className={`text-xs font-extrabold ${active ? "text-brand" : "text-gray-800"}`}>
                    {item.step}: {item.label}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-gray-500">{item.hint}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Keep all 3 panels mounted via CSS hidden so one form submission saves everything */}
      <div className={tab === "basic" ? "space-y-5" : "hidden"}>{basicTab}</div>
      <div className={tab === "media" ? "space-y-5" : "hidden"}>{mediaTab}</div>
      <div className={tab === "content" ? "space-y-5" : "hidden"}>{contentTab}</div>

      {/* Sticky Action Bar */}
      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 px-5 py-3 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {activeIdx > 0 && (
            <button
              type="button"
              onClick={() => setTab(tabs[activeIdx - 1].key)}
              className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              ← {tabs[activeIdx - 1].step}
            </button>
          )}
          {activeIdx < tabs.length - 1 && (
            <button
              type="button"
              onClick={() => setTab(tabs[activeIdx + 1].key)}
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
            >
              Tiếp: {tabs[activeIdx + 1].label} →
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/products/"
            className="rounded-xl border px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            ← Danh sách
          </Link>
          {productUrl && (
            <a
              href={productUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-brand/40 bg-green-50 px-3.5 py-2 text-xs font-bold text-brand hover:bg-brand hover:text-white transition"
            >
              👁️ Xem ngoài trang ↗
            </a>
          )}
          <button
            type="submit"
            className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-dark cursor-pointer"
          >
            {isNew ? "＋ Tạo sản phẩm mới" : "💾 Lưu sản phẩm"}
          </button>
        </div>
      </div>
    </div>
  );
}
