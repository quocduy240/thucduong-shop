"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { vnd } from "@/lib/site";
import FrontendEditButton from "./FrontendEditButton";

export type FlashSlotView = {
  id: number;
  name: string;
  start_hour: number;
  end_hour: number;
  discount_pct: number;
  status: "active" | "upcoming" | "ended";
  items: {
    id: number;
    slot_id: number;
    product_id: number;
    flash_price: number;
    quota: number;
    sold: number;
    gift_note: string;
    product_name: string;
    product_slug: string;
    category_slug: string;
    category_name: string;
    original_price: number;
    sale_price: number | null;
    product_image: string | null;
    product_stock: number;
    unit: string;
  }[];
};

type Props = {
  title: string;
  subtitle: string;
  activeSlotId: number;
  countdownTargetIso: string;
  slots: FlashSlotView[];
};

const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

export function FlashSaleShowcase({
  title,
  subtitle,
  activeSlotId,
  countdownTargetIso,
  slots,
}: Props) {
  const router = useRouter();
  const [selectedSlotId, setSelectedSlotId] = useState<number>(
    activeSlotId || (slots[0]?.id ?? 0),
  );
  const [timeLeft, setTimeLeft] = useState({ h: "02", m: "15", s: "40" });
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (activeSlotId) setSelectedSlotId(activeSlotId);
  }, [activeSlotId]);

  useEffect(() => {
    const updateTimer = () => {
      const target = new Date(countdownTargetIso).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimeLeft({ h: pad2(h), m: pad2(m), s: pad2(s) });
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [countdownTargetIso]);

  if (!slots.length) return null;

  const currentSlot = slots.find((s) => s.id === selectedSlotId) ?? slots[0];

  const handleQuickBuy = async (productId: number, productName: string) => {
    setBuyingId(productId);
    try {
      const res = await fetch(`/api/v2/add-to-cart/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: 1, quantity: 1 }),
      });
      const data = await res.json();
      if (data.success) {
        setToast(`⚡ Đã săn deal "${productName}" giá Giờ Vàng vào giỏ hàng!`);
        router.refresh();
        setTimeout(() => setToast(null), 3500);
      } else {
        setToast(data.message || "Không thể thêm vào giỏ hàng.");
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      setToast("Lỗi kết nối, vui lòng thử lại.");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <section className="mb-10 rounded-2xl overflow-hidden border-2 border-[#dc2626]/30 bg-gradient-to-br from-[#fff5f5] via-white to-[#fffbeb] shadow-md">
      {/* Header Banner Giờ Vàng Săn Sale */}
      <div className="bg-gradient-to-r from-[#b91c1c] via-[#dc2626] to-[#d97706] px-4 py-3.5 md:px-6 md:py-4 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-yellow-300 text-[#991b1b] font-extrabold px-3 py-1 rounded-full text-xs md:text-sm uppercase tracking-wider shadow-sm animate-pulse">
              <span>⚡ FLASH SALE</span>
            </div>
            <h2 className="text-lg md:text-2xl font-extrabold tracking-tight uppercase drop-shadow-sm">
              {title || "GIỜ VÀNG SĂN SALE THỰC DƯỠNG"}
            </h2>
            <span className="hidden xl:inline-block text-xs text-amber-100 bg-black/20 px-3 py-1 rounded-full">
              {subtitle}
            </span>
            <FrontendEditButton
              resource="flash_sale"
              href="/admin/flash-sale/"
              label="Sửa Flash Sale"
              variant="pill"
            />
          </div>

          {/* Đồng hồ đếm ngược */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto bg-black/25 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-white/20">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-200">
              ⏰ Kết thúc sau:
            </span>
            <div className="flex items-center gap-1 font-mono font-bold text-sm md:text-base">
              <span className="bg-white text-[#b91c1c] px-2 py-0.5 rounded shadow-sm min-w-[30px] text-center">
                {timeLeft.h}
              </span>
              <span className="text-yellow-300 font-extrabold">:</span>
              <span className="bg-white text-[#b91c1c] px-2 py-0.5 rounded shadow-sm min-w-[30px] text-center">
                {timeLeft.m}
              </span>
              <span className="text-yellow-300 font-extrabold">:</span>
              <span className="bg-yellow-300 text-[#991b1b] px-2 py-0.5 rounded shadow-sm min-w-[30px] text-center">
                {timeLeft.s}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Thanh chọn Khung Giờ Vàng (Time Slots như TienKhang / Shopee Flash Sale) */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-red-100 bg-[#fef2f2]">
        {slots.map((slot) => {
          const isSelected = slot.id === currentSlot?.id;
          const isActive = slot.status === "active";
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSelectedSlotId(slot.id)}
              className={`relative px-3 py-2.5 text-center transition border-r border-red-100 last:border-r-0 ${
                isSelected
                  ? "bg-white text-[#b91c1c] font-bold shadow-inner"
                  : "text-stone-600 hover:bg-white/60"
              }`}
            >
              {isSelected && (
                <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#dc2626]" />
              )}
              <div className="flex items-center justify-center gap-1.5 text-sm md:text-base font-extrabold">
                <span>
                  {pad2(slot.start_hour)}:00 - {pad2(slot.end_hour)}:00
                </span>
                {isActive && (
                  <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-ping" />
                )}
              </div>
              <div className="text-[11px] mt-0.5 flex items-center justify-center gap-1">
                <span className="truncate max-w-[120px]">{slot.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    isActive
                      ? "bg-red-600 text-white"
                      : slot.status === "upcoming"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {isActive
                    ? "🔥 Đang diễn ra"
                    : slot.status === "upcoming"
                      ? "Sắp mở"
                      : "Đã qua"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Toast thông báo săn deal */}
      {toast && (
        <div className="mx-4 mt-3 bg-emerald-700 text-white text-xs md:text-sm font-medium px-4 py-2.5 rounded-lg flex items-center justify-between shadow">
          <span>{toast}</span>
          <Link
            href="/cart"
            className="underline font-bold ml-4 text-yellow-200 hover:text-white"
          >
            Xem giỏ hàng →
          </Link>
        </div>
      )}

      {/* Danh sách sản phẩm trong khung giờ */}
      <div className="p-4 md:p-5">
        {currentSlot && currentSlot.items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
            {currentSlot.items.map((item) => {
              const basePrice = item.original_price || item.flash_price;
              const pct =
                basePrice > item.flash_price
                  ? Math.round(((basePrice - item.flash_price) / basePrice) * 100)
                  : currentSlot.discount_pct;
              const soldPct = Math.min(
                100,
                Math.max(12, Math.round((item.sold / Math.max(1, item.quota)) * 100)),
              );
              const remaining = Math.max(0, item.quota - item.sold);
              const productHref = `/san-pham/${item.category_slug}/${item.product_slug}.html`;

              return (
                <div
                  key={item.id}
                  className="group bg-white rounded-xl border border-red-100 hover:border-red-400 shadow-sm hover:shadow-md transition flex flex-col overflow-hidden relative"
                >
                  {/* Badge Giảm giá Giờ Vàng */}
                  <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    <span className="bg-gradient-to-r from-red-600 to-amber-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow">
                      ⚡ -{pct}% GIỜ VÀNG
                    </span>
                  </div>

                  {/* Ảnh sản phẩm */}
                  <Link
                    href={productHref}
                    className="block relative aspect-square bg-stone-50 overflow-hidden"
                  >
                    {item.product_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-amber-50 to-orange-100 text-amber-900">
                        <span className="text-3xl mb-1">🌾</span>
                        <span className="text-xs font-semibold line-clamp-2">
                          {item.product_name}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Thông tin sản phẩm */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-0.5">
                        {item.category_name}
                      </div>
                      <Link
                        href={productHref}
                        className="font-bold text-xs md:text-sm text-stone-800 hover:text-[#b91c1c] line-clamp-2 min-h-[2.4rem]"
                      >
                        {item.product_name}
                      </Link>

                      {/* Quà tặng kèm nếu có */}
                      {item.gift_note && (
                        <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-medium line-clamp-1">
                          <span>🎁</span>
                          <span className="truncate">{item.gift_note}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-stone-100">
                      {/* Giá Flash Sale vs Giá gốc */}
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-base md:text-lg font-extrabold text-[#dc2626]">
                          {vnd(item.flash_price)}
                        </span>
                        {basePrice > item.flash_price && (
                          <span className="text-xs text-stone-400 line-through">
                            {vnd(basePrice)}
                          </span>
                        )}
                      </div>

                      {/* Thanh tiến độ số suất đã săn */}
                      <div className="mt-2 relative h-4 rounded-full bg-red-100 overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#dc2626] to-[#f59e0b] rounded-full transition-all duration-500"
                          style={{ width: `${soldPct}%` }}
                        />
                        <span className="relative z-10 flex items-center justify-center h-full text-[10px] font-extrabold text-red-950 uppercase tracking-wide">
                          {remaining <= 0
                            ? "🔥 Đã cháy suất"
                            : soldPct >= 75
                              ? `🔥 Sắp hết • Đã bán ${item.sold}/${item.quota}`
                              : `⚡ Đã săn ${item.sold}/${item.quota} suất`}
                        </span>
                      </div>

                      {/* Nút Săn Deal Ngay */}
                      <button
                        type="button"
                        disabled={remaining <= 0 || buyingId === item.product_id}
                        onClick={() => handleQuickBuy(item.product_id, item.product_name)}
                        className="mt-2.5 w-full py-2 px-3 rounded-lg font-bold text-xs md:text-sm text-white bg-gradient-to-r from-[#dc2626] to-[#b91c1c] hover:from-[#b91c1c] hover:to-[#991b1b] disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {buyingId === item.product_id ? (
                          <span>Đang thêm...</span>
                        ) : remaining <= 0 ? (
                          <span>Hết suất Giờ Vàng</span>
                        ) : (
                          <>
                            <span>⚡ Săn Deal Ngay</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-stone-500 text-sm">
            Khung giờ này hiện đang cập nhật sản phẩm khuyến mãi.
          </div>
        )}
      </div>
    </section>
  );
}
