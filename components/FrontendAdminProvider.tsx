"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  canEditFrontendResource,
  getFrontendQuickLinks,
  type FrontendEditResource,
} from "@/lib/frontend-edit";
import type { AdminRole } from "@/lib/rbac";

export type FrontendAdminInfo = {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  roleLabel: string;
};

type FrontendAdminContextValue = {
  admin: FrontendAdminInfo | null;
  viewAsUser: boolean;
  setViewAsUser: (next: boolean) => void;
  canEdit: (resource: FrontendEditResource) => boolean;
};

const FrontendAdminContext = createContext<FrontendAdminContextValue>({
  admin: null,
  viewAsUser: false,
  setViewAsUser: () => {},
  canEdit: () => false,
});

const STORAGE_KEY_VIEW_AS_USER = "td_admin_view_as_user";
const STORAGE_KEY_BAR_MINIMIZED = "td_admin_bar_minimized";

export function useFrontendAdmin() {
  return useContext(FrontendAdminContext);
}

export default function FrontendAdminProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const isAdminRoute = pathname.startsWith("/admin");

  const [admin, setAdmin] = useState<FrontendAdminInfo | null>(null);
  const [viewAsUser, setViewAsUserState] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    try {
      setViewAsUserState(localStorage.getItem(STORAGE_KEY_VIEW_AS_USER) === "1");
      setMinimized(localStorage.getItem(STORAGE_KEY_BAR_MINIMIZED) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/frontend-context", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.isAdmin && data.admin) {
          setAdmin(data.admin);
        } else {
          setAdmin(null);
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function setViewAsUser(next: boolean) {
    setViewAsUserState(next);
    try {
      localStorage.setItem(STORAGE_KEY_VIEW_AS_USER, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function toggleMinimized(next: boolean) {
    setMinimized(next);
    try {
      localStorage.setItem(STORAGE_KEY_BAR_MINIMIZED, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  const canEdit = (resource: FrontendEditResource) => {
    if (!admin || viewAsUser) return false;
    return canEditFrontendResource(admin.role, resource);
  };

  const showToolbar = !isAdminRoute && admin !== null;
  const quickLinks = admin ? getFrontendQuickLinks(admin.role) : [];

  return (
    <FrontendAdminContext.Provider value={{ admin, viewAsUser, setViewAsUser, canEdit }}>
      {showToolbar && !viewAsUser && !minimized && (
        <div className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/95 text-xs text-white shadow-md backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/40">
                🛡️ {admin.roleLabel}
              </span>
              <span className="hidden font-medium text-slate-300 sm:inline">
                {admin.name}
              </span>
              <button
                type="button"
                onClick={() => setViewAsUser(true)}
                className="cursor-pointer rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-slate-950 transition hover:bg-amber-400"
                title="Tạm ẩn tất cả nút sửa để xem giao diện giống khách hàng"
              >
                👁️ Đang bật nút Sửa · Chuyển sang Xem như User
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="hidden flex-wrap items-center gap-1 lg:flex">
                {quickLinks.slice(0, 6).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <Link
                href="/admin/"
                className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-brand-dark"
              >
                ⚙️ Vào Admin
              </Link>
              <button
                type="button"
                onClick={() => toggleMinimized(true)}
                className="cursor-pointer rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white"
                title="Thu gọn thanh công cụ xuống góc dưới"
              >
                Thu gọn
              </button>
            </div>
          </div>
        </div>
      )}

      {showToolbar && (viewAsUser || minimized) && (
        <div className="fixed bottom-20 left-3 z-50 flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/95 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur md:bottom-4">
          {viewAsUser ? (
            <button
              type="button"
              onClick={() => {
                setViewAsUser(false);
                toggleMinimized(false);
              }}
              className="flex cursor-pointer items-center gap-1.5 font-bold text-emerald-300 hover:text-emerald-200"
            >
              <span>👤 Đang xem như User</span>
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white">
                Bật lại Quản trị
              </span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => toggleMinimized(false)}
                className="cursor-pointer font-bold text-emerald-300 hover:text-emerald-200"
              >
                🛡️ {admin.roleLabel}
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => setViewAsUser(true)}
                className="cursor-pointer text-[11px] text-amber-300 hover:text-amber-200"
              >
                Xem như User
              </button>
              <span className="text-slate-600">|</span>
              <Link href="/admin/" className="text-[11px] font-semibold text-white hover:underline">
                Admin
              </Link>
            </>
          )}
        </div>
      )}

      {children}
    </FrontendAdminContext.Provider>
  );
}
