"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

export type LiveEditorTarget = {
  resource: FrontendEditResource;
  href: string;
  label?: string;
};

type FrontendAdminContextValue = {
  admin: FrontendAdminInfo | null;
  viewAsUser: boolean;
  setViewAsUser: (next: boolean) => void;
  canEdit: (resource: FrontendEditResource) => boolean;
  openLiveEditor: (target: LiveEditorTarget) => void;
};

const FrontendAdminContext = createContext<FrontendAdminContextValue>({
  admin: null,
  viewAsUser: false,
  setViewAsUser: () => {},
  canEdit: () => false,
  openLiveEditor: () => {},
});

const STORAGE_KEY_VIEW_AS_USER = "td_admin_view_as_user";
const STORAGE_KEY_BAR_MINIMIZED = "td_admin_bar_minimized";
const STORAGE_KEY_DRAWER_WIDTH = "td_live_drawer_width_level";

export function useFrontendAdmin() {
  return useContext(FrontendAdminContext);
}

export default function FrontendAdminProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const isAdminRoute = pathname.startsWith("/admin");

  const [admin, setAdmin] = useState<FrontendAdminInfo | null>(null);
  const [viewAsUser, setViewAsUserState] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Live Slide-Over Editor State:
  // drawerState: 'closed' | 'open' | 'minimized' (collapsed to right edge without losing form state)
  // widthLevel: 1 (Compact 540px) | 2 (Expanded Wide 82vw to the left)
  const [activeTarget, setActiveTarget] = useState<LiveEditorTarget | null>(null);
  const [drawerState, setDrawerState] = useState<"closed" | "open" | "minimized">("closed");
  const [widthLevel, setWidthLevel] = useState<1 | 2>(1);
  const [editorTab, setEditorTab] = useState<"quick" | "studio">("quick");

  // Quick Inspector state
  const [loadingData, setLoadingData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [payloadKind, setPayloadKind] = useState<string>("");

  // Editable states by kind
  const [prodForm, setProdForm] = useState<Record<string, unknown>>({});
  const [prodCats, setProdCats] = useState<{ id: number; name: string; is_active: number }[]>([]);
  const [postForm, setPostForm] = useState<Record<string, unknown>>({});
  const [postCats, setPostCats] = useState<{ id: number; name: string; section_slug: string }[]>([]);
  const [pinPostToTop, setPinPostToTop] = useState(false);
  const [catList, setCatList] = useState<Record<string, unknown>[]>([]);
  const [blocksList, setBlocksList] = useState<Record<string, unknown>[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<number>(0);
  const [siteForm, setSiteForm] = useState<Record<string, string>>({});
  const [widgetForm, setWidgetForm] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      setViewAsUserState(localStorage.getItem(STORAGE_KEY_VIEW_AS_USER) === "1");
      setMinimized(localStorage.getItem(STORAGE_KEY_BAR_MINIMIZED) === "1");
      const savedW = localStorage.getItem(STORAGE_KEY_DRAWER_WIDTH);
      if (savedW === "2") setWidthLevel(2);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isAdminRoute) return;
    let cancelled = false;

    const CACHE_KEY = "td_frontend_admin_ctx_v1";
    const CACHE_TTL_MS = 180_000;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { ts: number; isAdmin: boolean; admin?: FrontendAdminInfo };
        if (Date.now() - cached.ts < CACHE_TTL_MS) {
          setAdmin(cached.isAdmin && cached.admin ? cached.admin : null);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    fetch("/api/admin/frontend-context", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const nextAdmin = data.isAdmin && data.admin ? (data.admin as FrontendAdminInfo) : null;
        setAdmin(nextAdmin);
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ts: Date.now(), isAdmin: Boolean(nextAdmin), admin: nextAdmin }),
          );
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [isAdminRoute]);

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

  function changeWidthLevel(level: 1 | 2) {
    setWidthLevel(level);
    try {
      localStorage.setItem(STORAGE_KEY_DRAWER_WIDTH, String(level));
    } catch {
      /* ignore */
    }
  }

  async function openLiveEditor(target: LiveEditorTarget) {
    setActiveTarget(target);
    setDrawerState("open");
    setSaveMsg("");
    setSaveErr("");
    setPinPostToTop(false);
    setLoadingData(true);

    try {
      const res = await fetch(
        `/api/admin/frontend-live-edit/?target=${encodeURIComponent(target.href)}&resource=${encodeURIComponent(target.resource)}`,
        { credentials: "same-origin" },
      );
      const data = await res.json();
      if (!res.ok) {
        setSaveErr(data.error || "Không tải được dữ liệu chỉnh sửa nhanh.");
        setEditorTab("studio");
      } else {
        setPayloadKind(data.kind || "");
        if (data.kind === "product") {
          setProdForm(data.product || {});
          setProdCats(data.categories || []);
          setEditorTab("quick");
        } else if (data.kind === "post") {
          setPostForm(data.post || {});
          setPostCats(data.postCategories || []);
          setEditorTab("quick");
        } else if (data.kind === "categories") {
          setCatList(data.categories || []);
          setEditorTab("quick");
        } else if (data.kind === "blocks") {
          const list = (data.blocks || []) as Record<string, unknown>[];
          setBlocksList(list);
          setSelectedBlockId(Number(data.selectedId) || Number(list[0]?.id) || 0);
          setEditorTab("quick");
        } else if (data.kind === "site_settings") {
          setSiteForm(data.site || {});
          setWidgetForm(data.widget || {});
          setEditorTab("quick");
        } else {
          setEditorTab("studio");
        }
      }
    } catch {
      setEditorTab("studio");
    } finally {
      setLoadingData(false);
    }
  }

  async function handleQuickSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingData(true);
    setSaveMsg("");
    setSaveErr("");

    try {
      let bodyPayload: Record<string, unknown> = { kind: payloadKind };
      if (payloadKind === "product") {
        bodyPayload = { kind: "product", ...prodForm };
      } else if (payloadKind === "post") {
        bodyPayload = { kind: "post", ...postForm, pin_to_top: pinPostToTop };
      } else if (payloadKind === "categories") {
        bodyPayload = { kind: "categories", categories: catList };
      } else if (payloadKind === "blocks") {
        const currentBlk = blocksList.find((b) => Number(b.id) === selectedBlockId);
        if (!currentBlk) throw new Error("Chưa chọn Block cần lưu.");
        bodyPayload = { kind: "block_save", ...currentBlk };
      } else if (payloadKind === "site_settings") {
        bodyPayload = { kind: "site_settings", site: siteForm, widget: widgetForm };
      }

      const res = await fetch("/api/admin/frontend-live-edit/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu thất bại.");

      setSaveMsg(data.message || "✓ Đã lưu & cập nhật trực tiếp trên trang!");
      router.refresh();
    } catch (err) {
      setSaveErr((err as Error).message);
    } finally {
      setSavingData(false);
    }
  }

  function moveCategoryRow(index: number, delta: -1 | 1) {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= catList.length) return;
    const copy = [...catList];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setCatList(copy.map((c, idx) => ({ ...c, sort: idx + 1 })));
  }

  const canEdit = (resource: FrontendEditResource) => {
    if (!admin || viewAsUser) return false;
    return canEditFrontendResource(admin.role, resource);
  };

  const showToolbar = !isAdminRoute && admin !== null;
  const quickLinks = admin ? getFrontendQuickLinks(admin.role) : [];
  const embedUrl = activeTarget
    ? activeTarget.href.includes("?")
      ? `${activeTarget.href}&embed=1`
      : `${activeTarget.href}?embed=1`
    : "/admin/?embed=1";

  const selectedBlock = blocksList.find((b) => Number(b.id) === selectedBlockId);

  return (
    <FrontendAdminContext.Provider value={{ admin, viewAsUser, setViewAsUser, canEdit, openLiveEditor }}>
      {showToolbar && !viewAsUser && !minimized && (
        <div className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/95 text-xs text-white shadow-md backdrop-blur print:hidden">
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
              <button
                type="button"
                onClick={() =>
                  openLiveEditor({
                    resource: "category",
                    href: "/admin/categories/",
                    label: "Sắp xếp Menu & Nhóm hàng",
                  })
                }
                className="cursor-pointer rounded-full border border-emerald-400/50 bg-emerald-950/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-800"
              >
                🗂️ Sắp xếp Menu &amp; Nhóm hàng
              </button>
              <button
                type="button"
                onClick={() =>
                  openLiveEditor({
                    resource: "block",
                    href: "/admin/blocks/",
                    label: "Quản lý Vùng Block Trang chủ",
                  })
                }
                className="cursor-pointer rounded-full border border-amber-400/50 bg-amber-950/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-200 hover:bg-amber-800"
              >
                🧩 Vị trí Block &amp; Module
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="hidden flex-wrap items-center gap-1 lg:flex">
                {quickLinks.slice(0, 5).map((item) => (
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
        <div className="fixed bottom-20 left-3 z-50 flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/95 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur md:bottom-4 print:hidden">
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

      {/* =================================================================== */}
      {/* FRONTEND LIVE EDITOR SLIDE-OVER DRAWER (2 WIDTH LEVELS + MINIMIZE)  */}
      {/* =================================================================== */}
      {!isAdminRoute && admin && activeTarget && drawerState === "minimized" && (
        <button
          type="button"
          onClick={() => setDrawerState("open")}
          className="fixed right-0 top-1/2 z-[110] -translate-y-1/2 cursor-pointer rounded-l-2xl border-2 border-r-0 border-amber-300 bg-slate-900 px-3 py-4 text-xs font-extrabold text-white shadow-2xl transition hover:bg-brand"
          title="Bung ngăn kéo chỉnh sửa trực tiếp ra lại (Giữ nguyên dữ liệu đang sửa)"
        >
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-amber-300 text-sm">«</span>
            <span className="[writing-mode:vertical-rl] tracking-wider">
              ✏️ Đang sửa: {activeTarget.label || "Trực tiếp"}
            </span>
          </div>
        </button>
      )}

      {!isAdminRoute && admin && activeTarget && drawerState === "open" && (
        <div className="fixed inset-y-0 right-0 z-[110] flex justify-end pointer-events-none print:hidden">
          <aside
            className={`pointer-events-auto flex h-full flex-col border-l-2 border-brand/40 bg-white shadow-[-12px_0_36px_rgba(0,0,0,0.22)] transition-all duration-200 ${
              widthLevel === 2
                ? "w-screen max-w-[96vw] lg:w-[82vw] lg:max-w-[1120px]"
                : "w-screen max-w-[95vw] sm:w-[540px] sm:max-w-[540px]"
            }`}
          >
            {/* Top Drawer Header with 2-Level Left Expansion & Right Minimize */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gradient-to-r from-slate-900 via-brand-dark to-brand px-4 py-3 text-white">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-950">
                    LIVE EDIT
                  </span>
                  <h2 className="truncate text-sm font-extrabold">
                    {activeTarget.label || "Chỉnh sửa trực tiếp ngoài trang"}
                  </h2>
                </div>
                <p className="truncate text-[11px] text-emerald-100">
                  Sửa &amp; lưu ngay trên trang · Tự động ghi Nhật ký Kiểm toán (Log Audit)
                </p>
              </div>

              {/* 2-Level Width Expansion Controls & Minimize to Right */}
              <div className="flex items-center gap-1">
                <div className="inline-flex rounded-lg bg-black/30 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => changeWidthLevel(1)}
                    className={`cursor-pointer rounded-md px-2 py-1 font-bold transition ${
                      widthLevel === 1 ? "bg-white text-slate-900 shadow-2xs" : "text-white/80 hover:text-white"
                    }`}
                    title="Mức 1: Khung gọn 540px bên phải (Vừa sửa vừa nhìn trang web bên trái)"
                  >
                    ‹ Mức 1 (Gọn)
                  </button>
                  <button
                    type="button"
                    onClick={() => changeWidthLevel(2)}
                    className={`cursor-pointer rounded-md px-2 py-1 font-bold transition ${
                      widthLevel === 2 ? "bg-amber-400 text-slate-950 shadow-2xs" : "text-white/80 hover:text-white"
                    }`}
                    title="Mức 2: Kéo giãn rộng 82% màn hình sang bên trái để soạn thảo chi tiết"
                  >
                    « Mức 2 (Rộng)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerState("minimized")}
                  className="cursor-pointer rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/25"
                  title="Ẩn thu gọn vào mép phải màn hình (Không mất nội dung đang gõ)"
                >
                  Ẩn sang phải »
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerState("closed")}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg bg-white/15 text-xs font-bold text-white hover:bg-red-600"
                  title="Đóng khung chỉnh sửa"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Sub-header Mode Switcher: Quick Inspector vs Full Embedded Studio */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gray-50 px-4 py-2 text-xs">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditorTab("quick")}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 font-extrabold transition ${
                    editorTab === "quick"
                      ? "bg-brand text-white shadow-2xs"
                      : "border bg-white text-gray-700 hover:border-brand"
                  }`}
                >
                  ⚡ Sửa nhanh &amp; Vị trí hiển thị
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditorTab("studio");
                    if (widthLevel === 1) changeWidthLevel(2);
                  }}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 font-extrabold transition ${
                    editorTab === "studio"
                      ? "bg-brand text-white shadow-2xs"
                      : "border bg-white text-gray-700 hover:border-brand"
                  }`}
                >
                  🛠️ Mở toàn bộ công cụ (Soạn thảo / AI / Ảnh)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="cursor-pointer rounded-lg border bg-white px-2.5 py-1 text-[11px] font-bold text-brand hover:bg-emerald-50"
                  title="Làm mới trang web bên trái để xem thay đổi vừa lưu"
                >
                  🔄 Làm mới trang
                </button>
                <Link
                  href={activeTarget.href}
                  className="rounded-lg border bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:text-brand"
                >
                  ↗ Mở trang Admin
                </Link>
              </div>
            </div>

            {/* Drawer Body */}
            {editorTab === "studio" ? (
              <div className="relative flex-1 bg-gray-100">
                <iframe
                  key={embedUrl}
                  src={embedUrl}
                  title="Trình chỉnh sửa chuyên sâu"
                  className="h-full w-full border-0"
                />
              </div>
            ) : (
              <form onSubmit={handleQuickSave} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
                  {saveMsg && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 font-bold text-emerald-900">
                      {saveMsg}
                    </div>
                  )}
                  {saveErr && (
                    <div className="rounded-xl border border-red-300 bg-red-50 p-3 font-bold text-red-700">
                      ⚠️ {saveErr}
                    </div>
                  )}

                  {loadingData ? (
                    <div className="py-12 text-center text-gray-500">
                      ⏳ Đang tải thông tin đối tượng để sửa nhanh...
                    </div>
                  ) : payloadKind === "product" ? (
                    /* 1. PRODUCT QUICK INSPECTOR */
                    <div className="space-y-3.5">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                        <div className="text-[11px] font-bold uppercase text-brand">
                          📦 Sửa nhanh Sản phẩm #{String(prodForm.id || "")}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-green-300 bg-white px-3 py-1 font-bold text-green-900">
                            <input
                              type="checkbox"
                              checked={Boolean(prodForm.is_published)}
                              onChange={(e) => setProdForm({ ...prodForm, is_published: e.target.checked ? 1 : 0 })}
                              className="accent-brand"
                            />
                            <span>🌐 Công khai Web</span>
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1 font-bold text-amber-900">
                            <input
                              type="checkbox"
                              checked={Boolean(prodForm.featured)}
                              onChange={(e) => setProdForm({ ...prodForm, featured: e.target.checked ? 1 : 0 })}
                              className="accent-brand"
                            />
                            <span>⭐ Ghim Nổi bật</span>
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-purple-300 bg-white px-3 py-1 font-bold text-purple-900">
                            <input
                              type="checkbox"
                              checked={Boolean(prodForm.contact_only)}
                              onChange={(e) => setProdForm({ ...prodForm, contact_only: e.target.checked ? 1 : 0 })}
                              className="accent-purple-700"
                            />
                            <span>📞 Hiện &quot;Liên hệ&quot;</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bold text-gray-700">Tên sản phẩm *</label>
                        <input
                          required
                          value={String(prodForm.name || "")}
                          onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                          className="w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none focus:border-brand"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">Nhóm hàng (Danh mục) *</label>
                          <select
                            value={Number(prodForm.category_id || 0)}
                            onChange={(e) => setProdForm({ ...prodForm, category_id: Number(e.target.value) })}
                            className="w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:border-brand"
                          >
                            {prodCats.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} {c.is_active === 0 ? "[Ẩn Web]" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">Mã hàng (SKU)</label>
                          <input
                            value={String(prodForm.sku || "")}
                            onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                            className="w-full rounded-xl border px-3 py-2 font-mono outline-none focus:border-brand"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">Giá bán gốc (VNĐ)</label>
                          <input
                            type="number"
                            min={0}
                            value={Number(prodForm.price ?? 0)}
                            onChange={(e) => setProdForm({ ...prodForm, price: Number(e.target.value) })}
                            className="w-full rounded-xl border border-amber-300 px-3 py-2 font-extrabold outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">Giá KM (VNĐ)</label>
                          <input
                            type="number"
                            min={0}
                            value={prodForm.sale_price !== null && prodForm.sale_price !== undefined ? Number(prodForm.sale_price) : ""}
                            onChange={(e) =>
                              setProdForm({
                                ...prodForm,
                                sale_price: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            placeholder="Không giảm"
                            className="w-full rounded-xl border px-3 py-2 font-bold text-accent outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">Giá vốn (VNĐ)</label>
                          <input
                            type="number"
                            min={0}
                            value={Number(prodForm.cost_price ?? 0)}
                            onChange={(e) => setProdForm({ ...prodForm, cost_price: Number(e.target.value) })}
                            className="w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">Tồn kho thực tế</label>
                          <input
                            type="number"
                            min={0}
                            value={Number(prodForm.stock ?? 0)}
                            onChange={(e) => setProdForm({ ...prodForm, stock: Number(e.target.value) })}
                            className="w-full rounded-xl border border-emerald-300 px-3 py-2 font-extrabold text-brand outline-none focus:border-brand"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bold text-gray-700">Mô tả ngắn / Tóm tắt</label>
                        <textarea
                          rows={3}
                          value={String(prodForm.summary || "")}
                          onChange={(e) => setProdForm({ ...prodForm, summary: e.target.value })}
                          className="w-full rounded-xl border px-3 py-2 outline-none focus:border-brand"
                        />
                      </div>
                    </div>
                  ) : payloadKind === "post" ? (
                    /* 2. POST QUICK INSPECTOR & PIN POSITIONING */
                    <div className="space-y-3.5">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 flex items-center justify-between">
                        <span className="font-bold text-brand">📝 Sửa nhanh Bài viết &amp; Vị trí hiển thị</span>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-400 bg-amber-50 px-3 py-1 font-extrabold text-amber-900">
                          <input
                            type="checkbox"
                            checked={pinPostToTop}
                            onChange={(e) => setPinPostToTop(e.target.checked)}
                            className="accent-amber-600"
                          />
                          <span>📌 Đẩy bài viết này lên vị trí đầu trang</span>
                        </label>
                      </div>

                      <div>
                        <label className="mb-1 block font-bold text-gray-700">Tiêu đề bài viết *</label>
                        <input
                          required
                          value={String(postForm.title || "")}
                          onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                          className="w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none focus:border-brand"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block font-bold text-gray-700">Chuyên mục bài viết</label>
                        <select
                          value={Number(postForm.category_id || 0)}
                          onChange={(e) => setPostForm({ ...postForm, category_id: Number(e.target.value) })}
                          className="w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:border-brand"
                        >
                          {postCats.map((c) => (
                            <option key={c.id} value={c.id}>
                              [{c.section_slug}] {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block font-bold text-gray-700">Đoạn trích / Tóm tắt</label>
                        <textarea
                          rows={4}
                          value={String(postForm.excerpt || "")}
                          onChange={(e) => setPostForm({ ...postForm, excerpt: e.target.value })}
                          className="w-full rounded-xl border px-3 py-2 outline-none focus:border-brand"
                        />
                      </div>
                    </div>
                  ) : payloadKind === "categories" ? (
                    /* 3. CATEGORIES & MENU/HOME/FOOTER MODULE ORDERING */
                    <div className="space-y-3">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                        <div className="font-extrabold text-brand">
                          🗂️ Sắp xếp Thứ tự Nhóm hàng &amp; Bật/Tắt Vị trí hiển thị (Menu · Trang chủ · Footer)
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-600">
                          Bấm nút ▲ / ▼ để đổi vị trí xuất hiện trên Menu và Trang chủ, hoặc tích chọn vùng hiển thị rồi bấm Lưu.
                        </p>
                      </div>

                      <div className="divide-y rounded-xl border bg-white">
                        {catList.map((cat, idx) => (
                          <div key={String(cat.id)} className="flex flex-wrap items-center justify-between gap-2 p-2.5">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => moveCategoryRow(idx, -1)}
                                  disabled={idx === 0}
                                  className="rounded border px-1.5 py-0.5 text-[10px] font-bold hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveCategoryRow(idx, 1)}
                                  disabled={idx === catList.length - 1}
                                  className="rounded border px-1.5 py-0.5 text-[10px] font-bold hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                                >
                                  ▼
                                </button>
                              </div>
                              <input
                                value={String(cat.name || "")}
                                onChange={(e) => {
                                  const next = [...catList];
                                  next[idx] = { ...cat, name: e.target.value };
                                  setCatList(next);
                                }}
                                className="min-w-0 flex-1 rounded-lg border px-2.5 py-1 text-xs font-bold"
                              />
                              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                                {Number(cat.prod_count || 0)} SP
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(cat.is_active)}
                                  onChange={(e) => {
                                    const next = [...catList];
                                    next[idx] = { ...cat, is_active: e.target.checked ? 1 : 0 };
                                    setCatList(next);
                                  }}
                                  className="accent-brand"
                                />
                                <span>Hiện Web</span>
                              </label>
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(cat.show_in_menu)}
                                  onChange={(e) => {
                                    const next = [...catList];
                                    next[idx] = { ...cat, show_in_menu: e.target.checked ? 1 : 0 };
                                    setCatList(next);
                                  }}
                                  className="accent-brand"
                                />
                                <span>Menu</span>
                              </label>
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(cat.show_in_home)}
                                  onChange={(e) => {
                                    const next = [...catList];
                                    next[idx] = { ...cat, show_in_home: e.target.checked ? 1 : 0 };
                                    setCatList(next);
                                  }}
                                  className="accent-brand"
                                />
                                <span>Trang chủ</span>
                              </label>
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(cat.show_in_footer)}
                                  onChange={(e) => {
                                    const next = [...catList];
                                    next[idx] = { ...cat, show_in_footer: e.target.checked ? 1 : 0 };
                                    setCatList(next);
                                  }}
                                  className="accent-brand"
                                />
                                <span>Footer</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : payloadKind === "blocks" ? (
                    /* 4. BLOCK ZONE & MODULE POSITIONING INSPECTOR */
                    <div className="space-y-3.5">
                      <div>
                        <label className="mb-1 block font-bold text-gray-700">Chọn Vùng Block / Module cần sửa</label>
                        <select
                          value={selectedBlockId}
                          onChange={(e) => setSelectedBlockId(Number(e.target.value))}
                          className="w-full rounded-xl border px-3 py-2 font-bold outline-none focus:border-brand"
                        >
                          {blocksList.map((b) => (
                            <option key={String(b.id)} value={Number(b.id)}>
                              [{String(b.zone)}] {String(b.title)} {b.is_active ? "(Đang bật)" : "(Đang tắt)"}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedBlock && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block font-bold text-gray-700">Tiêu đề Block</label>
                              <input
                                value={String(selectedBlock.title || "")}
                                onChange={(e) =>
                                  setBlocksList((prev) =>
                                    prev.map((b) =>
                                      Number(b.id) === selectedBlockId ? { ...b, title: e.target.value } : b,
                                    ),
                                  )
                                }
                                className="w-full rounded-xl border px-3 py-2 font-bold"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block font-bold text-gray-700">Vị trí Vùng hiển thị (Zone)</label>
                              <input
                                value={String(selectedBlock.zone || "")}
                                onChange={(e) =>
                                  setBlocksList((prev) =>
                                    prev.map((b) =>
                                      Number(b.id) === selectedBlockId ? { ...b, zone: e.target.value } : b,
                                    ),
                                  )
                                }
                                className="w-full rounded-xl border px-3 py-2 font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between rounded-xl border bg-gray-50 p-3">
                            <label className="inline-flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(selectedBlock.is_active)}
                                onChange={(e) =>
                                  setBlocksList((prev) =>
                                    prev.map((b) =>
                                      Number(b.id) === selectedBlockId
                                        ? { ...b, is_active: e.target.checked ? 1 : 0 }
                                        : b,
                                    ),
                                  )
                                }
                                className="accent-brand"
                              />
                              <span>🟢 Kích hoạt hiển thị Block này trên trang</span>
                            </label>
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-600">Thứ tự:</span>
                              <input
                                type="number"
                                value={Number(selectedBlock.sort_order ?? 0)}
                                onChange={(e) =>
                                  setBlocksList((prev) =>
                                    prev.map((b) =>
                                      Number(b.id) === selectedBlockId
                                        ? { ...b, sort_order: Number(e.target.value) }
                                        : b,
                                    ),
                                  )
                                }
                                className="w-16 rounded border bg-white px-2 py-1 text-center font-bold"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block font-bold text-gray-700">Nội dung HTML / Văn bản của Block</label>
                            <textarea
                              rows={8}
                              value={String(selectedBlock.html || "")}
                              onChange={(e) =>
                                setBlocksList((prev) =>
                                  prev.map((b) =>
                                    Number(b.id) === selectedBlockId ? { ...b, html: e.target.value } : b,
                                  ),
                                )
                              }
                              className="w-full rounded-xl border p-3 font-mono text-xs outline-none focus:border-brand"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : payloadKind === "site_settings" ? (
                    /* 5. STOREFRONT SETTINGS & DUAL HOTLINE QUICK INSPECTOR */
                    <div className="space-y-3.5">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 font-bold text-brand">
                        ⚙️ Sửa nhanh Thông tin Cửa hàng, 2 Số Hotline &amp; Thanh Tư vấn nổi
                      </div>
                      <div>
                        <label className="mb-1 block font-bold text-gray-700">Tên cửa hàng</label>
                        <input
                          value={siteForm.name || ""}
                          onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                          className="w-full rounded-xl border px-3 py-2 font-bold"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-bold text-gray-700">
                          Hotline hiển thị (2 số cùng lúc, cách nhau bởi dấu &quot;-&quot;)
                        </label>
                        <input
                          value={siteForm.hotline || ""}
                          onChange={(e) => setSiteForm({ ...siteForm, hotline: e.target.value })}
                          placeholder="0767.518.592 - 0858.816.070"
                          className="w-full rounded-xl border border-amber-300 px-3 py-2 font-extrabold text-accent"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">Hotline 1 (Widget Nổi)</label>
                          <input
                            value={widgetForm.widget_hotline || ""}
                            onChange={(e) => setWidgetForm({ ...widgetForm, widget_hotline: e.target.value })}
                            className="w-full rounded-xl border px-3 py-2 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">Hotline 2 (Widget Nổi)</label>
                          <input
                            value={widgetForm.widget_hotline_2 || ""}
                            onChange={(e) => setWidgetForm({ ...widgetForm, widget_hotline_2: e.target.value })}
                            className="w-full rounded-xl border px-3 py-2 font-semibold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block font-bold text-gray-700">Địa chỉ cửa hàng (Footer)</label>
                        <input
                          value={siteForm.address || ""}
                          onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                          className="w-full rounded-xl border px-3 py-2"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      Bấm sang tab <strong>&ldquo;🛠️ Mở toàn bộ công cụ&rdquo;</strong> ở trên để chỉnh sửa chi tiết mục này ngay trong ngăn kéo.
                    </div>
                  )}
                </div>

                {/* Sticky Footer Save Action */}
                <div className="flex items-center justify-between gap-2 border-t bg-gray-50 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setDrawerState("minimized")}
                    className="cursor-pointer rounded-xl border bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Tạm ẩn sang phải »
                  </button>
                  <button
                    type="submit"
                    disabled={savingData || loadingData}
                    className="cursor-pointer rounded-xl bg-brand px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-brand-dark disabled:opacity-50"
                  >
                    {savingData ? "⏳ Đang lưu & cập nhật..." : "💾 Lưu & Cập nhật trang ngay"}
                  </button>
                </div>
              </form>
            )}
          </aside>
        </div>
      )}

      {children}
    </FrontendAdminContext.Provider>
  );
}
