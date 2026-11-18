"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/", label: "Tổng quan", icon: "📊" },
  { href: "/admin/orders/", label: "Đơn hàng", icon: "🧾" },
  { href: "/admin/products/", label: "Sản phẩm", icon: "🛍️" },
  { href: "/admin/flash-sale/", label: "Giờ vàng săn sale", icon: "⚡" },
  { href: "/admin/posts/", label: "Bài viết", icon: "📝" },
  { href: "/admin/blocks/", label: "Block thường dùng", icon: "🧩" },
  { href: "/admin/qr/", label: "QR Code Động", icon: "📱" },
  { href: "/admin/lab-analysis/", label: "Xét nghiệm AI", icon: "🧪" },
  { href: "/admin/videos/", label: "Video bài giảng", icon: "🎬" },
  { href: "/admin/documents/", label: "Tài liệu & Sách", icon: "📚" },
  { href: "/admin/members/", label: "Thành viên & Email", icon: "👥" },
  { href: "/admin/comments/", label: "Bình luận", icon: "💬" },
  { href: "/admin/pages/", label: "Trang tĩnh", icon: "📄" },
  { href: "/admin/categories/", label: "Danh mục", icon: "🗂️" },
  { href: "/admin/settings/", label: "Cài đặt", icon: "⚙️" },
];

export default function AdminNav({ newOrders }: { newOrders: number }) {
  const path = usePathname().replace(/\/?$/, "/");
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {ITEMS.map((it) => {
        const active = it.href === "/admin/" ? path === "/admin/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
              active ? "bg-brand text-white" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span>{it.icon}</span>
            <span>{it.label}</span>
            {it.href === "/admin/orders/" && newOrders > 0 && (
              <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{newOrders}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
