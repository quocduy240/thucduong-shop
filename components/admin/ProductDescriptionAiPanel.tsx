"use client";

import { useRef, useState } from "react";
import { formatEtaText, useAiIdleQueue } from "./AiIdleQueueProvider";

type StylePreset = "expert_east_west" | "seo_sales" | "senior_friendly";

function getDomainFromUrl(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  try {
    return new URL(s.includes("://") ? s : `https://${s}`).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export default function ProductDescriptionAiPanel({
  targetName = "description",
  sourceUrl = "",
}: {
  targetName?: string;
  sourceUrl?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { enqueueAiTask, getTaskByKey } = useAiIdleQueue();
  const taskKey = `product_rewrite:${targetName}`;
  const queueTask = getTaskByKey(taskKey);

  const [configOpen, setConfigOpen] = useState(false);
  const [stylePreset, setStylePreset] = useState<StylePreset>("expert_east_west");
  const [customInstruction, setCustomInstruction] = useState("");
  const [stripPhones, setStripPhones] = useState(true);
  const [stripBuyButtons, setStripBuyButtons] = useState(true);
  const [stripExternalDomains, setStripExternalDomains] = useState(true);
  const [stripOldImages, setStripOldImages] = useState(true);
  const [extraBlockedDomains, setExtraBlockedDomains] = useState(() => getDomainFromUrl(sourceUrl));

  const [busy, setBusy] = useState(false);
  const [undoHtml, setUndoHtml] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  function readFieldValue(fieldName: string): string {
    const form = rootRef.current?.closest("form");
    const el = (form?.querySelector(`[name="${fieldName}"]`) ??
      document.querySelector(`[name="${fieldName}"]`)) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    return el?.value ?? "";
  }

  function dispatchReplace(nextHtml: string, bannerText: string) {
    window.dispatchEvent(
      new CustomEvent("td:replace-html", {
        detail: { targetName, html: nextHtml, statusMsg: bannerText },
      }),
    );
  }

  async function handleRewrite() {
    setBusy(true);
    setErrMsg("");
    setStatusMsg("");
    try {
      const currentHtml = readFieldValue(targetName);
      setUndoHtml(currentHtml);
      const productName = readFieldValue("name");

      await enqueueAiTask({
        key: taskKey,
        kind: "product_rewrite",
        title: `Viết lại mô tả${productName ? `: ${productName.slice(0, 24)}` : ""}`,
        run: async () => {
          const res = await fetch("/api/admin/products/ai-rewrite/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productName,
              brand: readFieldValue("brand"),
              origin: readFieldValue("origin"),
              unit: readFieldValue("unit"),
              html: currentHtml,
              sourceUrl,
              stylePreset,
              customInstruction,
              stripPhones,
              stripBuyButtons,
              stripExternalDomains,
              stripOldImages,
              extraBlockedDomains,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || "Không thể viết lại mô tả sản phẩm.");
          }

          const s = data.stats ?? {
            removedImages: 0,
            removedPhones: 0,
            removedButtons: 0,
            removedDomains: 0,
          };
          const cleanSummary = `Đã lọc: ${s.removedImages ?? 0} ảnh cũ · ${s.removedPhones ?? 0} SĐT · ${s.removedButtons ?? 0} nút mua · ${s.removedDomains ?? 0} domain/link ngoài`;
          const okText = `${data.usedAi ? "✨ AI đã viết lại & tự trang trí chuẩn Thực Dưỡng" : "✓ Đã làm sạch & trình bày lại mô tả"} (${cleanSummary}). Nhớ bấm Lưu Thông Tin Sản Phẩm!`;

          dispatchReplace(data.html, okText);
          setStatusMsg(okText);
        },
      });
    } catch (e) {
      setErrMsg((e as Error).message || "Lỗi kết nối máy chủ khi gọi AI viết lại.");
    } finally {
      setBusy(false);
    }
  }

  function handleUndo() {
    if (undoHtml === null) return;
    dispatchReplace(undoHtml, "↩️ Đã hoàn tác về nội dung mô tả trước đó.");
    setStatusMsg("↩️ Đã hoàn tác về nội dung mô tả trước đó.");
    setErrMsg("");
    setUndoHtml(null);
  }

  return (
    <div
      ref={rootRef}
      className="mt-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-emerald-50/40 to-white p-3.5 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleRewrite}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <span>✨</span>
            <span>{busy ? "Đang lọc & viết lại bằng AI..." : "Viết lại bằng AI"}</span>
          </button>

          <button
            type="button"
            onClick={() => setConfigOpen((v) => !v)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-indigo-900 hover:bg-indigo-50"
          >
            <span>⚙️</span>
            <span>{configOpen ? "Ẩn cấu hình" : "Cấu hình cách viết"}</span>
          </button>

          {undoHtml !== null && (
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
            >
              <span>↩️ Hoàn tác bản cũ</span>
            </button>
          )}
        </div>

        <span className="text-[11px] text-gray-500">
          Mặc định: xoá ảnh &amp; HTML/CSS cũ · lọc SĐT/domain · tự trang trí khối màu &amp; icon
        </span>
      </div>

      {configOpen && (
        <div className="rounded-xl border border-indigo-100 bg-white p-3.5 text-xs space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block font-bold text-gray-700">Phong cách viết lại</label>
              <select
                value={stylePreset}
                onChange={(e) => setStylePreset(e.target.value as StylePreset)}
                className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-800"
              >
                <option value="expert_east_west">🩺 Chuyên gia Thực dưỡng (Đông–Tây Y &amp; YMYL)</option>
                <option value="seo_sales">🛍️ Chuẩn SEO &amp; Tăng chuyển đổi bán hàng</option>
                <option value="senior_friendly">👵 Mạch lạc, dễ đọc cho người lớn tuổi</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-bold text-gray-700">
                Tên miền nguồn / web khác cần lọc bỏ
              </label>
              <input
                type="text"
                value={extraBlockedDomains}
                onChange={(e) => setExtraBlockedDomains(e.target.value)}
                placeholder="VD: thucduongthienan.com, tienkhang.com (cách nhau dấu phẩy)"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-bold text-gray-700">
              Hướng dẫn cách viết thêm (tuỳ chọn)
            </label>
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="VD: Thêm bảng hướng dẫn cách pha chế, nhấn mạnh đối tượng người ăn chay thực dưỡng..."
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={stripOldImages}
                onChange={(e) => setStripOldImages(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-indigo-600"
              />
              <span>Bỏ hết link ảnh cũ trong mô tả</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={stripPhones}
                onChange={(e) => setStripPhones(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-indigo-600"
              />
              <span>Lọc bỏ số điện thoại / Zalo</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={stripBuyButtons}
                onChange={(e) => setStripBuyButtons(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-indigo-600"
              />
              <span>Lọc bỏ nút mua hàng web nguồn</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={stripExternalDomains}
                onChange={(e) => setStripExternalDomains(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-indigo-600"
              />
              <span>Lọc bỏ tên miền &amp; link trang web khác</span>
            </label>
          </div>
        </div>
      )}

      {busy && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-xs font-extrabold text-white shadow-sm">
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-ping rounded-full bg-white" />
            <span>
              {queueTask?.status === "queued"
                ? `⏳ Đang chờ lượt trong Idle Queue (Vị trí #${queueTask.queuePosition})`
                : "⚡ AI đang lọc sạch & viết lại mô tả tuần tự..."}
            </span>
          </span>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px]">
            Còn {formatEtaText(queueTask?.remainingSeconds ?? 10)}
          </span>
        </div>
      )}

      {(statusMsg || errMsg) && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
            errMsg
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {errMsg || statusMsg}
        </div>
      )}
    </div>
  );
}
