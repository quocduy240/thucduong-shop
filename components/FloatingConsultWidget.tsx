"use client";

import { useEffect, useRef, useState } from "react";
import { useRotatingHotline } from "./RotatingHotline";

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
  // Default collapsed on mobile (<768px) so content stays readable; expanded on desktop
  const [collapsed, setCollapsed] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceInterim, setVoiceInterim] = useState("");
  const recRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setCollapsed(false);
    }
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function toggleVoiceQuestion() {
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
      setListening(false);
      setVoiceInterim("");
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
        onerror: ((e: { error?: string }) => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
        onerror: ((e: { error?: string }) => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
    };

    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setErr("Trình duyệt chưa hỗ trợ nhập giọng nói. Vui lòng dùng Chrome, Safari mới hoặc Edge.");
      return;
    }

    setErr("");
    try {
      const rec = new SpeechRec();
      rec.lang = "vi-VN";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event) => {
        let finalText = "";
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript ?? "";
          if (item.isFinal) finalText += text;
          else interimText += text;
        }
        if (finalText.trim()) {
          setQuestion((prev) => (prev.trim() ? `${prev.trim()} ${finalText.trim()}` : finalText.trim()));
        }
        setVoiceInterim(interimText.trim());
      };
      rec.onerror = (event) => {
        if (event.error !== "aborted" && event.error !== "no-speech") {
          setErr("Không thu được giọng nói. Vui lòng kiểm tra quyền Micro.");
        }
        setListening(false);
        setVoiceInterim("");
      };
      rec.onend = () => {
        setListening(false);
        setVoiceInterim("");
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setErr("Không thể khởi động Micro. Vui lòng thử lại.");
      setListening(false);
    }
  }

  if (config.widget_enabled === "0") return null;

  const zaloUrl = normalizeZaloUrl(config.widget_zalo);
  const messengerUrl = normalizeMessengerUrl(config.widget_messenger);
  const { current: hotlineDisplay, tel: hotlineTel } = useRotatingHotline(
    [config.widget_hotline, config.widget_hotline_2].filter(Boolean),
    5000,
  );

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
    <>
      {/* Modal Hỏi Nhanh chính giữa màn hình */}
      {openAsk && (
        <div
          onClick={() => {
            if (listening) toggleVoiceQuestion();
            setOpenAsk(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs print:hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-brand/30 bg-white shadow-2xl"
          >
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
                onClick={() => {
                  if (listening) toggleVoiceQuestion();
                  setOpenAsk(false);
                }}
                className="grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-white/20 text-xs font-bold text-white hover:bg-white/30"
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
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="font-bold text-gray-700">Câu hỏi / Nhu cầu tư vấn *</label>
                <button
                  type="button"
                  onClick={toggleVoiceQuestion}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                    listening
                      ? "animate-pulse bg-red-600 text-white shadow-xs"
                      : "border border-emerald-300 bg-emerald-50 text-brand hover:bg-emerald-600 hover:text-white"
                  }`}
                  title="Bấm để nói tiếng Việt, tự động chuyển thành văn bản"
                >
                  <span>{listening ? "⏹️" : "🎙️"}</span>
                  <span>{listening ? "Đang nghe..." : "Nói thay gõ"}</span>
                </button>
              </div>
              <textarea
                required
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="VD: Tôi muốn hỏi cách nấu cháo gạo lứt cho người tiểu đường hoặc chọn sản phẩm phù hợp..."
                className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none focus:border-brand"
              />
              {listening && (
                <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] text-red-700">
                  <span className="inline-block h-2 w-2 shrink-0 animate-ping rounded-full bg-red-600" />
                  <span className="truncate italic">
                    {voiceInterim ? `"${voiceInterim}"` : "Hãy nói câu hỏi của bạn bằng tiếng Việt..."}
                  </span>
                </div>
              )}
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
        </div>
      )}

      <div className="fixed bottom-20 right-3 z-40 flex flex-col items-end gap-2.5 md:bottom-6 sm:right-5 print:hidden">
      {/* Cụm nút Tư vấn (Desktop: pill gọn; Mobile: mặc định thu gọn thành 1 nút FAB nhỏ) */}
      {!collapsed && (
        <div className="flex flex-col items-end gap-2">
          {/* 1. Hỏi nhanh */}
          <button
            type="button"
            onClick={() => {
              setErr("");
              setSuccessMsg("");
              setCollapsed(true);
              setOpenAsk(true);
            }}
            className="group flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 p-1 pr-3 text-white shadow-md transition hover:scale-105"
            title="Hỏi nhanh tư vấn viên"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm shadow-2xs md:h-8 md:w-8">
              💬
            </span>
            <span className="text-[11px] font-bold tracking-wide md:text-xs">Hỏi nhanh</span>
          </button>

          {/* 2. Zalo */}
          {zaloUrl && (
            <a
              href={zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 rounded-full bg-[#0068FF] p-1 pr-3 text-white shadow-md transition hover:scale-105"
              title="Nhắn tin tư vấn qua Zalo"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[10px] font-black text-[#0068FF] shadow-2xs md:h-8 md:w-8">
                Zalo
              </span>
              <span className="text-[11px] font-bold md:text-xs">Chat Zalo</span>
            </a>
          )}

          {/* 3. Messenger */}
          {messengerUrl && (
            <a
              href={messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#00B2FF] to-[#006AFF] p-1 pr-3 text-white shadow-md transition hover:scale-105"
              title="Nhắn tin qua Facebook Messenger"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#006AFF] shadow-2xs md:h-8 md:w-8">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.145 2 11.259c0 2.913 1.454 5.512 3.726 7.21V22l3.405-1.869c.91.252 1.873.388 2.869.388 5.523 0 10-4.145 10-9.26C22 6.145 17.523 2 12 2zm1.06 12.466-2.548-2.717-4.97 2.717 5.468-5.804 2.61 2.717 4.908-2.717-5.468 5.804z" />
                </svg>
              </span>
              <span className="text-[11px] font-bold md:text-xs">Messenger</span>
            </a>
          )}

          {/* 4. Hotline */}
          {hotlineTel && (
            <a
              href={`tel:${hotlineTel}`}
              className="group flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#dc2626] to-[#b91c1c] p-1 pr-3 text-white shadow-md transition hover:scale-105"
              title={`Gọi Hotline ${hotlineDisplay}`}
            >
              <span className="grid h-7 w-7 animate-pulse place-items-center rounded-full bg-white text-sm text-[#dc2626] shadow-2xs md:h-8 md:w-8">
                📞
              </span>
              <span className="text-[11px] font-bold md:text-xs">{hotlineDisplay}</span>
            </a>
          )}
        </div>
      )}

      {/* Nút mở/thu gọn (Speed-dial gọn trên mobile) */}
      <button
        type="button"
        onClick={() => {
          setCollapsed((c) => !c);
          if (!collapsed) setOpenAsk(false);
        }}
        className={`cursor-pointer flex items-center gap-1.5 rounded-full shadow-lg transition ${
          collapsed
            ? "border border-brand/20 bg-gradient-to-r from-brand-dark to-brand px-3 py-2 text-xs font-bold text-white hover:scale-105"
            : "border border-gray-300 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-100"
        }`}
        title={collapsed ? "Mở kênh tư vấn nhanh" : "Thu gọn thanh tư vấn"}
      >
        {collapsed ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-80" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span>💬 Tư vấn</span>
          </>
        ) : (
          <span>Thu gọn ▼</span>
        )}
      </button>
      </div>
    </>
  );
}
