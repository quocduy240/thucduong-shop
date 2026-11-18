"use client";

import { useState } from "react";

export default function NewsletterBar({ hotline }: { hotline: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const phones = hotline
    .split("-")
    .map((s) => s.trim())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "footer" }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (res.ok) {
        setDone(true);
        setMsg(data.message ?? "✓ Cảm ơn bạn đã đăng ký nhận tin!");
        setEmail("");
        setTimeout(() => setDone(false), 5000);
      } else {
        setDone(true);
        setMsg(data.error ?? "Email không hợp lệ.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-gray-200 bg-green-50/80 text-gray-800">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-4 md:flex-row md:items-center">
        {/* Left: Newsletter signup */}
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto md:flex-1">
          <div className="flex shrink-0 items-center gap-2 font-bold text-brand">
            <span className="text-lg" aria-hidden>✉️</span>
            <span>Đăng ký nhận tin</span>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email của bạn..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-800 outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Đăng ký
            </button>
          </form>
          {done && (
            <span className="text-xs font-medium text-brand">
              {msg}
            </span>
          )}
        </div>

        {/* Right: Support / Hotline */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-white" aria-hidden>
            📞
          </span>
          <span className="font-medium text-gray-700">Hỗ trợ / Mua hàng:</span>
          <span className="font-bold text-accent">
            {phones.length > 0 ? (
              phones.map((ph, idx) => (
                <span key={ph}>
                  {idx > 0 && <span className="mx-1 text-gray-400">-</span>}
                  <a href={`tel:${ph.replace(/[^\d]/g, "")}`} className="hover:underline">
                    {ph}
                  </a>
                </span>
              ))
            ) : (
              <a href="tel:0767518592" className="hover:underline">
                0767.518.592 - 0858.816.070
              </a>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
