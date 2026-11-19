"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SelectOption = { code: string; name: string };

function stripAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export default function SearchableSelect({
  name,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Gõ để tìm nhanh...",
  disabled = false,
  required = false,
}: {
  name: string;
  options: SelectOption[];
  value: string;
  onChange: (code: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => options.find((o) => o.code === value), [options, value]);

  const filtered = useMemo(() => {
    const q = stripAccents(query);
    if (!q) return options;
    return options.filter((o) => stripAccents(o.name).includes(q));
  }, [options, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery("");
    }
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      {/* Hidden input keeps native form submission + HTML5 required validation */}
      <input
        type="text"
        name={name}
        value={value}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm transition focus:border-brand focus:outline-none ${
          disabled ? "cursor-not-allowed bg-gray-100 text-gray-400" : "cursor-pointer hover:border-gray-400"
        }`}
      >
        <span className={`truncate ${selected ? "font-medium text-gray-900" : "text-gray-500"}`}>
          {selected ? selected.name : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0 text-xs text-gray-400">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setOpen(true);
              }}
              className="rounded px-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Xóa lựa chọn"
            >
              ✕
            </span>
          )}
          <span>▾</span>
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 bg-gray-50 p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && filtered.length > 0) {
                  e.preventDefault();
                  onChange(filtered[0].code);
                  setOpen(false);
                }
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand"
            />
          </div>

          <ul className="max-h-60 overflow-y-auto py-1 text-sm">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-gray-400">
                Không tìm thấy kết quả phù hợp với &ldquo;{query}&rdquo;
              </li>
            ) : (
              filtered.map((o) => {
                const active = o.code === value;
                return (
                  <li key={o.code}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(o.code);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left transition hover:bg-green-50 hover:text-brand ${
                        active ? "bg-green-50 font-semibold text-brand" : "text-gray-700"
                      }`}
                    >
                      <span className="truncate">{o.name}</span>
                      {active && <span className="text-xs">✓</span>}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
