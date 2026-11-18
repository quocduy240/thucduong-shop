"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBottomBar({ cartCount }: { cartCount: number }) {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;

  const tabs = [
    { href: "/", label: "Trang chủ", icon: "🏠", match: path === "/" },
    { href: "/san-pham/", label: "Sản phẩm", icon: "🛍️", match: path.startsWith("/san-pham") || path.startsWith("/canh-duong-sinh") },
    { href: "/tu-van-nhanh/", label: "Tư vấn AI", icon: "🌿", match: path.startsWith("/tu-van-nhanh") },
    { href: "/thu-vien/bai-giang-thuc-duong/", label: "Video", icon: "🎬", match: path.startsWith("/thu-vien") },
    { href: "/cart", label: "Giỏ hàng", icon: "🛒", match: path.startsWith("/cart"), badge: cartCount },
  ];

  return (
    <nav
      aria-label="Điều hướng nhanh di động"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md md:hidden print:hidden"
    >
      <div className="grid grid-cols-5">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex flex-col items-center justify-center py-2 text-[10px] font-semibold transition ${
              t.match ? "text-brand" : "text-gray-600 hover:text-brand"
            }`}
          >
            <span className="relative text-lg leading-none">
              {t.icon}
              {typeof t.badge === "number" && t.badge > 0 && (
                <span className="absolute -right-2.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                  {t.badge}
                </span>
              )}
            </span>
            <span className="mt-1 truncate">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
