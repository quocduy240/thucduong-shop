"use client";

import { useState } from "react";
import MedicalDisclaimerBlock from "@/components/MedicalDisclaimerBlock";
import {
  MEDICAL_DISCLAIMER_PRESETS,
  resolveDisclaimerContent,
  type DisclaimerPosition,
  type DisclaimerStyleId,
} from "@/lib/medical-disclaimer";
import type { ExpertProfileConfig, QuickConsultRow } from "@/lib/quick-consult";

const FOLLOWUP_LABELS: Record<string, { label: string; cls: string }> = {
  hotline: { label: "📞 Gọi Hotline / Zalo", cls: "bg-blue-100 text-blue-800" },
  advanced_free: { label: "🎁 Nâng cao Miễn phí", cls: "bg-emerald-100 text-emerald-800" },
  advanced_paid: { label: "👑 Chuyên sâu 1-1 (Trả phí)", cls: "bg-amber-100 text-amber-900" },
};

function parseArr(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const AUDIENCE_LABELS: Record<string, string> = {
  tre_em: "👶 Trẻ em",
  truong_thanh: "🧑 Người trưởng thành",
  benh_ly: "🩺 Bệnh lý mạn tính",
  cao_tuoi: "👴 Người cao tuổi",
};

function parseDiet(raw: string): { breakfast?: string; lunch?: string; dinner?: string; snacks?: string } {
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function calcBmi(h: number, w: number) {
  if (!h || !w) return null;
  const bmi = Math.round((w / ((h / 100) * (h / 100))) * 10) / 10;
  return bmi;
}

export default function AdminQuickConsultClient({
  initialRows,
  initialConfig,
}: {
  initialRows: QuickConsultRow[];
  initialConfig: ExpertProfileConfig;
}) {
  const [rows, setRows] = useState<QuickConsultRow[]>(initialRows);
  const [cfg, setCfg] = useState<ExpertProfileConfig>(initialConfig);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);

  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [emailTargetId, setEmailTargetId] = useState<number | null>(null);
  const [emailAddr, setEmailAddr] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [notice, setNotice] = useState("");
  const [err, setErr] = useState("");

  async function saveExpertConfig() {
    setSavingCfg(true);
    setNotice("");
    setErr("");
    try {
      const res = await fetch("/api/admin/quick-consult/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saveConfig: true, config: cfg }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Không thể lưu cấu hình.");
      setNotice("✓ Đã lưu cấu hình riêng của Chuyên gia Sức khoẻ!");
      setCfgOpen(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSavingCfg(false);
    }
  }

  async function analyzePatient(id: number) {
    setAnalyzingId(id);
    setNotice("");
    setErr("");
    try {
      const res = await fetch("/api/admin/quick-consult/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, config: cfg }),
      });
      const data = (await res.json()) as { ok?: boolean; row?: QuickConsultRow; error?: string };
      if (!res.ok || !data.ok || !data.row) throw new Error(data.error || "Lỗi phân tích hồ sơ.");
      setRows((prev) => prev.map((r) => (r.id === id ? data.row! : r)));
      setNotice(`✅ Đã hoàn tất phân tích AI cho hồ sơ #${id} và tạo bản xuất PDF / Link chia sẻ!`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setAnalyzingId(null);
    }
  }

  async function copyShareLink(token: string) {
    if (!token) return;
    const url = `${window.location.origin}/ho-so-tu-van/${token}/`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice(`🔗 Đã sao chép link gửi bệnh nhân: ${url}`);
    } catch {
      setNotice(`Link hồ sơ: ${url}`);
    }
  }

  async function sendReportEmail(id: number) {
    setSendingEmail(true);
    setNotice("");
    setErr("");
    try {
      const res = await fetch("/api/admin/quick-consult/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          toEmail: emailAddr,
          origin: window.location.origin,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Gửi email thất bại.");
      setNotice(`📧 ${data.message}`);
      setEmailTargetId(null);
      setEmailAddr("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Expert Config Bar */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-gray-900">
              🩺 Cấu hình Chuyên gia Sức khoẻ AI: <span className="text-brand">{cfg.expertName}</span>
            </div>
            <div className="text-xs text-gray-500">
              Trường phái: {cfg.schoolOfThought}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCfgOpen((o) => !o)}
            className="rounded-xl border border-brand bg-green-50 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-white cursor-pointer"
          >
            {cfgOpen ? "▲ Đóng cấu hình" : "⚙️ Tuỳ chỉnh Cấu hình Chuyên gia"}
          </button>
        </div>

        {cfgOpen && (
          <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Tên Chuyên gia / Đơn vị</label>
              <input
                value={cfg.expertName}
                onChange={(e) => setCfg({ ...cfg, expertName: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Chức danh chuyên môn</label>
              <input
                value={cfg.expertTitle}
                onChange={(e) => setCfg({ ...cfg, expertTitle: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-700">Trường phái &amp; Phương pháp phân tích</label>
              <input
                value={cfg.schoolOfThought}
                onChange={(e) => setCfg({ ...cfg, schoolOfThought: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-700">Trọng tâm đánh giá</label>
              <input
                value={cfg.focusAreas}
                onChange={(e) => setCfg({ ...cfg, focusAreas: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-700">Chỉ dẫn riêng cho AI khi xuất hồ sơ bệnh nhân</label>
              <textarea
                rows={2}
                value={cfg.customDirective}
                onChange={(e) => setCfg({ ...cfg, customDirective: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-3">
              <div className="text-xs font-extrabold text-amber-950">
                ⚕️ Cấu hình Block Miễn trừ trách nhiệm Y khoa (Frontend · Hồ sơ PDF · Backend · Email)
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Chọn văn phong Miễn trừ trách nhiệm (3 tùy chọn chuẩn)
                  </label>
                  <select
                    value={cfg.disclaimerStyle ?? "gemini_standard"}
                    onChange={(e) => setCfg({ ...cfg, disclaimerStyle: e.target.value as DisclaimerStyleId })}
                    className="w-full cursor-pointer rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-gray-800"
                  >
                    {Object.values(MEDICAL_DISCLAIMER_PRESETS).map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Vị trí hiển thị trong báo cáo
                  </label>
                  <select
                    value={cfg.disclaimerPosition ?? "bottom"}
                    onChange={(e) => setCfg({ ...cfg, disclaimerPosition: e.target.value as DisclaimerPosition })}
                    className="w-full cursor-pointer rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-gray-800"
                  >
                    <option value="bottom">Cuối báo cáo (Khuyên dùng)</option>
                    <option value="top">Đầu báo cáo (Ngay trước nội dung phân tích)</option>
                    <option value="both">Cả đầu &amp; cuối báo cáo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Nội dung tuỳ chỉnh riêng (để trống nếu dùng văn bản chuẩn của tùy chọn đã chọn)
                </label>
                <textarea
                  rows={2}
                  value={cfg.disclaimerCustomText ?? ""}
                  onChange={(e) => setCfg({ ...cfg, disclaimerCustomText: e.target.value })}
                  placeholder="Để trống để sử dụng nguyên văn mẫu chuẩn đã chọn ở trên..."
                  className="w-full rounded-lg border bg-white px-3 py-2 text-xs"
                />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-gray-600">Xem trước Block Miễn trừ trách nhiệm:</div>
                <MedicalDisclaimerBlock config={cfg} compact />
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                disabled={savingCfg}
                onClick={saveExpertConfig}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark cursor-pointer"
              >
                {savingCfg ? "Đang lưu..." : "💾 Lưu cấu hình Chuyên gia"}
              </button>
            </div>
          </div>
        )}
      </div>

      {(notice || err) && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${
            err ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || notice}
        </div>
      )}

      {/* Patient Records */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm text-gray-400">
          Chưa có khách hàng nào gửi yêu cầu Tư vấn nhanh.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const needs = parseArr(r.needs_json);
            const conditions = parseArr(r.conditions_json);
            const diet = parseDiet(r.diet_recall_json);
            const hasDiet = Boolean(diet.breakfast || diet.lunch || diet.dinner || diet.snacks);
            const badge = FOLLOWUP_LABELS[r.followup_choice];
            const bmi = calcBmi(r.height_cm, r.weight_kg);
            const hasReport = Boolean(r.expert_report_html || r.article_html);

            return (
              <div key={r.id} className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900">
                        #{r.id} · {r.customer_name || "Khách vãng lai"}
                      </span>
                      {r.phone && <span className="text-sm font-semibold text-brand">{r.phone}</span>}
                      {r.age_sex && <span className="text-xs text-gray-500">({r.age_sex})</span>}
                      {r.audience && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          {AUDIENCE_LABELS[r.audience] ?? r.audience}
                        </span>
                      )}
                      {(r.height_cm > 0 || r.weight_kg > 0) && (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                          📏 {r.height_cm || "?"} cm · ⚖️ {r.weight_kg || "?"} kg
                          {bmi ? ` · BMI ${bmi}` : ""}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {r.created_at} · Mô-típ: <code>{r.motif_id}</code>
                      {r.expert_analyzed_at && (
                        <span className="ml-2 font-semibold text-emerald-700">
                          · ✓ Đã xuất hồ sơ chuyên sâu ({r.expert_analyzed_at})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {badge && (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={analyzingId === r.id}
                      onClick={() => analyzePatient(r.id)}
                      className="rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
                    >
                      {analyzingId === r.id ? "⏳ Đang phân tích AI..." : "🧠 Phân tích AI Chuyên gia"}
                    </button>
                  </div>
                </div>

                {/* Summary chips */}
                <div className="grid gap-2 rounded-xl bg-gray-50 p-3 text-xs md:grid-cols-2">
                  <div>
                    <strong className="text-gray-600">Nhu cầu:</strong> {needs.join(", ") || "Không có"}
                  </div>
                  <div>
                    <strong className="text-gray-600">Tình trạng:</strong> {conditions.join(", ") || "Không có"}
                  </div>
                  {hasDiet && (
                    <div className="md:col-span-2 text-gray-700">
                      <strong>Khẩu phần 24h:</strong> Sáng: {diet.breakfast || "—"} | Trưa: {diet.lunch || "—"} | Tối: {diet.dinner || "—"}
                      {diet.snacks ? ` | Phụ: ${diet.snacks}` : ""}
                    </div>
                  )}
                  {r.custom_note && (
                    <div className="md:col-span-2 text-gray-700">
                      <strong>Ghi chú:</strong> {r.custom_note}
                    </div>
                  )}
                  {(r.booking_package || r.followup_email || r.followup_note) && (
                    <div className="md:col-span-2 text-amber-900">
                      <strong>Đặt lịch &amp; Gói nâng cao:</strong>{" "}
                      {r.booking_package ? `${r.booking_package} ` : ""}
                      {r.booking_mode ? `(${r.booking_mode === "online_video" ? "Online Video" : r.booking_mode === "in_person" ? "Trực tiếp" : r.booking_mode}) ` : ""}
                      {r.booking_date ? `· Ngày ${r.booking_date} ${r.booking_slot} ` : ""}
                      {r.booking_expert ? `· ${r.booking_expert} ` : ""}
                      {r.followup_email ? `· Email: ${r.followup_email} ` : ""}
                      {r.followup_note ? `· ${r.followup_note}` : ""}
                    </div>
                  )}
                </div>

                {/* Export / Share / Email Toolbar */}
                {hasReport && r.share_token && (
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    <a
                      href={`/ho-so-tu-van/${r.share_token}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      👁️ Đọc trên Web
                    </a>
                    <a
                      href={`/ho-so-tu-van/${r.share_token}/?print=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      📥 Tải PDF về máy
                    </a>
                    <button
                      type="button"
                      onClick={() => copyShareLink(r.share_token)}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                    >
                      🔗 Copy Link gửi bệnh nhân
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailTargetId(emailTargetId === r.id ? null : r.id);
                        setEmailAddr(r.followup_email || "");
                      }}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 cursor-pointer"
                    >
                      📧 Gửi qua Email
                    </button>
                  </div>
                )}

                {emailTargetId === r.id && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                    <input
                      type="email"
                      value={emailAddr}
                      onChange={(e) => setEmailAddr(e.target.value)}
                      placeholder="Nhập email bệnh nhân (VD: benhnhan@gmail.com)"
                      className="flex-1 min-w-[220px] rounded-lg border bg-white px-3 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      disabled={sendingEmail}
                      onClick={() => sendReportEmail(r.id)}
                      className="rounded-lg bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
                    >
                      {sendingEmail ? "Đang gửi..." : "Gửi hồ sơ ngay"}
                    </button>
                  </div>
                )}

                {/* Collapsible Report Preview */}
                {hasReport && (() => {
                  let rowCfg = cfg;
                  try {
                    if (r.expert_config_json) {
                      rowCfg = { ...cfg, ...(JSON.parse(r.expert_config_json) as Partial<ExpertProfileConfig>) };
                    }
                  } catch {
                    /* ignore */
                  }
                  const disc = resolveDisclaimerContent(rowCfg);
                  return (
                    <details className="rounded-xl border border-gray-200 bg-gray-50/40 p-3">
                      <summary className="cursor-pointer text-xs font-bold text-brand">
                        {r.expert_report_html
                          ? "📄 Xem Báo cáo Phân tích Chuyên gia Cá nhân hoá (Bản xuất PDF)"
                          : "📄 Xem Bài Tư vấn Nhanh ban đầu"}
                      </summary>
                      <div className="mt-3 space-y-3 rounded-lg bg-white p-4">
                        {(disc.position === "top" || disc.position === "both") && (
                          <MedicalDisclaimerBlock config={rowCfg} compact />
                        )}
                        <div
                          className="prose-content max-w-none text-xs"
                          dangerouslySetInnerHTML={{
                            __html: r.expert_report_html || r.article_html,
                          }}
                        />
                        {(disc.position === "bottom" || disc.position === "both") && (
                          <MedicalDisclaimerBlock config={rowCfg} compact />
                        )}
                      </div>
                    </details>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
