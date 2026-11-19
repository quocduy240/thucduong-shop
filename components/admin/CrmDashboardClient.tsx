"use client";

import { useMemo, useState } from "react";
import type { AutomationQueueItem, CrmAnalytics, CrmCustomer, RfmSegment } from "@/lib/crm";
import { vnd } from "@/lib/site";
import CrmGuideDrawer from "./CrmGuideDrawer";

const SEGMENT_META: Record<RfmSegment, { label: string; badge: string; hint: string }> = {
  refill_due: {
    label: "⏰ Sắp hết SP (20–45 ngày)",
    badge: "bg-amber-100 text-amber-800",
    hint: "Ưu tiên hỏi thăm trải nghiệm & nhắc mua lại định kỳ",
  },
  vip: {
    label: "🏆 Khách VIP",
    badge: "bg-purple-100 text-purple-800",
    hint: "Khách trung thành, chi tiêu cao",
  },
  new_buyer: {
    label: "🌱 Khách mới",
    badge: "bg-emerald-100 text-emerald-800",
    hint: "Mới đặt đơn đầu, cần hướng dẫn cách dùng",
  },
  at_risk: {
    label: "⚠️ Nguy cơ rời bỏ (>45 ngày)",
    badge: "bg-red-100 text-red-700",
    hint: "Nhắc điểm tích lũy & gửi ưu đãi tái kích hoạt",
  },
  lead: {
    label: "👤 Chưa mua đơn",
    badge: "bg-gray-100 text-gray-700",
    hint: "Thành viên đã đăng ký nhưng chưa đặt đơn",
  },
};

const SUGGESTED_TAGS = [
  "#Tiểu_đường",
  "#Dạ_dày",
  "#Tim_mạch",
  "#Ăn_chay",
  "#Khách_biếu_tặng",
  "#Mẹ_bầu",
];

