"use client";

import { useMemo } from "react";

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

export function useRotatingHotline(raw: string | string[], _intervalMs = 5000) {
  const list = useMemo(() => parseHotlineNumbers(raw), [raw]);
  const current = list.join(" - ") || (typeof raw === "string" ? raw.trim() : "");
  const first = list[0] ?? current;
  const tel = first.replace(/[^\d+]/g, "");
  return { current, tel, count: list.length, list };
}

export default function RotatingHotline({
  raw,
  prefix = "",
  suffix = "",
  className = "",
  onClick,
}: {
  raw: string | string[];
  prefix?: string;
  suffix?: string;
  className?: string;
  intervalMs?: number;
  onClick?: () => void;
}) {
  const list = useMemo(() => parseHotlineNumbers(raw), [raw]);
  if (list.length === 0) return null;

  if (list.length === 1) {
    const only = list[0];
    const tel = only.replace(/[^\d+]/g, "");
    return (
      <a
        href={`tel:${tel}`}
        onClick={onClick}
        className={className}
        title={`Gọi Hotline ${only}`}
      >
        {prefix}
        <span>{only}</span>
        {suffix}
      </a>
    );
  }

  return (
    <span className={className}>
      {prefix}
      {list.map((phone, idx) => {
        const tel = phone.replace(/[^\d+]/g, "");
        return (
          <span key={phone}>
            {idx > 0 && <span className="mx-1.5 opacity-75">-</span>}
            <a
              href={`tel:${tel}`}
              onClick={onClick}
              className="hover:underline"
              title={`Gọi Hotline ${phone}`}
            >
              {phone}
            </a>
          </span>
        );
      })}
      {suffix}
    </span>
  );
}
