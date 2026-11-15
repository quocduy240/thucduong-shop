"use client";

import { useCallback, useEffect, useState } from "react";

type Comment = { id: number; name: string; content: string; created_at: string };

/** Product comments — GET /load-comment, POST /submit-comment (reference site paths). */
export default function Comments({ productId }: { productId: number }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/load-comment?product_id=${productId}`);
    if (res.ok) setItems((await res.json()).items);
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/submit-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, name, content }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error ?? "Gửi bình luận thất bại.");
    setName("");
    setContent("");
    setMsg("Cảm ơn bạn đã bình luận!");
    load();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={submit} className="space-y-3">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Họ tên*" className="w-full rounded border px-3 py-2" />
        <textarea required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Bình luận*" rows={4} className="w-full rounded border px-3 py-2" />
        {/* TODO: captcha (reference site uses /ajax_regen_captcha) */}
        <button className="rounded bg-brand px-5 py-2 font-semibold text-white">Gửi</button>
        {msg && <p className="text-sm text-brand">{msg}</p>}
      </form>
      <ul className="space-y-3">
        {items.length === 0 && <li className="text-sm text-gray-500">Chưa có bình luận nào.</li>}
        {items.map((c) => (
          <li key={c.id} className="rounded-lg bg-gray-50 p-3">
            <div className="text-sm font-semibold">{c.name} <span className="font-normal text-gray-400">· {c.created_at.slice(0, 16)}</span></div>
            <p className="mt-1 text-sm">{c.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