export default function CrmDashboardClient({
  initialCustomers,
  initialAnalytics,
  initialQueue,
  initialTags,
}: {
  initialCustomers: CrmCustomer[];
  initialAnalytics: CrmAnalytics;
  initialQueue: AutomationQueueItem[];
  initialTags: string[];
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [queue, setQueue] = useState(initialQueue);
  const [allTags, setAllTags] = useState(initialTags);

  const [tab, setTab] = useState<"customers" | "automation" | "analytics">("customers");
  const [seg, setSeg] = useState<RfmSegment | "all" | "due_today">("all");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>(initialCustomers[0]?.customerKey ?? "");
  const [noteInput, setNoteInput] = useState("");
  const [followup, setFollowup] = useState("");
  const [customTag, setCustomTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: customers.length,
      due_today: 0,
      vip: 0,
      refill_due: 0,
      new_buyer: 0,
      at_risk: 0,
      lead: 0,
    };
    for (const item of customers) {
      c[item.segment] = (c[item.segment] ?? 0) + 1;
      if (item.followupDue) c.due_today += 1;
    }
    return c;
  }, [customers]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return customers.filter((c) => {
      if (seg === "due_today" && !c.followupDue) return false;
      if (seg !== "all" && seg !== "due_today" && c.segment !== seg) return false;
      if (tagFilter && !c.tags.includes(tagFilter)) return false;
      if (!kw) return true;
      return (
        c.name.toLowerCase().includes(kw) ||
        c.phone.includes(kw) ||
        c.email.toLowerCase().includes(kw) ||
        c.tags.some((t) => t.toLowerCase().includes(kw))
      );
    });
  }, [customers, seg, tagFilter, q]);

  const selected = useMemo(
    () => customers.find((c) => c.customerKey === selectedKey) ?? filtered[0] ?? null,
    [customers, selectedKey, filtered],
  );

  async function postCrm(payload: Record<string, unknown>, okText?: string) {
    setBusy(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/admin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (res.ok && d.customers) {
        setCustomers(d.customers);
        if (d.analytics) setAnalytics(d.analytics);
        if (d.automationQueue) setQueue(d.automationQueue);
        if (d.allTags) setAllTags(d.allTags);
        if (okText) setStatusMsg(okText);
        return d;
      }
    } finally {
      setBusy(false);
    }
    return null;
  }

  function buildZaloTemplate(c: CrmCustomer) {
    const prod = c.lastProducts[0] ? ` (${c.lastProducts[0]})` : "";
    const ptsText =
      c.points > 0
        ? ` Hiện anh/chị đang có ${c.points} điểm thưởng có thể đổi quà/voucher tại Thực Dưỡng Phúc Thọ.`
        : "";
    return `Dạ chào anh/chị ${c.name}, em bên Thực Dưỡng Phúc Thọ ạ. Không biết anh/chị dùng sản phẩm${prod} vừa rồi thấy hợp và dễ dùng không ạ? Nếu cần tư vấn thêm thực đơn hoặc đặt lại định kỳ, em hỗ trợ mình ngay nhé.${ptsText}`;
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !noteInput.trim()) return;
    const ok = await postCrm({
      action: "add_note",
      customerKey: selected.customerKey,
      note: noteInput.trim(),
      nextFollowupDate: followup || null,
    });
    if (ok) {
      setNoteInput("");
      setFollowup("");
    }
  }

  const totalRev = analytics.newRevenue + analytics.returningRevenue;
  const returningRevPct = totalRev > 0 ? Math.round((analytics.returningRevenue / totalRev) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header + Main Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5 shadow-2xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">💎 CRM 360° — Chăm sóc Khách hàng Cũ &amp; Mới</h1>
          <p className="mt-1 text-xs text-gray-500">
            Nhắc việc lịch hẹn hôm nay, gắn thẻ bệnh lý/nhu cầu, tự động hóa +3/+25 ngày và báo cáo tỷ lệ quay lại.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CrmGuideDrawer />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setTab("customers")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-extrabold transition ${
            tab === "customers" ? "bg-brand text-white shadow-xs" : "border bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          👥 Chăm sóc &amp; Nhắc việc ({counts.due_today > 0 ? `${counts.due_today} cần gọi` : customers.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("automation")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-extrabold transition ${
            tab === "automation" ? "bg-brand text-white shadow-xs" : "border bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          🤖 Tự động hóa +3/+25 ngày ({queue.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("analytics")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-extrabold transition ${
            tab === "analytics" ? "bg-brand text-white shadow-xs" : "border bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          📊 Báo cáo Tỷ lệ Quay lại ({analytics.repeatRatePct}%)
        </button>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800">
          {statusMsg}
        </div>
      )}

      {/* TAB 1: CUSTOMERS & FOLLOWUPS & TAGS */}
      {tab === "customers" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSeg("due_today")}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                seg === "due_today"
                  ? "bg-red-600 text-white"
                  : counts.due_today > 0
                    ? "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                    : "border bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              🔔 Cần gọi hôm nay ({counts.due_today})
            </button>
            <button
              type="button"
              onClick={() => setSeg("all")}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold ${
                seg === "all" ? "bg-brand text-white" : "border bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Tất cả ({counts.all})
            </button>
            {(Object.keys(SEGMENT_META) as RfmSegment[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSeg(k)}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold ${
                  seg === k ? "bg-brand text-white" : "border bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {SEGMENT_META[k].label} ({counts[k] ?? 0})
              </button>
            ))}
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-gray-500">🏷️ Lọc theo Tag:</span>
              <button
                type="button"
                onClick={() => setTagFilter("")}
                className={`cursor-pointer rounded-md px-2 py-0.5 ${
                  !tagFilter ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Tất cả
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTagFilter(tagFilter === t ? "" : t)}
                  className={`cursor-pointer rounded-md px-2 py-0.5 font-semibold ${
                    tagFilter === t ? "bg-brand text-white" : "bg-emerald-50 text-brand hover:bg-emerald-100"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <div className="space-y-3 rounded-2xl border bg-white p-4">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo tên, SĐT, email hoặc #tag..."
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm outline-none focus:border-brand"
              />

              <div className="max-h-[540px] divide-y overflow-y-auto">
                {filtered.map((c) => {
                  const meta = SEGMENT_META[c.segment];
                  const isSelected = selected?.customerKey === c.customerKey;
                  return (
                    <button
                      key={c.customerKey}
                      type="button"
                      onClick={() => setSelectedKey(c.customerKey)}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 p-3 text-left transition hover:bg-emerald-50/40 ${
                        isSelected ? "bg-emerald-50/80" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-gray-900">{c.name}</span>
                          {c.followupDue && (
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              🔔 Hẹn hôm nay
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {c.phone || "Chưa có SĐT"} · {c.ordersCount} đơn · {c.points}đ
                        </div>
                        {c.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.tags.map((t) => (
                              <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-extrabold text-accent">{vnd(c.totalSpent)}</div>
                        <div className="text-[10px] text-gray-400">
                          {c.daysSinceLastOrder !== null ? `${c.daysSinceLastOrder} ngày trước` : "Chưa mua"}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-xs text-gray-400">Không có khách hàng phù hợp.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              {!selected ? (
                <p className="text-xs text-gray-500">Chọn một khách hàng để xem hồ sơ chi tiết.</p>
              ) : (
                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-extrabold text-gray-900">{selected.name}</h2>
                        <div className="text-xs text-gray-500">
                          📞 {selected.phone || "—"} · ✉️ {selected.email || "—"}
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800">
                        {selected.tier.toUpperCase()} · {selected.points}đ
                      </span>
                    </div>

                    {selected.followupDue && (
                      <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs">
                        <span className="font-bold text-red-700">
                          🔔 Đã đến lịch hẹn chăm sóc ({selected.nextFollowupDate})
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            postCrm(
                              { action: "done_followup", customerKey: selected.customerKey },
                              "✓ Đã đánh dấu hoàn tất lịch hẹn gọi lại!",
                            )
                          }
                          className="cursor-pointer rounded-lg bg-red-600 px-2.5 py-1 font-bold text-white hover:bg-red-700"
                        >
                          ✓ Đã xử lý
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tags Section */}
                  <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                    <div className="text-xs font-bold text-gray-700">🏷️ Thẻ phân loại bệnh lý / nhu cầu:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold text-white"
                        >
                          {t}
                          <button
                            type="button"
                            onClick={() => postCrm({ action: "remove_tag", customerKey: selected.customerKey, tag: t })}
                            className="cursor-pointer opacity-80 hover:opacity-100"
                            title="Gỡ thẻ"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {SUGGESTED_TAGS.filter((t) => !selected.tags.includes(t)).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => postCrm({ action: "add_tag", customerKey: selected.customerKey, tag: t })}
                          className="cursor-pointer rounded-full border border-dashed border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-600 hover:border-brand hover:text-brand"
                        >
                          + {t}
                        </button>
                      ))}
                    </div>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!customTag.trim()) return;
                        await postCrm({ action: "add_tag", customerKey: selected.customerKey, tag: customTag.trim() });
                        setCustomTag("");
                      }}
                      className="flex gap-1.5 pt-1"
                    >
                      <input
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        placeholder="Thêm tag khác (VD: #Mất_ngủ)..."
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs outline-none focus:border-brand"
                      />
                      <button className="cursor-pointer rounded-lg bg-gray-800 px-3 py-1 text-xs font-bold text-white">
                        Gắn
                      </button>
                    </form>
                  </div>

                  {/* 1-Click Zalo Care Box */}
                  <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900">💬 Tin nhắn chăm sóc Zalo 1-Click</span>
                      {selected.phone && (
                        <a
                          href={`https://zalo.me/${selected.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-[#0068FF] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90"
                        >
                          Mở Zalo ↗
                        </a>
                      )}
                    </div>
                    <p className="rounded-lg border border-blue-100 bg-white p-2.5 text-xs leading-relaxed text-gray-700">
                      {buildZaloTemplate(selected)}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(buildZaloTemplate(selected));
                        setCopiedMsg(selected.customerKey);
                        setTimeout(() => setCopiedMsg(""), 2000);
                      }}
                      className="cursor-pointer rounded-lg border border-blue-300 bg-white px-3 py-1 text-[11px] font-bold text-blue-800 hover:bg-blue-100"
                    >
                      {copiedMsg === selected.customerKey ? "✓ Đã copy mẫu tin nhắn!" : "📋 Copy tin nhắn cá nhân hóa"}
                    </button>
                  </div>

                  {/* Care Notes */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-600">
                      📝 Nhật ký tư vấn &amp; Hẹn gọi lại
                    </h3>
                    <form onSubmit={saveNote} className="space-y-2">
                      <textarea
                        required
                        rows={2}
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Ghi chú thể trạng, sở thích sản phẩm hoặc kết quả hỏi thăm..."
                        className="w-full rounded-xl border border-gray-300 p-2.5 text-xs outline-none focus:border-brand"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={followup}
                          onChange={(e) => setFollowup(e.target.value)}
                          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className="ml-auto cursor-pointer rounded-lg bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                        >
                          {busy ? "Đang lưu..." : "Lưu ghi chú"}
                        </button>
                      </div>
                    </form>

                    <div className="max-h-44 space-y-2 overflow-y-auto">
                      {selected.notes.map((n) => (
                        <div key={n.id} className="rounded-lg border bg-gray-50 p-2.5 text-xs">
                          <div className="text-gray-800">{n.note}</div>
                          <div className="mt-1 text-[10px] text-gray-400">
                            {n.created_at.slice(0, 16)} · {n.admin_email}
                            {n.next_followup_date && (
                              <span
                                className={`ml-2 font-bold ${
                                  n.followup_done ? "text-emerald-700 line-through" : "text-amber-700"
                                }`}
                              >
                                · Hẹn lại: {n.next_followup_date}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: AUTOMATION (+3 DAYS / +25 DAYS) */}
      {tab === "automation" && (
        <div className="space-y-4 rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">
                🤖 Hàng chờ Chăm sóc Tự động (Ngày +3 Hướng dẫn · Ngày +25 Nhắc mua lại)
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Các đơn hàng hoàn thành (<code>done</code>) chạm mốc 3 ngày hoặc 25 ngày tự động xuất hiện tại đây.
              </p>
            </div>
            <button
              type="button"
              disabled={busy || queue.length === 0}
              onClick={async () => {
                const res = await postCrm({ action: "run_email_automation" });
                if (res?.emailResult) {
                  setStatusMsg(
                    `✓ Đã chạy Email Automation: Đã gửi ${res.emailResult.sent} email, bỏ qua ${res.emailResult.skipped} (thiếu email hoặc chưa cấu hình SMTP).`,
                  );
                }
              }}
              className="cursor-pointer rounded-xl bg-brand px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-brand-dark disabled:opacity-50"
            >
              ▶ Chạy gửi Email tự động ngay
            </button>
          </div>

          {queue.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Hiện chưa có đơn hàng <code>done</code> nào đang ở mốc Ngày +3 hoặc Ngày +25 cần gửi.
            </p>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => (
                <div key={`${item.orderId}-${item.stepCode}`} className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          item.stepCode === "day3_guide"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.stepCode === "day3_guide" ? "📘 Ngày +3: Hướng dẫn dùng" : "🔄 Ngày +25: Nhắc mua lại"}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {item.customerName} — #{item.orderCode}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">Đã {item.daysSinceOrder} ngày từ lúc đặt</span>
                  </div>
                  <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700">{item.messageText}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.phone && (
                      <a
                        href={`https://zalo.me/${item.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-[#0068FF] px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Mở Zalo ({item.phone}) ↗
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(item.messageText);
                        setStatusMsg(`✓ Đã copy tin nhắn cho đơn #${item.orderCode}`);
                      }}
                      className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      📋 Copy nội dung
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        postCrm(
                          {
                            action: "mark_automation_sent",
                            orderId: item.orderId,
                            stepCode: item.stepCode,
                            channel: "zalo_manual",
                            recipient: item.phone || item.email,
                          },
                          `✓ Đã đánh dấu hoàn tất chăm sóc đơn #${item.orderCode}`,
                        )
                      }
                      className="ml-auto cursor-pointer rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-brand hover:bg-emerald-100"
                    >
                      ✓ Đánh dấu đã gửi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RETENTION RATE & ADVISOR ANALYTICS */}
      {tab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-gray-500">Tổng khách đã mua</div>
              <div className="mt-1 text-2xl font-extrabold text-gray-900">{analytics.totalBuyers}</div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-gray-500">Khách quay lại (&ge; 2 đơn)</div>
              <div className="mt-1 text-2xl font-extrabold text-brand">{analytics.repeatBuyers}</div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-gray-500">Tỷ lệ Quay lại (Retention)</div>
              <div className="mt-1 text-2xl font-extrabold text-accent">{analytics.repeatRatePct}%</div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-gray-500">Doanh thu từ khách cũ</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-700">{vnd(analytics.returningRevenue)}</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-gray-900">💰 Tỷ trọng Doanh thu Khách mới vs Khách quay lại</h3>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Đơn đầu (Khách mới): <strong>{vnd(analytics.newRevenue)}</strong></span>
              <span>Đơn lặp lại (Khách cũ): <strong className="text-brand">{vnd(analytics.returningRevenue)} ({returningRevPct}%)</strong></span>
            </div>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="bg-amber-400" style={{ width: `${100 - returningRevPct}%` }} title="Khách mới" />
              <div className="bg-brand" style={{ width: `${returningRevPct}%` }} title="Khách quay lại" />
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <h3 className="mb-3 text-sm font-extrabold text-gray-900">👩‍⚕️ Hiệu quả Chăm sóc theo Tư vấn viên</h3>
            {analytics.advisorStats.length === 0 ? (
              <p className="text-xs text-gray-500">Chưa có ghi chú chăm sóc nào được ghi nhận.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-gray-50 uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Tư vấn viên</th>
                      <th className="px-3 py-2 text-center">Số khách đã chăm</th>
                      <th className="px-3 py-2 text-center">Tổng ghi chú</th>
                      <th className="px-3 py-2 text-center">Lịch hẹn đã hoàn tất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analytics.advisorStats.map((a) => (
                      <tr key={a.adminEmail}>
                        <td className="px-3 py-2.5 font-bold text-gray-900">{a.adminEmail}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-brand">{a.caredCustomers}</td>
                        <td className="px-3 py-2.5 text-center">{a.notesCount}</td>
                        <td className="px-3 py-2.5 text-center font-semibold text-emerald-700">{a.followupsDone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
