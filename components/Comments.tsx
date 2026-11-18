"use client";

import { useCallback, useEffect, useState } from "react";

type Comment = { id: number; name: string; content: string; rating: number; created_at: string };
type Stats = { avg: number; total: number; counts: Record<number, number> };

const RATING_LABELS: Record<number, string> = {
  5: "Tuyệt vời (5 sao)",
  4: "Hài lòng (4 sao)",
  3: "Bình thường (3 sao)",
  2: "Chưa ưng ý (2 sao)",
  1: "Không hài lòng (1 sao)",
};

function Stars({ rating, size = "text-sm" }: { rating: number; size?: string }) {
  const r = Math.max(1, Math.min(5, Math.round(rating || 5)));
  return (
    <span className={`inline-flex items-center tracking-tight ${size}`} aria-label={`${r} trên 5 sao`}>
      <span className="text-amber-500">{"★".repeat(r)}</span>
      <span className="text-gray-300">{"★".repeat(5 - r)}</span>
    </span>
  );
}

/** Product comments & star ratings — GET /load-comment, POST /submit-comment (reference site paths). */
export default function Comments({ productId }: { productId: number }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [stats, setStats] = useState<Stats>({ avg: 0, total: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [msg, setMsg] = useState("");
  const [isErr, setIsErr] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/load-comment?product_id=${productId}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
      if (data.stats) setStats(data.stats);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setIsErr(false);
    const res = await fetch("/submit-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, name, content, rating }),
    });
    const data = await res.json();
    if (!res.ok) {
      setIsErr(true);
      return setMsg(data.error ?? "Gửi đánh giá thất bại.");
    }
    setName("");
    setContent("");
    setRating(5);
    setMsg("Cảm ơn quý khách đã gửi đánh giá sản phẩm!");
    load();
  }

  return (
    <div className="space-y-6">
      {/* Rating Overview Card */}
      <div className="grid gap-6 rounded-xl border border-green-100 bg-green-50/40 p-5 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center justify-center border-b border-green-100 pb-4 text-center md:border-b-0 md:border-r md:pb-0 md:pr-4">
          <div className="text-4xl font-extrabold text-brand">
            {stats.total > 0 ? stats.avg : "5.0"}
            <span className="text-lg font-normal text-gray-500"> / 5</span>
          </div>
          <div className="mt-1">
            <Stars rating={stats.total > 0 ? stats.avg : 5} size="text-lg" />
          </div>
          <p className="mt-1 text-xs text-gray-600">
            {stats.total > 0 ? `${stats.total} đánh giá từ khách hàng` : "Chưa có đánh giá — hãy là người đầu tiên!"}
          </p>
        </div>

        <div className="flex flex-col justify-center space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.counts?.[star] ?? 0;
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : star === 5 ? 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2.5 text-xs">
                <span className="w-12 shrink-0 font-medium text-gray-700">{star} sao ★</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${stats.total > 0 ? pct : 0}%` }}
                  />
                </div>
                <span className="w-8 text-right text-gray-500">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form & Review List */}
      <div className="grid gap-6 md:grid-cols-[360px_1fr]">
        <form onSubmit={submit} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm h-fit">
          <h3 className="font-bold text-gray-800">Gửi đánh giá của bạn</h3>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Chọn mức độ hài lòng:</label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className={`text-2xl transition hover:scale-110 ${
                    s <= rating ? "text-amber-400" : "text-gray-300"
                  }`}
                  title={RATING_LABELS[s]}
                >
                  ★
                </button>
              ))}
              <span className="ml-2 text-xs font-medium text-amber-700">{RATING_LABELS[rating]}</span>
            </div>
          </div>

          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Họ và tên của bạn *"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Chia sẻ cảm nhận về chất lượng sản phẩm, hương vị, đóng gói... *"
            rows={4}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button className="w-full rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
            Gửi đánh giá
          </button>
          {msg && (
            <p className={`text-xs font-medium ${isErr ? "text-red-600" : "text-brand"}`}>
              {msg}
            </p>
          )}
        </form>

        <ul className="space-y-3">
          {items.length === 0 && (
            <li className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-gray-500">
              Chưa có bình luận nào cho sản phẩm này. Hãy để lại cảm nhận đầu tiên của bạn!
            </li>
          )}
          {items.map((c) => {
            const initial = (c.name.trim()[0] || "K").toUpperCase();
            return (
              <li key={c.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800">{c.name}</span>
                        <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                          ✓ Đã đánh giá
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{c.created_at.slice(0, 16)}</span>
                    </div>
                    <div className="mt-0.5">
                      <Stars rating={c.rating || 5} size="text-xs" />
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{c.content}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
