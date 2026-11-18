"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CONSULT_CONDITIONS,
  CONSULT_GOALS,
  CONSULT_HABITS,
  CONSULT_MOTIFS,
} from "@/lib/quick-consult-options";
import type {
  MatchedDocumentCard,
  MatchedProductGroup,
  MatchedVideoCard,
} from "@/lib/quick-consult";

type ConsultResult = {
  id: number;
  motif: { id: string; name: string; badge: string };
  articleHtml: string;
  productGroups: MatchedProductGroup[];
  videos: MatchedVideoCard[];
  documents: MatchedDocumentCard[];
};

function formatVnd(n: number) {
  return `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
}

export default function QuickConsultClient({
  hotline,
  zaloUrl,
}: {
  hotline: string;
  zaloUrl: string;
}) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [ageSex, setAgeSex] = useState("");
  const [needs, setNeeds] = useState<string[]>([CONSULT_GOALS[0]]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [habits, setHabits] = useState<string[]>([]);
  const [motifId, setMotifId] = useState<string>(CONSULT_MOTIFS[0].id);
  const [customNote, setCustomNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<ConsultResult | null>(null);

  // Cart quick-add state
  const [addedIds, setAddedIds] = useState<Record<number, boolean>>({});

  // Follow-up state (Option 1: Hotline, Option 2: Advanced Free/Paid)
  const [followupPanel, setFollowupPanel] = useState<"none" | "advanced">("none");
  const [advancedTier, setAdvancedTier] = useState<"advanced_free" | "advanced_paid">("advanced_free");
  const [followupPhone, setFollowupPhone] = useState("");
  const [followupEmail, setFollowupEmail] = useState("");
  const [followupNote, setFollowupNote] = useState("");
  const [followupMsg, setFollowupMsg] = useState("");
  const [followupBusy, setFollowupBusy] = useState(false);

  function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  async function runQuickConsult() {
    setErr("");
    setFollowupMsg("");
    setBusy(true);
    try {
      const res = await fetch("/api/quick-consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          ageSex,
          needs,
          conditions,
          habits,
          motifId,
          customNote,
        }),
      });
      const data = (await res.json()) as ConsultResult & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Không thể phân tích tư vấn lúc này.");
      }
      setResult(data);
      setFollowupPhone(phone);
      setTimeout(() => {
        document.getElementById("quick-consult-result")?.scrollIntoView({ behavior: "smooth" });
      }, 120);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addToCart(productId: number) {
    try {
      const res = await fetch(`/api/v2/add-to-cart/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      });
      if (res.ok) {
        setAddedIds((prev) => ({ ...prev, [productId]: true }));
      }
    } catch {
      /* ignore */
    }
  }

  async function submitFollowup(choice: "hotline" | "advanced_free" | "advanced_paid") {
    if (!result) return;
    setFollowupBusy(true);
    setFollowupMsg("");
    try {
      const res = await fetch("/api/quick-consult/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: result.id,
          followupChoice: choice,
          phone: followupPhone || phone,
          email: followupEmail,
          note: followupNote,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Không thể gửi yêu cầu.");
      setFollowupMsg(data.message || "Đã ghi nhận yêu cầu của bạn!");
    } catch (e) {
      setFollowupMsg(`Lỗi: ${(e as Error).message}`);
    } finally {
      setFollowupBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Step 1: Intake Form */}
      <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-7 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">Họ tên / Danh xưng</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="VD: Chị Lan / Anh Minh"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">Số điện thoại / Zalo</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0909 xxx xxx"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">Tuổi &amp; Giới tính</label>
            <input
              value={ageSex}
              onChange={(e) => setAgeSex(e.target.value)}
              placeholder="VD: 45 tuổi, Nữ"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        {/* Checkboxes 1: Nhu cầu chính */}
        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-gray-900">1. Nhu cầu chăm sóc sức khoẻ của bạn (Chọn nhiều):</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CONSULT_GOALS.map((g) => {
              const checked = needs.includes(g);
              return (
                <label
                  key={g}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs font-medium transition ${
                    checked
                      ? "border-brand bg-emerald-50 text-brand shadow-xs"
                      : "border-gray-200 bg-gray-50/60 text-gray-700 hover:border-emerald-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleItem(needs, setNeeds, g)}
                    className="mt-0.5 accent-brand"
                  />
                  <span>{g}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Checkboxes 2: Tình trạng sức khoẻ */}
        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-gray-900">2. Tình trạng sức khoẻ &amp; biểu hiện hiện tại:</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CONSULT_CONDITIONS.map((c) => {
              const checked = conditions.includes(c);
              return (
                <label
                  key={c}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs font-medium transition ${
                    checked
                      ? "border-amber-500 bg-amber-50 text-amber-900 shadow-xs"
                      : "border-gray-200 bg-gray-50/60 text-gray-700 hover:border-amber-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleItem(conditions, setConditions, c)}
                    className="mt-0.5 accent-amber-600"
                  />
                  <span>{c}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Checkboxes 3: Thói quen */}
        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-gray-900">3. Thói quen ăn uống &amp; mức độ thực hành Thực dưỡng:</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CONSULT_HABITS.map((h) => {
              const checked = habits.includes(h);
              return (
                <label
                  key={h}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs font-medium transition ${
                    checked
                      ? "border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-xs"
                      : "border-gray-200 bg-gray-50/60 text-gray-700 hover:border-emerald-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleItem(habits, setHabits, h)}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <span>{h}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Motif Expert Model Selector */}
        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-gray-900">
            4. Chọn Mô hình Chuyên gia Thực dưỡng AI phân tích cho bạn:
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {CONSULT_MOTIFS.map((m) => {
              const active = motifId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMotifId(m.id)}
                  className={`rounded-xl border-2 p-3.5 text-left transition cursor-pointer ${
                    active
                      ? "border-brand bg-green-50/70 shadow-sm"
                      : "border-gray-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <span className="inline-block rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold text-brand">
                    {m.badge}
                  </span>
                  <div className="mt-1.5 text-sm font-bold text-gray-900">{m.name}</div>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">{m.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Note */}
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">
            5. Mô tả thêm tình trạng hoặc câu hỏi riêng của bạn (tuỳ chọn):
          </label>
          <textarea
            rows={3}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="VD: Tôi bị đau dạ dày 2 năm nay, sáng hay mệt, muốn tìm thực đơn gạo lứt và trà hỗ trợ tiêu hoá..."
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-gray-500">
            ✨ Hệ thống AI Chuyên gia sẽ tổng hợp bài tư vấn + video + tài liệu + bộ sản phẩm phù hợp nhất cho bạn.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={runQuickConsult}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-emerald-600 px-7 py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
          >
            <span>{busy ? "⏳" : "🌿"}</span>
            <span>{busy ? "Chuyên gia AI đang phân tích hồ sơ..." : "Tư Vấn Nhanh Ngay"}</span>
          </button>
        </div>
      </section>

      {/* Step 2: Comprehensive Result */}
      {result && (
        <div id="quick-consult-result" className="space-y-8">
          {/* AI Expert Consultation Article */}
          <article className="rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-sm md:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  {result.motif.badge} · Hồ sơ #{result.id}
                </span>
                <h2 className="mt-2 text-xl font-bold text-brand md:text-2xl">
                  Bài Viết Tư Vấn Từ {result.motif.name}
                </h2>
              </div>
            </div>
            <div
              className="prose-content max-w-none text-sm leading-relaxed md:text-base"
              dangerouslySetInnerHTML={{ __html: result.articleHtml }}
            />
          </article>

          {/* Product Blocks by Category (Thức ăn -> Trợ phương -> Dược thảo) */}
          {result.productGroups.length > 0 && (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  🛍️ Bộ Sản Phẩm Khuyên Dùng Theo Từng Nhóm Danh Mục
                </h2>
                <p className="text-sm text-gray-500">
                  Phối hợp đồng bộ từ Thức ăn nền tảng, Trợ phương thực dưỡng đến Dược thảo tự nhiên.
                </p>
              </div>
              <div className="space-y-6">
                {result.productGroups.map((group) => (
                  <div key={group.groupKey} className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-brand">{group.groupTitle}</h3>
                      <p className="text-xs text-gray-500">{group.groupSubtitle}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col justify-between rounded-xl border border-gray-200 p-3 transition hover:border-brand hover:shadow-sm"
                        >
                          <div>
                            <Link href={item.href} className="block overflow-hidden rounded-lg bg-gray-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.image || "/placeholder.png"}
                                alt={item.name}
                                className="aspect-square w-full object-cover"
                              />
                            </Link>
                            <div className="mt-2 text-[11px] font-medium text-emerald-700">
                              {item.category_name}
                            </div>
                            <Link
                              href={item.href}
                              className="mt-0.5 line-clamp-2 text-sm font-bold text-gray-900 hover:text-brand"
                            >
                              {item.name}
                            </Link>
                          </div>
                          <div className="mt-3 space-y-2">
                            <div className="text-sm font-bold text-accent">
                              {formatVnd(item.sale_price ?? item.price)}
                            </div>
                            <button
                              type="button"
                              onClick={() => addToCart(item.id)}
                              className={`w-full rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                addedIds[item.id]
                                  ? "bg-emerald-600 text-white"
                                  : "bg-green-50 text-brand hover:bg-brand hover:text-white"
                              }`}
                            >
                              {addedIds[item.id] ? "✓ Đã thêm vào giỏ" : "🛒 Thêm vào giỏ"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Video & Document Resource Blocks */}
          {(result.videos.length > 0 || result.documents.length > 0) && (
            <div className="grid gap-6 lg:grid-cols-2">
              {result.videos.length > 0 && (
                <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900">🎬 Video Bài Giảng Liên Quan</h3>
                    <Link href="/video/" className="text-xs font-semibold text-brand hover:underline">
                      Xem tất cả →
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {result.videos.map((v) => (
                      <a
                        key={v.id}
                        href={`https://www.youtube.com/watch?v=${v.youtube_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex gap-3 rounded-xl border border-gray-200 p-2.5 transition hover:border-brand hover:bg-green-50/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`}
                          alt={v.title}
                          className="h-20 w-32 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-emerald-700">{v.topic}</div>
                          <div className="line-clamp-2 text-sm font-bold text-gray-900">{v.title}</div>
                          {v.description && (
                            <div className="mt-1 line-clamp-1 text-[11px] text-gray-500">{v.description}</div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {result.documents.length > 0 && (
                <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900">📚 Tài Liệu &amp; Sách Thực Dưỡng</h3>
                    <Link href="/tai-lieu/" className="text-xs font-semibold text-brand hover:underline">
                      Kho tài liệu →
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {result.documents.map((d) => (
                      <Link
                        key={d.id}
                        href="/tai-lieu/"
                        className="block rounded-xl border border-gray-200 p-3 transition hover:border-brand hover:bg-green-50/40"
                      >
                        <div className="text-[11px] font-semibold text-amber-700">
                          {d.category} {d.author ? `· ${d.author}` : ""}
                        </div>
                        <div className="mt-0.5 text-sm font-bold text-gray-900">{d.title}</div>
                        {d.summary && <p className="mt-1 line-clamp-2 text-xs text-gray-600">{d.summary}</p>}
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* 2 Next-Step Consultation Options */}
          <section className="rounded-2xl border-2 border-brand/30 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 shadow-sm space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                🤝 Bạn muốn được đồng hành chuyên sâu hơn?
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Chọn 1 trong 2 hình thức kết nối tiếp theo cùng đội ngũ Chuyên gia Thực dưỡng của chúng tôi:
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Option 1: Hotline Expert */}
              <div className="flex flex-col justify-between rounded-2xl border border-emerald-300 bg-white p-5 shadow-xs space-y-4">
                <div>
                  <span className="inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                    Tuỳ chọn 1 · Kết nối trực tiếp
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-gray-900">
                    📞 Tư Vấn Cùng Chuyên Gia Hotline
                  </h3>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                    Trao đổi nhanh trực tiếp qua điện thoại hoặc Zalo về cách phối hợp thức ăn, trợ phương và dược thảo theo hồ sơ vừa phân tích.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`tel:${hotline.replace(/\s+/g, "")}`}
                    onClick={() => void submitFollowup("hotline")}
                    className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-center text-xs font-bold text-white hover:bg-brand-dark"
                  >
                    📞 Gọi Hotline {hotline}
                  </a>
                  {zaloUrl && (
                    <a
                      href={zaloUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => void submitFollowup("hotline")}
                      className="rounded-xl border border-blue-500 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                    >
                      💬 Chat Zalo
                    </a>
                  )}
                </div>
              </div>

              {/* Option 2: Advanced Consultation (Free or Paid) */}
              <div className="flex flex-col justify-between rounded-2xl border border-amber-300 bg-white p-5 shadow-xs space-y-4">
                <div>
                  <span className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800">
                    Tuỳ chọn 2 · Lộ trình chuyên sâu
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-gray-900">
                    🌟 Tư Vấn Nâng Cao (Miễn Phí / Trả Phí)
                  </h3>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                    Chọn <strong>Gói Miễn phí</strong> (hỏi đáp chuyên đề &amp; gợi ý thực đơn mẫu) hoặc <strong>Gói Trả phí 1-1</strong> (đọc kết quả xét nghiệm, thiết kế thực đơn cá nhân hoá theo tuần).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFollowupPanel((p) => (p === "advanced" ? "none" : "advanced"))}
                  className="w-full rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-white hover:opacity-95 cursor-pointer"
                >
                  📋 Chọn Gói Tư Vấn Nâng Cao (Miễn phí / Trả phí)
                </button>
              </div>
            </div>

            {followupPanel === "advanced" && (
              <div className="rounded-2xl border border-amber-200 bg-white p-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={`cursor-pointer rounded-xl border-2 p-3.5 ${
                      advancedTier === "advanced_free" ? "border-brand bg-green-50/60" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                      <input
                        type="radio"
                        name="tier"
                        checked={advancedTier === "advanced_free"}
                        onChange={() => setAdvancedTier("advanced_free")}
                      />
                      <span>🎁 Gói Nâng Cao Miễn Phí</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      Tư vấn viên phản hồi qua Zalo/Email trong 24h, gửi thêm tài liệu &amp; thực đơn tham khảo.
                    </p>
                  </label>
                  <label
                    className={`cursor-pointer rounded-xl border-2 p-3.5 ${
                      advancedTier === "advanced_paid" ? "border-amber-500 bg-amber-50/60" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                      <input
                        type="radio"
                        name="tier"
                        checked={advancedTier === "advanced_paid"}
                        onChange={() => setAdvancedTier("advanced_paid")}
                      />
                      <span>👑 Gói Chuyên Sâu 1-1 (Trả Phí)</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      Chuyên gia thực dưỡng &amp; AI phân tích chuyên sâu hồ sơ/xét nghiệm, theo sát lộ trình 30 ngày.
                    </p>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={followupPhone}
                    onChange={(e) => setFollowupPhone(e.target.value)}
                    placeholder="Số điện thoại / Zalo liên hệ *"
                    className="rounded-xl border px-3 py-2 text-sm"
                  />
                  <input
                    value={followupEmail}
                    onChange={(e) => setFollowupEmail(e.target.value)}
                    placeholder="Email nhận phác đồ (tuỳ chọn)"
                    className="rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <textarea
                  rows={2}
                  value={followupNote}
                  onChange={(e) => setFollowupNote(e.target.value)}
                  placeholder="Khung giờ thuận tiện liên hệ hoặc câu hỏi thêm..."
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={followupBusy}
                  onClick={() => submitFollowup(advancedTier)}
                  className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
                >
                  {followupBusy ? "Đang gửi đăng ký..." : "✓ Xác Nhận Đăng Ký Tư Vấn Nâng Cao"}
                </button>
              </div>
            )}

            {followupMsg && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-center text-sm font-semibold text-emerald-900">
                {followupMsg}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
