"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { canAccessAdminPath, type AdminRole } from "@/lib/rbac";

type NavItem = { href: string; label: string; icon: string; keywords?: string; priority?: "high" | "normal" };
type NavGroup = {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    id: "sales",
    label: "1. Bán hàng & Kho quỹ",
    icon: "🔥",
    items: [
      { href: "/admin/pos/", label: "Bán hàng tại quầy (POS)", icon: "🛒", keywords: "pos ban hang tai quay ma vach f2 f9", priority: "high" },
      { href: "/admin/orders/", label: "Đơn hàng & Hóa đơn A5", icon: "🧾", keywords: "don hang hoa don a5 van don tra hang", priority: "high" },
      { href: "/admin/products/", label: "Hàng hóa & Bảng giá", icon: "📦", keywords: "san pham hang hoa bang gia pricebook", priority: "high" },
      { href: "/admin/inventory/", label: "Kho, Sổ quỹ 3 Quỹ & Chốt ca", icon: "📒", keywords: "kho so quy thu chi cong no ncc bao cao cuoi ngay eod fefo", priority: "high" },
    ],
  },
  {
    id: "customers",
    label: "2. Khách hàng & Khuyến mãi",
    icon: "💎",
    items: [
      { href: "/admin/crm/", label: "CRM Chăm sóc & Lịch gọi", icon: "💎", keywords: "crm cham soc khach hang lich goi zalo", priority: "high" },
      { href: "/admin/flash-sale/", label: "Giờ vàng Flash Sale", icon: "⚡", keywords: "flash sale gio vang khuyen mai" },
      { href: "/admin/members/", label: "Thành viên & Mã giảm giá", icon: "👥", keywords: "thanh vien voucher coupon email" },
      { href: "/admin/loyalty/", label: "Tích điểm & Quà VIP", icon: "🎁", keywords: "tich diem doi qua loyalty" },
      { href: "/admin/qr/", label: "QR Code Động", icon: "📱", keywords: "qr code dong bao bi" },
    ],
  },
  {
    id: "ai",
    label: "3. Tư vấn Y khoa AI",
    icon: "🩺",
    items: [
      { href: "/admin/quick-consult/", label: "Tư vấn nhanh AI", icon: "🌿", keywords: "tu van nhanh ai thuc duong" },
      { href: "/admin/lab-analysis/", label: "Phân tích Xét nghiệm AI", icon: "🧪", keywords: "xet nghiem mau nuoc tieu ocr ai" },
    ],
  },
  {
    id: "content",
    label: "4. Nội dung & Giao diện Web",
    icon: "📝",
    items: [
      { href: "/admin/posts/", label: "Bài viết & Kiến thức", icon: "📝", keywords: "bai viet tin tuc kien thuc" },
      { href: "/admin/categories/", label: "Danh mục & Thứ tự Menu", icon: "🗂️", keywords: "danh muc nhom hang menu" },
      { href: "/admin/blocks/", label: "Block Giao diện & Trang chủ", icon: "🧩", keywords: "block vung giao dien trang chu" },
      { href: "/admin/documents/", label: "Tài liệu & Sách", icon: "📚", keywords: "tai lieu sach pdf ebook" },
      { href: "/admin/videos/", label: "Video bài giảng", icon: "🎬", keywords: "video youtube bai giang" },
      { href: "/admin/comments/", label: "Bình luận khách hàng", icon: "💬", keywords: "binh luan danh gia" },
      { href: "/admin/pages/", label: "Trang tĩnh & Chính sách", icon: "📄", keywords: "trang tinh chinh sach gioi thieu" },
      { href: "/admin/social-links/", label: "Liên kết MXH & Sàn", icon: "🌐", keywords: "mang xa hoi shopee lazada tiktok" },
    ],
  },
  {
    id: "system",
    label: "5. Kiểm toán, Đồng bộ & Hệ thống",
    icon: "🛡️",
    items: [
      { href: "/admin/audit-logs/", label: "Nhật ký Kiểm toán (Log Audit)", icon: "🛡️", keywords: "log audit nhat ky thao tac hoan tac doi soat", priority: "high" },
      { href: "/admin/kiotviet/", label: "Đồng bộ KiotViet", icon: "🔗", keywords: "kiotviet excel dong bo" },
      { href: "/admin/themes/", label: "Giao diện & Cỡ chữ", icon: "🎨", keywords: "giao dien mau sac co chu theme" },
      { href: "/admin/sitemaps/", label: "Sitemaps SEO", icon: "🗺️", keywords: "sitemap seo google" },
      { href: "/admin/settings/", label: "Cài đặt & Sao lưu D1", icon: "⚙️", keywords: "cai dat hotline smtp telegram backup sao luu" },
    ],
  },
];

const FLAT_ITEMS: NavItem[] = [
  { href: "/admin/", label: "Tổng quan & Điều phối", icon: "📊", keywords: "tong quan dashboard thong bao" },
  ...GROUPS.flatMap((g) => g.items),
];

const STORAGE_KEY = "td_admin_nav_groups_v2";

