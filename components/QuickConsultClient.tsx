"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  resolveDisclaimerContent,
  type MedicalDisclaimerConfig,
} from "@/lib/medical-disclaimer";
import MedicalDisclaimerBlock from "./MedicalDisclaimerBlock";
import RotatingHotline from "./RotatingHotline";
import {
  CONSULT_AUDIENCES,
  CONSULT_CONDITIONS,
  CONSULT_FAQS,
  CONSULT_GOALS,
  CONSULT_HABITS,
  CONSULT_MOTIFS,
  CONSULT_PACKAGES,
  CONSULT_PROCESS_STEPS,
  EXPERT_TEAM,
} from "@/lib/quick-consult-options";
import type {
  MatchedDocumentCard,
  MatchedProductGroup,
  MatchedVideoCard,
} from "@/lib/quick-consult";

type ConsultResult = {
  id: number;
  shareToken?: string;
  motif: { id: string; name: string; badge: string };
  articleHtml: string;
  productGroups: MatchedProductGroup[];
  videos: MatchedVideoCard[];
  documents: MatchedDocumentCard[];
};

type HistoryItem = {
  id: number;
  customer_name: string;
  audience: string;
  height_cm: number;
  weight_kg: number;
  share_token: string;
  created_at: string;
};

function formatVnd(n: number) {
  return `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
}

function calcBmi(h: number, w: number) {
  if (!h || !w) return null;
  return Math.round((w / ((h / 100) * (h / 100))) * 10) / 10;
}

export default function QuickConsultClient({
  hotline,
  zaloUrl,
  disclaimerConfig,
}: {
  hotline: string;
  zaloUrl: string;
  disclaimerConfig?: MedicalDisclaimerConfig;
}) {
  const disclaimer = resolveDisclaimerContent(disclaimerConfig);
  const [audience, setAudience] = useState<string>("truong_thanh");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [ageSex, setAgeSex] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");

  // 24h Dietary Recall
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [dinner, setDinner] = useState("");
  const [snacks, setSnacks] = useState("");

  const [needs, setNeeds] = useState<string[]>([CONSULT_GOALS[0]]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [habits, setHabits] = useState<string[]>([]);
  const [motifId, setMotifId] = useState<string>(CONSULT_MOTIFS[0].id);
  const [customNote, setCustomNote] = useState("");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showDietRecall, setShowDietRecall] = useState(false);
  const [aiStage, setAiStage] = useState(0);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<ConsultResult | null>(null);

  useEffect(() => {
    if (!busy) {
      setAiStage(0);
      return;
    }
    const t = setInterval(() => {
      setAiStage((s) => (s < 3 ? s + 1 : 3));
    }, 3200);
    return () => clearInterval(t);
  }, [busy]);

  const liveBmi = calcBmi(Number(heightCm), Number(weightKg));

  // History / Re-examination tracking by phone
  const [historyItems, setHistoryItems] = useState<HistoryItem[] | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);

  // Cart quick-add state
  const [addedIds, setAddedIds] = useState<Record<number, boolean>>({});

  // Follow-up & Booking state
  const [followupPanel, setFollowupPanel] = useState<"none" | "advanced">("none");
  const [selectedPkgId, setSelectedPkgId] = useState<string>(CONSULT_PACKAGES[0].id);
  const [bookingExpert, setBookingExpert] = useState<string>(EXPERT_TEAM[0].name);
  const [bookingMode, setBookingMode] = useState<"online_video" | "in_person">("online_video");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingSlot, setBookingSlot] = useState("09:00 - 10:00");
  const [followupPhone, setFollowupPhone] = useState("");
  const [followupEmail, setFollowupEmail] = useState("");
  const [followupNote, setFollowupNote] = useState("");
  const [followupMsg, setFollowupMsg] = useState("");
  const [followupBusy, setFollowupBusy] = useState(false);

  function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  async function lookupHistory() {
    if (phone.replace(/\s+/g, "").length < 7) return;
    setHistoryBusy(true);
    try {
      const res = await fetch(`/api/quick-consult/history?phone=${encodeURIComponent(phone)}`);
      const data = (await res.json()) as { items?: HistoryItem[] };
      setHistoryItems(data.items ?? []);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryBusy(false);
    }
  }

  function fillSampleDiet() {
    setBreakfast("Phở bò / Bánh mì + cà phê sữa đá");
    setLunch("Cơm trắng, thịt kho, ít rau xào");
    setDinner("Cơm trắng, canh chua, cá chiên");
    setSnacks("Trà sữa / bánh ngọt buổi chiều");
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
          audience,
          heightCm: Number(heightCm) || 0,
          weightKg: Number(weightKg) || 0,
          dietRecall: { breakfast, lunch, dinner, snacks },
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
    const pkg = CONSULT_PACKAGES.find((p) => p.id === selectedPkgId) ?? CONSULT_PACKAGES[0];
    try {
      const res = await fetch("/api/quick-consult/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: result.id,
          shareToken: result.shareToken,
          followupChoice: choice,
          phone: followupPhone || phone,
          email: followupEmail,
          note: followupNote,
          bookingPackage: choice === "hotline" ? "Hotline" : `${pkg.name} (${pkg.priceLabel})`,
          bookingMode: choice === "hotline" ? "hotline" : bookingMode,
          bookingDate,
          bookingSlot,
          bookingExpert,
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

  function goToStep(next: 1 | 2 | 3) {
    setStep(next);
    setTimeout(() => {
      document.getElementById("quick-consult-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <div className="space-y-6">
      {/* Collapsible 5-Step Scientific Consultation Process */}
      <details className="rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-xs font-bold text-emerald-900 select-none">
          <span>🧭 Xem Quy Trình Tư Vấn 5 Bước Chuẩn Y Khoa – Thực Dưỡng – Đông Tây Y Kết Hợp</span>
          <span className="text-[11px] font-semibold text-emerald-700">AI Gemini 2.5 Flash + Hội đồng Chuyên gia ▾</span>
        </summary>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {CONSULT_PROCESS_STEPS.map((s) => (
            <div key={s.step} className="rounded-xl border border-emerald-200/80 bg-white p-3 shadow-2xs">
              <div className="text-xs font-extrabold text-brand">Bước {s.step}</div>
              <div className="mt-0.5 text-xs font-bold text-gray-900">{s.title}</div>
              <p className="mt-1 text-[11px] text-gray-500 leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>
      </details>

      {/* 3-Step Intake Wizard */}
      <section id="quick-consult-form" className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm md:p-6 space-y-5">
        {/* Stepper Header */}
        <div className="grid gap-2 border-b border-gray-100 pb-4 sm:grid-cols-3">
          {[
            { num: 1 as const, title: "Đối tượng & Hồ sơ", sub: customerName.trim() || CONSULT_AUDIENCES.find((a) => a.id === audience)?.label || "Chọn đối tượng" },
            { num: 2 as const, title: "Nhu cầu & Tình trạng", sub: `Đã chọn ${needs.length} nhu cầu${conditions.length ? `, ${conditions.length} biểu hiện` : ""}` },
            { num: 3 as const, title: "Chuyên gia AI & Kết quả", sub: CONSULT_MOTIFS.find((m) => m.id === motifId)?.name || "Chọn mô hình AI" },
          ].map((item) => {
            const active = step === item.num;
            const done = step > item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => setStep(item.num)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition cursor-pointer ${
                  active
                    ? "border-brand bg-green-50/70 ring-1 ring-brand/20"
                    : done
                      ? "border-emerald-200 bg-emerald-50/30 hover:border-brand/50"
                      : "border-gray-200 bg-gray-50/60 hover:border-gray-300"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
                    active ? "bg-brand text-white" : done ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {done ? "✓" : item.num}
                </span>
                <div className="min-w-0">
                  <div className={`text-xs font-extrabold ${active ? "text-brand" : "text-gray-900"}`}>
                    Bước {item.num}: {item.title}
                  </div>
                  <div className="truncate text-[11px] text-gray-500">{item.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* STEP 1: Audience & Basic Info */}
        <div className={step === 1 ? "space-y-5" : "hidden"}>
        {/* Audience Group Selector */}
        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-gray-900">
            0. Chọn Nhóm Đối tượng Cần Tư Vấn:
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {CONSULT_AUDIENCES.map((a) => {
              const active = audience === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAudience(a.id)}
                  className={`rounded-xl border-2 p-3 text-left transition cursor-pointer ${
                    active
                      ? "border-brand bg-emerald-50/70 shadow-xs"
                      : "border-gray-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <span>{a.icon}</span>
                    <span>{a.label}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600 leading-snug">{a.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Basic Info + Height/Weight + History Lookup */}
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">Họ tên / Tên bé</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="VD: Chị Lan / Bé An"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">Số điện thoại / Zalo</label>
                {phone.replace(/\s+/g, "").length >= 7 && (
                  <button
                    type="button"
                    onClick={lookupHistory}
                    className="text-[11px] font-bold text-brand hover:underline cursor-pointer"
                  >
                    {historyBusy ? "Đang tìm..." : "🔍 Lịch sử"}
                  </button>
                )}
              </div>
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
                placeholder={audience === "tre_em" ? "VD: 5 tuổi, Bé trai" : "VD: 45 tuổi, Nữ"}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">Chiều cao (cm)</label>
              <input
                type="number"
                min={40}
                max={250}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="VD: 162"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">Cân nặng (kg)</label>
              <input
                type="number"
                min={3}
                max={250}
                step="0.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="VD: 56"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {liveBmi !== null && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">
              <span>📊 Chỉ số BMI ước tính:</span>
              <span className="font-extrabold text-brand">{liveBmi}</span>
              <span className="text-[11px] text-emerald-700">
                ({liveBmi < 18.5 ? "Nhẹ cân" : liveBmi < 23 ? "Cân đối" : liveBmi < 25 ? "Hơi thừa cân" : "Cần kiểm soát cân nặng"})
              </span>
            </div>
          )}

          {historyItems !== null && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs">
              <div className="font-bold text-blue-900">
                📈 Tiến triển Tái khám theo SĐT {phone} ({historyItems.length} hồ sơ trước đây):
              </div>
              {historyItems.length === 0 ? (
                <p className="mt-1 text-blue-700">Chưa có hồ sơ cũ cho số điện thoại này.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {historyItems.map((h) => {
                    const b = calcBmi(h.height_cm, h.weight_kg);
                    return (
                      <a
                        key={h.id}
                        href={h.share_token ? `/ho-so-tu-van/${h.share_token}/` : "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[11px] hover:border-brand"
                      >
                        <strong>#{h.id}</strong> ({h.created_at.slice(0, 10)}) · {h.weight_kg || "?"}kg
                        {b ? ` · BMI ${b}` : ""} ↗
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t pt-4">
          <button
            type="button"
            onClick={() => goToStep(2)}
            className="rounded-full bg-brand px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-dark cursor-pointer"
          >
            Tiếp tục Bước 2: Chọn Nhu cầu &amp; Tình trạng →
          </button>
        </div>
        </div>

        {/* STEP 2: Needs, Conditions, Habits & Optional 24h Diet */}
        <div className={step === 2 ? "space-y-5" : "hidden"}>
        {/* 24-Hour Dietary Recall (Collapsible for cleaner Step 2) */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowDietRecall((v) => !v)}
              className="text-left text-xs font-bold text-amber-950 cursor-pointer"
            >
              🍽️ Khai thác Khẩu phần Ăn 24h (Tuỳ chọn — giúp AI đổi món chính xác hơn) {showDietRecall ? "▴" : "▾"}
            </button>
            <div className="flex items-center gap-2">
              {showDietRecall && (
                <button
                  type="button"
                  onClick={fillSampleDiet}
                  className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
                >
                  ✨ Điền ví dụ mẫu
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDietRecall((v) => !v)}
                className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
              >
                {showDietRecall ? "Thu gọn" : "+ Nhập khẩu phần 24h"}
              </button>
            </div>
          </div>
          {showDietRecall && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                value={breakfast}
                onChange={(e) => setBreakfast(e.target.value)}
                placeholder="Bữa sáng (VD: Phở, xôi...)"
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
              />
              <input
                value={lunch}
                onChange={(e) => setLunch(e.target.value)}
                placeholder="Bữa trưa (VD: Cơm trắng, thịt...)"
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
              />
              <input
                value={dinner}
                onChange={(e) => setDinner(e.target.value)}
                placeholder="Bữa tối (VD: Cơm, canh, cá...)"
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
              />
              <input
                value={snacks}
                onChange={(e) => setSnacks(e.target.value)}
                placeholder="Bữa phụ / Đồ uống (VD: Trà sữa...)"
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
              />
            </div>
          )}
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <button
            type="button"
            onClick={() => goToStep(1)}
            className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            ← Quay lại Bước 1
          </button>
          <button
            type="button"
            onClick={() => goToStep(3)}
            className="rounded-full bg-brand px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-dark cursor-pointer"
          >
            Tiếp tục Bước 3: Chọn Chuyên gia AI →
          </button>
        </div>
        </div>

        {/* STEP 3: Motif Selector, Custom Note & Submit */}
        <div className={step === 3 ? "space-y-5" : "hidden"}>
        {/* Motif Expert Model Selector */}
        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-gray-900">
            4. Chọn Mô hình Chuyên gia AI (Y khoa · Thực dưỡng · Đông Tây y) phân tích cho bạn:
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
            5. Mô tả thêm tình trạng, kết quả xét nghiệm hoặc câu hỏi riêng (tuỳ chọn):
          </label>
          <textarea
            rows={3}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="VD: Tôi bị đau dạ dày 2 năm nay, sáng hay mệt, hoặc bé 4 tuổi biếng ăn chậm tăng cân..."
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {err}
          </div>
        )}

        {busy && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 animate-ping rounded-full bg-brand" />
                <span>Hội đồng Chuyên gia AI đang phân tích hồ sơ của bạn...</span>
              </span>
              <span className="text-[11px] text-emerald-700">Ước tính ~10–15 giây</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-4 text-[11px]">
              {[
                "1. Đọc hồ sơ & BMI",
                "2. Đối chiếu Thực dưỡng & Y khoa",
                "3. Chọn Sản phẩm & Video",
                "4. Hoàn thiện bài tư vấn",
              ].map((label, idx) => (
                <div
                  key={label}
                  className={`rounded-lg border px-2.5 py-1.5 font-semibold transition ${
                    aiStage >= idx
                      ? "border-brand bg-white text-brand shadow-2xs"
                      : "border-emerald-100 bg-white/50 text-gray-400"
                  }`}
                >
                  {aiStage > idx ? "✓ " : aiStage === idx ? "⏳ " : "• "}
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">
              ✨ Hệ thống AI Y khoa – Thực dưỡng – Đông Tây y sẽ tổng hợp bài tư vấn + video + tài liệu + bộ sản phẩm phù hợp nhất.
            </p>
            <p className="text-[11px] font-medium text-amber-800">
              ⚕️ Lưu ý: Kết quả chỉ mang tính tham khảo dinh dưỡng thực dưỡng, không thay thế chẩn đoán hay đơn thuốc của bác sĩ.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => goToStep(2)}
              className="rounded-full border border-gray-300 bg-white px-5 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              ← Quay lại Bước 2
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={runQuickConsult}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-emerald-600 px-7 py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              <span>{busy ? "⏳" : "🌿"}</span>
              <span>{busy ? "Đang phân tích hồ sơ..." : "Tư Vấn Nhanh Ngay"}</span>
            </button>
          </div>
        </div>
        </div>
      </section>

      {/* Step 2: Comprehensive Result */}
      {result && (
        <div id="quick-consult-result" className="space-y-8">
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
            {(disclaimer.position === "top" || disclaimer.position === "both") && (
              <MedicalDisclaimerBlock config={disclaimerConfig} />
            )}
            <div
              className="prose-content max-w-none text-sm leading-relaxed md:text-base"
              dangerouslySetInnerHTML={{ __html: result.articleHtml }}
            />
            {(disclaimer.position === "bottom" || disclaimer.position === "both") && (
              <MedicalDisclaimerBlock config={disclaimerConfig} />
            )}
          </article>

          {/* Product Blocks by Category */}
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

          {/* 2 Next-Step Options + Booking Packages */}
          <section className="rounded-2xl border-2 border-brand/30 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 shadow-sm space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                🤝 Bạn muốn được đồng hành chuyên sâu hơn?
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Chọn kết nối Hotline ngay hoặc Đặt lịch Tư vấn Nâng cao (Miễn phí / Gói Chuyên sâu 1:1):
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                  <RotatingHotline
                    raw={hotline}
                    prefix="📞 Gọi Hotline "
                    onClick={() => void submitFollowup("hotline")}
                    className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-center text-xs font-bold text-white hover:bg-brand-dark"
                  />
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

              <div className="flex flex-col justify-between rounded-2xl border border-amber-300 bg-white p-5 shadow-xs space-y-4">
                <div>
                  <span className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800">
                    Tuỳ chọn 2 · Chọn gói &amp; Đặt lịch hẹn
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-gray-900">
                    🌟 Tư Vấn Nâng Cao (Miễn Phí / Trả Phí 1:1)
                  </h3>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                    Chọn gói <strong>Miễn phí</strong> hoặc các gói <strong>Khám 1:1 Online / Trực tiếp</strong> (1 buổi, 1 tháng, 3 tháng VIP) cùng Chuyên gia Y khoa – Đông Tây y.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFollowupPanel((p) => (p === "advanced" ? "none" : "advanced"))}
                  className="w-full rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-white hover:opacity-95 cursor-pointer"
                >
                  📅 Xem Bảng Gói &amp; Đặt Lịch Hẹn Chuyên Gia
                </button>
              </div>
            </div>

            {followupPanel === "advanced" && (
              <div className="rounded-2xl border border-amber-200 bg-white p-5 space-y-5">
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500 mb-2">
                    1. Chọn Gói Tư Vấn Phù Hợp:
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {CONSULT_PACKAGES.map((pkg) => {
                      const active = selectedPkgId === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPkgId(pkg.id)}
                          className={`flex flex-col justify-between rounded-xl border-2 p-3 text-left transition cursor-pointer ${
                            active ? "border-brand bg-green-50/70 shadow-xs" : "border-gray-200 hover:border-amber-300"
                          }`}
                        >
                          <div>
                            <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                              {pkg.badge}
                            </span>
                            <div className="mt-1.5 text-xs font-bold text-gray-900">{pkg.name}</div>
                            <div className="mt-0.5 text-sm font-extrabold text-accent">{pkg.priceLabel}</div>
                            <ul className="mt-2 space-y-1 text-[11px] text-gray-600">
                              {pkg.features.map((f) => (
                                <li key={f}>✓ {f}</li>
                              ))}
                            </ul>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-gray-700">Chọn Chuyên gia</label>
                    <select
                      value={bookingExpert}
                      onChange={(e) => setBookingExpert(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-xs"
                    >
                      {EXPERT_TEAM.map((ex) => (
                        <option key={ex.id} value={ex.name}>
                          {ex.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-gray-700">Hình thức tư vấn</label>
                    <select
                      value={bookingMode}
                      onChange={(e) => setBookingMode(e.target.value as "online_video" | "in_person")}
                      className="w-full rounded-xl border px-3 py-2 text-xs"
                    >
                      <option value="online_video">💻 Online (Video Call / Zalo)</option>
                      <option value="in_person">🏥 Trực tiếp tại phòng tư vấn</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-gray-700">Ngày mong muốn</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-gray-700">Khung giờ hẹn</label>
                    <select
                      value={bookingSlot}
                      onChange={(e) => setBookingSlot(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-xs"
                    >
                      <option value="09:00 - 10:00">09:00 – 10:00</option>
                      <option value="10:30 - 11:30">10:30 – 11:30</option>
                      <option value="14:30 - 15:30">14:30 – 15:30</option>
                      <option value="16:00 - 17:00">16:00 – 17:00</option>
                      <option value="19:30 - 20:30">19:30 – 20:30 (Tối)</option>
                    </select>
                  </div>
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
                    placeholder="Email nhận hồ sơ PDF & phác đồ"
                    className="rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <textarea
                  rows={2}
                  value={followupNote}
                  onChange={(e) => setFollowupNote(e.target.value)}
                  placeholder="Ghi chú thêm cho chuyên gia trước buổi tư vấn..."
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={followupBusy}
                  onClick={() => {
                    const pkg = CONSULT_PACKAGES.find((p) => p.id === selectedPkgId) ?? CONSULT_PACKAGES[0];
                    void submitFollowup(pkg.tierCode);
                  }}
                  className="rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
                >
                  {followupBusy ? "Đang xác nhận..." : "✓ Xác Nhận Đặt Lịch & Đăng Ký Gói Tư Vấn"}
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

      {/* Expert Team Profiles (Trust Section) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            👨‍⚕️ Hội Đồng Chuyên Gia Y Khoa · Thực Dưỡng · Đông Tây Y Kết Hợp
          </h2>
          <p className="text-xs text-gray-500">
            Đồng hành cùng bạn từ đánh giá khẩu phần ăn 24h, đọc chỉ số xét nghiệm đến xây dựng lối sống quân bình.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {EXPERT_TEAM.map((ex) => (
            <div key={ex.id} className="rounded-2xl border bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  {ex.badge}
                </span>
                <span className="text-[11px] font-semibold text-gray-500">{ex.experience}</span>
              </div>
              <div className="text-base font-bold text-gray-900">{ex.name}</div>
              <div className="text-xs font-semibold text-brand">{ex.title}</div>
              <div className="text-[11px] text-gray-700">
                <strong>Chuyên môn:</strong> {ex.specialty}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{ex.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="rounded-2xl border bg-white p-5 shadow-xs space-y-3">
        <h2 className="text-base font-bold text-gray-900">❓ Câu Hỏi Thường Gặp (FAQ)</h2>
        <div className="space-y-2">
          {CONSULT_FAQS.map((f) => (
            <details key={f.q} className="rounded-xl border border-gray-200 p-3">
              <summary className="cursor-pointer text-xs font-bold text-gray-900">{f.q}</summary>
              <p className="mt-2 text-xs text-gray-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
