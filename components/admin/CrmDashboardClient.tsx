"use client";

import { useMemo, useState } from "react";
import type { CrmCustomer, RfmSegment } from "@/lib/crm";
import { vnd } from "@/lib/site";

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

export default function CrmDashboardClient({ initialCustomers }: { initialCustomers: CrmCustomer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [seg, setSeg] = useState<RfmSegment | "all">("all");
  const [q, setQ] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>(initialCustomers[0]?.customerKey ?? "");
  const [noteInput, setNoteInput] = useState("");
  const [followup, setFollowup] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: customers.length, vip: 0, refill_due: 0, new_buyer: 0, at_risk: 0, lead: 0 };
    for (const item of customers) c[item.segment] = (c[item.segment] ?? 0) + 1;
    return c;
  }, [customers]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return customers.filter((c) => {
      if (seg !== "all" && c.segment !== seg) return false;
      if (!kw) return true;
      return (
        c.name.toLowerCase().includes(kw) ||
        c.phone.includes(kw) ||
        c.email.toLowerCase().includes(kw)
      );
    });
  }, [customers, seg, q]);

  const selected = useMemo(
    () => customers.find((c) => c.customerKey === selectedKey) ?? filtered[0] ?? null,
    [customers, selectedKey, filtered],
  );

  function buildZaloTemplate(c: CrmCustomer) {
    const prod = c.lastProducts[0] ? ` (${c.lastProducts[0]})` : "";
    const ptsText = c.points > 0 ? ` Hiện anh/chị đang có ${c.points} điểm thưởng có thể đổi quà/voucher tại Thực Dưỡng Phúc Thọ.` : "";
    return `Dạ chào anh/chị ${c.name}, em bên Thực Dưỡng Phúc Thọ ạ. Không biết anh/chị dùng sản phẩm${prod} vừa rồi thấy hợp và dễ dùng không ạ? Nếu cần tư vấn thêm thực đơn hoặc đặt lại định kỳ, em hỗ trợ mình ngay nhé.${ptsText}`;
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !noteInput.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerKey: selected.customerKey,
          note: noteInput.trim(),
          nextFollowupDate: followup || null,
        }),
      });
      const d = await res.json();
      if (res.ok && d.customers) {
        setCustomers(d.customers);
        setNoteInput("");
        setFollowup("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-white p-5 shadow-2xs">
        <h1 className="text-xl font-extrabold text-gray-900">💎 CRM 360° — Chăm sóc Khách hàng Cũ &amp; Mới</h1>
        <p className="mt-1 text-xs text-gray-500">
          Tự động phân khúc khách theo chu kỳ mua hàng (RFM), gợi ý khách sắp hết sản phẩm và lưu nhật ký tư vấn.
        </p>
      </div>

      {/* Segment Filter Pills */}
      <div className="flex flex-wrap gap-2">
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

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        {/* Left: Customer List */}
        <div className="rounded-2xl border bg-white p-4 space-y-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên, SĐT, email..."
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
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {c.phone || "Chưa có SĐT"} · {c.ordersCount} đơn · {c.points}đ
                    </div>
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

        {/* Right: 360 Customer Detail + Zalo Template + CRM Notes */}
        <div className="rounded-2xl border bg-white p-5">
          {!selected ? (
            <p className="text-xs text-gray-500">Chọn một khách hàng để xem hồ sơ chi tiết.</p>
          ) : (
            <div className="space-y-5">
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
                <p className="mt-2 rounded-lg bg-gray-50 px-3 py-1.5 text-[11px] text-gray-600">
                  💡 Gợi ý: {SEGMENT_META[selected.segment].hint}
                </p>
              </div>

              {selected.lastProducts.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-bold text-gray-700">🛍️ Sản phẩm mua gần nhất:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.lastProducts.map((p, i) => (
                      <span key={i} className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-brand">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 1-Click Zalo Care Box */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-2">
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
                <p className="rounded-lg bg-white p-2.5 text-xs leading-relaxed text-gray-700 border border-blue-100">
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
              <div className="space-y-3">
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
                      title="Ngày hẹn chăm sóc lại"
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="ml-auto cursor-pointer rounded-lg bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                    >
                      {saving ? "Đang lưu..." : "Lưu ghi chú"}
                    </button>
                  </div>
                </form>

                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {selected.notes.map((n) => (
                    <div key={n.id} className="rounded-lg border bg-gray-50 p-2.5 text-xs">
                      <div className="text-gray-800">{n.note}</div>
                      <div className="mt-1 text-[10px] text-gray-400">
                        {n.created_at.slice(0, 16)} · {n.admin_email}
                        {n.next_followup_date && (
                          <span className="ml-2 font-bold text-amber-700">· Hẹn lại: {n.next_followup_date}</span>
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
    </div>
  );
}
