"use client";

import { useRouter } from "next/navigation";
import type { FrontendEditResource } from "@/lib/frontend-edit";
import { useFrontendAdmin } from "./FrontendAdminProvider";

export default function FrontendEditButton({
  resource,
  href,
  label = "Sửa",
  title,
  variant = "pill",
  className = "",
}: {
  resource: FrontendEditResource;
  href: string;
  label?: string;
  title?: string;
  variant?: "pill" | "badge" | "inline";
  className?: string;
}) {
  const router = useRouter();
  const { canEdit } = useFrontendAdmin();

  if (!canEdit(resource)) return null;

  const baseCls =
    variant === "badge"
      ? "inline-flex items-center gap-1 rounded-md bg-slate-900/85 px-2 py-1 text-[11px] font-bold text-white shadow-sm ring-1 ring-white/25 backdrop-blur transition hover:bg-brand"
      : variant === "inline"
        ? "inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-2xs transition hover:bg-amber-100"
        : "inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-1 text-xs font-bold text-white shadow-sm ring-1 ring-white/20 transition hover:bg-brand";

  return (
    <button
      type="button"
      title={title || `${label} trong trang Quản trị`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(href);
      }}
      className={`cursor-pointer ${baseCls} ${className}`}
    >
      <span aria-hidden="true">✏️</span>
      <span>{label}</span>
    </button>
  );
}
