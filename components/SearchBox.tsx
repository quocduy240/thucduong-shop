"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Hit = { name: string; url: string; type: "product" | "post"; price?: string };

/** Header search with autocomplete from /search/post/autocomplete (same path as the reference site). */
export default function SearchBox() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/search/post/autocomplete?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const data = await res.json();
        setHits(data.items ?? []);
        setOpen(true);
      } catch {
        /* aborted */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const shown = q.trim().length >= 2 ? hits : [];

  return (
    <form ref={box} action="/search/" className="relative mx-auto max-w-xl">
      <input
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => shown.length && setOpen(true)}
        placeholder="Nhập từ khóa"
        className="w-full rounded-full border px-4 py-2 pr-10 text-sm outline-none focus:border-brand"
        autoComplete="off"
      />
      <button className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-brand text-white" aria-label="Tìm kiếm">
        🔍
      </button>
      {open && shown.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-auto rounded-lg border bg-white text-sm shadow-lg">
          {shown.map((h) => (
            <li key={h.url}>
              <Link href={h.url} onClick={() => setOpen(false)} className="flex justify-between gap-2 px-4 py-2 hover:bg-green-50">
                <span>
                  <span className="mr-2 rounded bg-gray-100 px-1.5 text-[10px] uppercase text-gray-500">
                    {h.type === "product" ? "SP" : "Bài"}
                  </span>
                  {h.name}
                </span>
                {h.price && <span className="shrink-0 font-semibold text-accent">{h.price}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
