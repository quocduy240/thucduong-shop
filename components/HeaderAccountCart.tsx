"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SessionSummary = { cartCount: number; memberName: string | null };

let inflight: Promise<SessionSummary> | null = null;
let lastFetchAt = 0;
let cachedSummary: SessionSummary | null = null;
const SESSION_CACHE_TTL_MS = 45_000;

export function fetchSessionSummary(force = false): Promise<SessionSummary> {
  const now = Date.now();
  if (!force && cachedSummary && now - lastFetchAt < SESSION_CACHE_TTL_MS) {
    return Promise.resolve(cachedSummary);
  }
  if (inflight && (!force || now - lastFetchAt < 400)) return inflight;
  lastFetchAt = now;
  inflight = fetch("/api/v2/session-summary", { credentials: "same-origin" })
    .then((r) => (r.ok ? (r.json() as Promise<SessionSummary>) : { cartCount: 0, memberName: null }))
    .then((data) => {
      cachedSummary = data;
      return data;
    })
    .catch(() => cachedSummary ?? { cartCount: 0, memberName: null });
  return inflight;
}

export function useSessionSummary() {
  const pathname = usePathname();
  const [summary, setSummary] = useState<SessionSummary>(() => cachedSummary ?? { cartCount: 0, memberName: null });

  useEffect(() => {
    let active = true;
    const load = (force = false) => {
      fetchSessionSummary(force).then((data) => {
        if (active) setSummary(data);
      });
    };
    load(false);

    const onRefresh = () => load(true);
    window.addEventListener("td:cart-updated", onRefresh);
    window.addEventListener("focus", onRefresh);
    return () => {
      active = false;
      window.removeEventListener("td:cart-updated", onRefresh);
      window.removeEventListener("focus", onRefresh);
    };
  }, [pathname]);

  return summary;
}

export default function HeaderAccountCart() {
  const { cartCount, memberName } = useSessionSummary();

  return (
    <>
      <Link
        href="/thanh-vien/"
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-2 text-xs font-semibold transition sm:px-3 ${
          memberName
            ? "border-green-300 bg-green-50 text-brand hover:bg-green-100"
            : "border-gray-200 text-gray-700 hover:border-brand hover:text-brand"
        }`}
      >
        <span aria-hidden>{memberName ? "👑" : "👤"}</span>
        <span className="hidden sm:inline">{memberName || "Thành viên"}</span>
      </Link>
      <Link
        href="/cart"
        className="relative flex items-center gap-2 rounded-full border px-2.5 py-2 text-sm hover:border-brand sm:px-3"
      >
        <span aria-hidden>🛒</span>
        <span className="hidden sm:inline">Giỏ hàng</span>
        <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibold text-white">
          {cartCount}
        </span>
      </Link>
    </>
  );
}
