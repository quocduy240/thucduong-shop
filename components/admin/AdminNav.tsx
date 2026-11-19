"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { canAccessAdminPath, type AdminRole } from "@/lib/rbac";

type NavItem = { href: string; label: string; icon: string };
type NavGroup = {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    id: "sales",
    label: "Bán hàng & Khách hàng",
    icon: "🛍️",
    items: [
      { href: "/admin/orders/", label: "Đơn hàng", icon: "🧾" },
      { href: "/admin/products/", label: "Sản phẩm", icon: "🛍️" },
      { href: "/admin/flash-sale/", label: "Giờ vàng săn sale", icon: "⚡" },
      { href: "/admin/crm/", label: "CRM Chăm sóc", icon: "💎" },
      { href: "/admin/loyalty/", label: "Tích điểm & Quà", icon: "🎁" },
      { href: "/admin/members/", label: "Thành viên & Email", icon: "👥" },
    ],
  },
  {
    id: "ai",
    label: "Tư vấn & Trợ lý AI",
    icon: "🩺",
    items: [
      { href: "/admin/quick-consult/", label: "Tư vấn nhanh AI", icon: "🌿" },
      { href: "/admin/lab-analysis/", label: "Xét nghiệm AI", icon: "🧪" },
    ],
  },
  {
    id: "content",
    label: "Nội dung & Media",
    icon: "📝",
    items: [
      { href: "/admin/posts/", label: "Bài viết", icon: "📝" },
      { href: "/admin/videos/", label: "Video bài giảng", icon: "🎬" },
      { href: "/admin/documents/", label: "Tài liệu & Sách", icon: "📚" },
      { href: "/admin/blocks/", label: "Block thường dùng", icon: "🧩" },
      { href: "/admin/social-links/", label: "Liên kết MXH & Sàn", icon: "🌐" },
      { href: "/admin/qr/", label: "QR Code Động", icon: "📱" },
      { href: "/admin/comments/", label: "Bình luận", icon: "💬" },
      { href: "/admin/pages/", label: "Trang tĩnh", icon: "📄" },
      { href: "/admin/categories/", label: "Danh mục", icon: "🗂️" },
    ],
  },
  {
    id: "system",
    label: "Hệ thống & SEO",
    icon: "⚙️",
    items: [
      { href: "/admin/sitemaps/", label: "Sitemaps SEO", icon: "🗺️" },
      { href: "/admin/themes/", label: "Giao diện & Cỡ chữ", icon: "🎨" },
      { href: "/admin/settings/", label: "Cài đặt", icon: "⚙️" },
    ],
  },
];

const FLAT_ITEMS: NavItem[] = [
  { href: "/admin/", label: "Tổng quan", icon: "📊" },
  ...GROUPS.flatMap((g) => g.items),
];

const STORAGE_KEY = "td_admin_nav_groups";

export default function AdminNav({
  newOrders,
  crmFollowupsDue = 0,
  role = "admin",
}: {
  newOrders: number;
  crmFollowupsDue?: number;
  role?: AdminRole;
}) {
  const path = usePathname().replace(/\/?$/, "/");
  const visibleFlatItems = FLAT_ITEMS.filter((it) => canAccessAdminPath(role, it.href));
  const visibleGroups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => canAccessAdminPath(role, it.href)),
  })).filter((g) => g.items.length > 0);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({
    sales: true,
    ai: true,
    content: false,
    system: false,
  });

  // Restore saved state & ensure the group containing the active route is expanded
  useEffect(() => {
    let next: Record<string, boolean> = {
      sales: true,
      ai: true,
      content: false,
      system: false,
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
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap ${active ? "bg-brand text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
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

      {/* Desktop: grouped collapsible accordion sidebar */}
      <nav className="hidden md:flex md:flex-col md:gap-2">
        <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          <span>Menu quản trị</span>
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

        {/* Overview shortcut */}
        <Link
          href="/admin/"
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${path === "/admin/" ? "bg-brand text-white shadow-2xs" : "text-gray-800 hover:bg-gray-100"
            }`}
        >
          <span>📊</span>
          <span>Tổng quan</span>
        </Link>

        {/* Functional Collapsible Groups */}
        {visibleGroups.map((g) => {
          const isOpen = Boolean(openMap[g.id]);
          const groupBadge =
            g.id === "sales" && !isOpen ? newOrders + crmFollowupsDue : 0;

          return (
            <div key={g.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-1">
              <button
                type="button"
                onClick={() => toggleGroup(g.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-extrabold text-gray-700 transition hover:bg-white"
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
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition ${active
                          ? "bg-brand text-white shadow-2xs"
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
