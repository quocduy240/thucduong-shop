"use client";

import Link from "next/link";
import { useState } from "react";

export type NavMenuItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; featured?: boolean }[];
};

export default function MobileNavDrawer({
  menu,
  siteName,
  hotline,
}: {
  menu: NavMenuItem[];
  siteName: string;
  hotline: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>("Sản phẩm");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mở menu danh mục"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-700 hover:border-brand hover:text-brand md:hidden"
      >
        ☰
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs md:hidden"
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-[82%] max-w-xs flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b bg-brand px-4 py-3.5 text-white">
              <div>
                <div className="text-base font-bold">{siteName}</div>
                <div className="text-[11px] text-emerald-100">Danh mục &amp; Tiện ích</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng menu"
                className="rounded-lg bg-white/15 px-2.5 py-1 text-sm font-bold text-white"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2">
              {menu.map((m) => {
                const hasChildren = Boolean(m.children?.length);
                const isOpen = expanded === m.label;
                return (
                  <div key={m.label} className="py-1">
                    <div className="flex items-center justify-between">
                      <Link
                        href={m.href}
                        onClick={() => setOpen(false)}
                        className="flex-1 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 hover:bg-green-50 hover:text-brand"
                      >
                        {m.label}
                      </Link>
                      {hasChildren && (
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : m.label)}
                          aria-label={`Mở rộng ${m.label}`}
                          className="rounded-lg px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100"
                        >
                          {isOpen ? "▲" : "▼"}
                        </button>
                      )}
                    </div>

                    {hasChildren && isOpen && (
                      <ul className="ml-3 mt-1 space-y-1 border-l-2 border-emerald-200 pl-2.5 pb-1">
                        {m.children!.map((c) => (
                          <li key={c.href}>
                            <Link
                              href={c.href}
                              onClick={() => setOpen(false)}
                              className={
                                c.featured
                                  ? "flex items-center justify-between rounded-lg bg-gradient-to-r from-emerald-50 to-amber-50 px-3 py-2 text-xs font-bold text-brand"
                                  : "block rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-green-50 hover:text-brand"
                              }
                            >
                              <span>{c.label}</span>
                              {c.featured && (
                                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white">
                                  HOT
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="border-t bg-gray-50 p-3 text-xs">
              <a
                href={`tel:${hotline.split("-")[0]?.replace(/[^\d]/g, "") || ""}`}
                className="block w-full rounded-xl bg-brand py-2.5 text-center font-bold text-white"
              >
                📞 Hotline: {hotline.split("-")[0]?.trim()}
              </a>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
