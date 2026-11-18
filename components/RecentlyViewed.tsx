"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { vnd } from "@/lib/site";

const palette = ["#e8f5e9", "#fff3e0", "#e3f2fd", "#fce4ec", "#f3e5f5", "#e0f7fa"];

export type ViewedProductItem = {
  id: number;
  name: string;
  href: string;
  price: number;
  sale_price: number | null;
  image: string | null;
  brand: string;
  unit: string;
};

const STORAGE_KEY = "td_recently_viewed_v1";

export default function RecentlyViewed({ current }: { current: ViewedProductItem }) {
  const [items, setItems] = useState<ViewedProductItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: ViewedProductItem[] = raw ? JSON.parse(raw) : [];
      const others = parsed.filter((x) => x && x.id !== current.id);
      setItems(others.slice(0, 4));
      const updated = [current, ...others].slice(0, 8);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* ignore storage errors */
    }
  }, [current]);

  if (items.length === 0) return null;

  return (
    <section className="my-10">
      <div className="mb-4 flex items-end justify-between border-b-2 border-brand">
        <h2 className="-mb-0.5 border-b-2 border-brand bg-brand px-4 py-2 text-sm font-bold uppercase text-white">
          Sản phẩm đã xem gần đây
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:border-brand/40 hover:shadow-md"
          >
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt={p.name} className="aspect-square w-full object-cover transition group-hover:scale-105" />
            ) : (
              <div
                className="grid aspect-square place-items-center p-4 text-center text-sm font-semibold text-gray-600 transition group-hover:scale-105"
                style={{ background: palette[p.id % palette.length] }}
              >
                {p.name}
              </div>
            )}
            <div className="flex flex-1 flex-col gap-1 p-3">
              {(p.brand || p.unit) && (
                <div className="text-[11px] text-gray-500">
                  {p.brand} {p.brand && p.unit ? "·" : ""} {p.unit}
                </div>
              )}
              <div className="line-clamp-2 text-sm font-semibold text-gray-800 group-hover:text-brand">
                {p.name}
              </div>
              <div className="mt-auto pt-1 text-sm font-bold text-accent">
                {p.price ? vnd(p.sale_price ?? p.price) : "Liên hệ"}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
