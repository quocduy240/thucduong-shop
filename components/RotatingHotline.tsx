"use client";

import { useEffect, useMemo, useState } from "react";

export function parseHotlineNumbers(raw: string | string[]): string[] {
  const parts = Array.isArray(raw) ? raw : String(raw || "").split(/[-/|,\n]+/);
  const cleaned: string[] = [];
  for (const p of parts) {
    const s = p.trim();
    if (s && s.replace(/[^\d]/g, "").length >= 8 && !cleaned.includes(s)) {
      cleaned.push(s);
    }
  }
  return cleaned;
}

export function useRotatingHotline(raw: string | string[], intervalMs = 5000) {
  const list = useMemo(() => parseHotlineNumbers(raw), [raw]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (list.length <= 1) return;
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % list.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [list.length, intervalMs]);

  const current = list[idx % Math.max(1, list.length)] ?? (typeof raw === "string" ? raw.trim() : "");
  const tel = current.replace(/[^\d+]/g, "");
  return { current, tel, count: list.length };
}

export default function RotatingHotline({
  raw,
  prefix = "",
  suffix = "",
  className = "",
  intervalMs = 5000,
  onClick,
}: {
  raw: string | string[];
  prefix?: string;
  suffix?: string;
  className?: string;
  intervalMs?: number;
  onClick?: () => void;
}) {
  const { current, tel } = useRotatingHotline(raw, intervalMs);
  if (!current) return null;

  return (
    <a
      href={`tel:${tel}`}
      onClick={onClick}
      className={className}
      title={`Gọi Hotline ${current}`}
    >
      {prefix}
      <span className="transition-opacity duration-300">{current}</span>
      {suffix}
    </a>
  );
}
