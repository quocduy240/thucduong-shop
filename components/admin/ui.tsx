import Link from "next/link";
import type { ReactNode } from "react";
import { ORDER_STATUS, PAGE_SIZE } from "@/lib/admin-data";

export const ui = {
  input: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
  label: "mb-1 block text-sm font-medium text-gray-700",
  primary: "inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark",
  secondary: "inline-block rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50",
  danger: "inline-block rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50",
  card: "rounded-xl border bg-white shadow-sm",
  th: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500",
  td: "px-4 py-3 align-middle text-sm",
};

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Flash({ saved, error }: { saved?: unknown; error?: unknown }) {
  if (typeof error === "string" && error) return <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (saved) return <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">Đã lưu thay đổi.</p>;
  return null;
}

const COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  shipping: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  returned: "bg-purple-100 text-purple-800",
  cancelled: "bg-gray-200 text-gray-600",
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status] ?? "bg-gray-100"}`}>
      {ORDER_STATUS[status as keyof typeof ORDER_STATUS] ?? status}
    </span>
  );
}

/** Prev/next + page numbers. `params` are the other query params to keep (q, status...). */
export function Pagination({
  basePath,
  page,
  total,
  params = {},
}: {
  basePath: string;
  page: number;
  total: number;
  params?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return <p className="mt-3 text-xs text-gray-500">{total} mục</p>;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const link = "rounded border px-3 py-1 text-sm hover:bg-gray-50";
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="mr-2 text-xs text-gray-500">{total} mục</span>
      {page > 1 && <Link href={href(page - 1)} className={link}>‹ Trước</Link>}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && n - nums[i - 1] > 1 && <span className="text-gray-400">…</span>}
          <Link href={href(n)} className={n === page ? "rounded border border-brand bg-brand px-3 py-1 text-sm text-white" : link}>{n}</Link>
        </span>
      ))}
      {page < pages && <Link href={href(page + 1)} className={link}>Sau ›</Link>}
    </div>
  );
}

export const pageParam = (v: unknown) => Math.max(1, Math.floor(Number(typeof v === "string" ? v : 1)) || 1);
export const strParam = (v: unknown) => (typeof v === "string" ? v.trim() : "");