export default function AdminNav({
  newOrders,
  crmFollowupsDue = 0,
  role = "admin",
}: {
  newOrders: number;
  crmFollowupsDue?: number;
  role?: AdminRole;
}) {
  const path = (usePathname() || "/admin/").replace(/\/?$/, "/");
  const router = useRouter();
  const [navFilter, setNavFilter] = useState("");
  const [isEmbed, setIsEmbed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const visibleFlatItems = useMemo(
    () => FLAT_ITEMS.filter((it) => canAccessAdminPath(role, it.href)),
    [role],
  );

  const visibleGroups = useMemo(() => {
    const q = navFilter.trim().toLowerCase();
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((it) => {
        if (!canAccessAdminPath(role, it.href)) return false;
        if (!q) return true;
        return (
          it.label.toLowerCase().includes(q) ||
          (it.keywords || "").toLowerCase().includes(q) ||
          it.href.toLowerCase().includes(q)
        );
      }),
    })).filter((g) => g.items.length > 0);
  }, [role, navFilter]);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({
    sales: true,
    customers: true,
    ai: false,
    content: false,
    system: true,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("embed") === "1") {
        setIsEmbed(true);
        // Hide parent <aside> when embedded inside FrontendLiveEditorDrawer
        const parentAside = document.querySelector("aside");
        if (parentAside) parentAside.style.display = "none";
      }
    }
  }, []);

  // Global Ctrl+K / Cmd+K shortcut to focus Command Search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Restore saved state & ensure the group containing the active route is expanded
  useEffect(() => {
    let next: Record<string, boolean> = {
      sales: true,
      customers: true,
      ai: false,
      content: false,
      system: true,
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) next = { ...next, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    for (const g of GROUPS) {
      if (g.items.some((it) => path.startsWith(it.href))) {
        next[g.id] = true;
      }
    }
    setOpenMap(next);
  }, [path]);

  function toggleGroup(id: string) {
    setOpenMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function setAll(val: boolean) {
    const next: Record<string, boolean> = {};
    for (const g of GROUPS) next[g.id] = val;
    setOpenMap(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && navFilter.trim()) {
      const firstMatch = visibleGroups[0]?.items[0];
      if (firstMatch) {
        router.push(firstMatch.href);
        setNavFilter("");
      }
    }
  }

  const renderBadge = (href: string) => {
    if (href === "/admin/orders/" && newOrders > 0) {
      return <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{newOrders}</span>;
    }
    if (href === "/admin/crm/" && crmFollowupsDue > 0) {
      return (
        <span
          className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white"
          title="Khách cần gọi lại hôm nay"
        >
          {crmFollowupsDue}
        </span>
      );
    }
    return null;
  };

  if (isEmbed) return null;

  return (
    <>
      {/* Mobile: compact horizontal scrollable pills */}
      <nav className="flex gap-1 overflow-x-auto pb-1 md:hidden">
        {visibleFlatItems.map((it) => {
          const active = it.href === "/admin/" ? path === "/admin/" : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              prefetch={false}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                active ? "bg-brand text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>{it.icon}</span>
              <span>{it.label}</span>
              {it.href === "/admin/orders/" && newOrders > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{newOrders}</span>
              )}
              {it.href === "/admin/crm/" && crmFollowupsDue > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{crmFollowupsDue}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Desktop: Command Palette Filter + Grouped Priority Accordion Sidebar */}
      <nav className="hidden md:flex md:flex-col md:gap-2">
        {/* Global Command Filter (Ctrl+K) */}
        <div className="relative mb-1">
          <input
            ref={searchInputRef}
            type="search"
            value={navFilter}
            onChange={(e) => setNavFilter(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="🔍 Tìm nhanh mục (Ctrl+K)..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs outline-none transition focus:border-brand focus:bg-white"
          />
        </div>

        <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          <span>Phân tầng ưu tiên</span>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setAll(true)} className="cursor-pointer hover:text-brand" title="Mở tất cả nhóm">
              + Bung
            </button>
            <span>/</span>
            <button type="button" onClick={() => setAll(false)} className="cursor-pointer hover:text-gray-700" title="Thu gọn tất cả nhóm">
              − Gọn
            </button>
          </div>
        </div>

        {/* Overview & Task Routing shortcut */}
        <Link
          href="/admin/"
          prefetch={false}
          className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
            path === "/admin/" ? "bg-brand text-white shadow-2xs" : "text-gray-800 hover:bg-gray-100"
          }`}
        >
          <span className="flex items-center gap-2">
            <span>📊</span>
            <span>Tổng quan &amp; Điều phối</span>
          </span>
          {(newOrders > 0 || crmFollowupsDue > 0) && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {newOrders + crmFollowupsDue}
            </span>
          )}
        </Link>

        {/* Functional Collapsible Groups */}
        {visibleGroups.map((g) => {
          const isOpen = navFilter.trim() ? true : Boolean(openMap[g.id]);
          const groupBadge =
            !isOpen
              ? g.id === "sales"
                ? newOrders
                : g.id === "customers"
                  ? crmFollowupsDue
                  : 0
              : 0;

          return (
            <div key={g.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-1">
              <button
                type="button"
                onClick={() => toggleGroup(g.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-extrabold text-gray-700 transition hover:bg-white"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span>{g.icon}</span>
                  <span className="truncate">{g.label}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {groupBadge > 0 && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {groupBadge}
                    </span>
                  )}
                  <span className="grid h-4 w-4 place-items-center rounded bg-white text-[11px] font-mono text-gray-500 shadow-2xs">
                    {isOpen ? "−" : "+"}
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="mt-1 space-y-0.5 pl-1">
                  {g.items.map((it) => {
                    const active = path.startsWith(it.href);
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        prefetch={false}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition ${
                          active
                            ? "bg-brand text-white shadow-2xs font-bold"
                            : "text-gray-700 hover:bg-white hover:text-brand"
                        }`}
                      >
                        <span className="text-sm">{it.icon}</span>
                        <span className="truncate">{it.label}</span>
                        {renderBadge(it.href)}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );
}
