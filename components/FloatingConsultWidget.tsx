"use client";

import { useState } from "react";

export type FloatingWidgetConfig = {
  widget_enabled: string;
  widget_zalo: string;
  widget_messenger: string;
  widget_hotline: string;
  widget_hotline_2: string;
  widget_quick_ask_title: string;
  widget_quick_ask_subtitle: string;
};

function normalizeZaloUrl(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const digits = s.replace(/[^\d]/g, "");
  return digits ? `https://zalo.me/${digits}` : "";
}

function normalizeMessengerUrl(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://m.me/${s.replace(/^@/, "")}`;
}

function normalizeTel(raw: string): string {
  return (raw || "").replace(/[^\d+]/g, "");
}

export default function FloatingConsultWidget({ config }: { config: FloatingWidgetConfig }) {
  const [openAsk, setOpenAsk] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (config.widget_enabled === "0") return null;

  const zaloUrl = normalizeZaloUrl(config.widget_zalo);
  const messengerUrl = normalizeMessengerUrl(config.widget_messenger);
  const hotlineDisplay = config.widget_hotline.trim();
  const hotlineTel = normalizeTel(hotlineDisplay);

  async function handleQuickAskSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");
    setBusy(true);
    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          question: question.trim(),
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Không gửi được câu hỏi.");
      }
      setSuccessMsg(
        data.message || "Đã gửi câu hỏi thành công! Tư vấn viên sẽ liên hệ lại qua số điện thoại của bạn.",
      );
      setName("");
      setPhone("");
      setQuestion("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-20 right-3 z-40 flex flex-col items-end gap-2.5 md:bottom-6 sm:right-5 print:hidden">
      {/* Popup Hỏi Nhanh (gửi câu hỏi qua email + báo tư vấn viên gọi lại SĐT) */}
      {openAsk && (
        <div className="mb-1 w-[calc(100vw-24px)] max-w-sm overflow-hidden rounded-2xl border-2 border-brand/30 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-brand-dark to-brand px-4 py-3 text-white">
            <div>
              <div className="text-sm font-extrabold">
                💬 {config.widget_quick_ask_title || "Tư vấn Thực Dưỡng 1:1"}
              </div>
              <div className="text-[11px] text-green-100">
                Gửi câu hỏi &amp; nhận cuộc gọi tư vấn miễn phí
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpenAsk(false)}
              className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-xs font-bold text-white hover:bg-white/30 cursor-pointer"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleQuickAskSubmit} className="space-y-3 p-4 text-xs">
            <p className="text-[11px] leading-relaxed text-gray-600">
              {config.widget_quick_ask_subtitle ||
                "Để lại số điện thoại & câu hỏi, chuyên viên Thực Dưỡng Phúc Thọ sẽ liên hệ lại tư vấn cho bạn."}
            </p>

            {err && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-700">
                {err}
              </div>
            )}
            {successMsg && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">
                ✅ {successMsg}
              </div>
            )}

            <div>
              <label className="mb-1 block font-bold text-gray-700">Họ tên của bạn</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Cô Lan, Anh Minh..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-gray-700">
                Số điện thoại liên hệ lại *
              </label>
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0912345678"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-gray-700">Câu hỏi / Nhu cầu tư vấn *</label>
              <textarea
                required
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="VD: Tôi muốn hỏi cách nấu cháo gạo lứt cho người tiểu đường hoặc chọn sản phẩm phù hợp..."
                className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none focus:border-brand"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-brand-dark to-brand py-2.5 text-xs font-extrabold text-white shadow hover:opacity-95 disabled:opacity-50 cursor-pointer"
            >
              {busy ? "⏳ Đang gửi thông tin..." : "📩 Gửi câu hỏi & Yêu cầu gọi lại"}
            </button>

            {(hotlineDisplay || config.widget_hotline_2) && (
              <div className="border-t pt-2 text-center text-[11px] text-gray-500">
                Hoặc gọi ngay:{" "}
                <a href={`tel:${hotlineTel}`} className="font-bold text-accent hover:underline">
                  {hotlineDisplay}
                </a>
                {config.widget_hotline_2 && (
                  <>
                    {" "}
                    -{" "}
                    <a
                      href={`tel:${normalizeTel(config.widget_hotline_2)}`}
                      className="font-bold text-accent hover:underline"
                    >
                      {config.widget_hotline_2}
                    </a>
                  </>
                )}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Cột 4 nút Tư vấn dọc góc dưới bên phải */}
      {!collapsed && (
        <div className="flex flex-col items-end gap-2.5">
          {/* 1. Hỏi nhanh */}
          <button
            type="button"
            onClick={() => {
              setErr("");
              setSuccessMsg("");
              setOpenAsk((o) => !o);
            }}
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 p-1.5 pr-3.5 text-white shadow-lg transition hover:scale-105 cursor-pointer"
            title="Hỏi nhanh tư vấn viên"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-base shadow-xs">
              💬
            </span>
            <span className="text-xs font-extrabold tracking-wide">Hỏi nhanh</span>
          </button>

          {/* 2. Zalo */}
          {zaloUrl && (
            <a
              href={zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-full bg-[#0068FF] p-1.5 pr-3.5 text-white shadow-lg transition hover:scale-105"
              title="Nhắn tin tư vấn qua Zalo"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[11px] font-black text-[#0068FF] shadow-xs">
                Zalo
              </span>
              <span className="text-xs font-extrabold">Chat Zalo</span>
            </a>
          )}

          {/* 3. Messenger */}
          {messengerUrl && (
            <a
              href={messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00B2FF] to-[#006AFF] p-1.5 pr-3.5 text-white shadow-lg transition hover:scale-105"
              title="Nhắn tin qua Facebook Messenger"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#006AFF] shadow-xs">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.145 2 11.259c0 2.913 1.454 5.512 3.726 7.21V22l3.405-1.869c.91.252 1.873.388 2.869.388 5.523 0 10-4.145 10-9.26C22 6.145 17.523 2 12 2zm1.06 12.466-2.548-2.717-4.97 2.717 5.468-5.804 2.61 2.717 4.908-2.717-5.468 5.804z" />
                </svg>
              </span>
              <span className="text-xs font-extrabold">Messenger</span>
            </a>
          )}

          {/* 4. Hotline */}
          {hotlineTel && (
            <a
              href={`tel:${hotlineTel}`}
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-[#dc2626] to-[#b91c1c] p-1.5 pr-3.5 text-white shadow-lg transition hover:scale-105"
              title={`Gọi Hotline ${hotlineDisplay}`}
            >
              <span className="grid h-9 w-9 animate-pulse place-items-center rounded-full bg-white text-base text-[#dc2626] shadow-xs">
                📞
              </span>
              <span className="text-xs font-extrabold">{hotlineDisplay}</span>
            </a>
          )}
        </div>
      )}

      {/* Nút thu gọn / mở thanh tư vấn */}
      <button
        type="button"
        onClick={() => {
          setCollapsed((c) => !c);
          if (!collapsed) setOpenAsk(false);
        }}
        className="rounded-full border border-gray-300 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-gray-600 shadow hover:bg-gray-100 cursor-pointer"
        title={collapsed ? "Mở thanh tư vấn" : "Thu gọn thanh tư vấn"}
      >
        {collapsed ? "💬 Tư vấn ▲" : "Thu gọn ▼"}
      </button>
    </div>
  );
}
