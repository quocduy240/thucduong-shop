import Link from "next/link";
import { getPages, getProductCategories, url } from "@/lib/data";
import { getSite, getWidgetSettings } from "@/lib/settings";
import { getSocialLinksConfig } from "@/lib/social-links";
import RotatingHotline from "./RotatingHotline";
import SocialLinksBlock from "./SocialLinksBlock";
import NewsletterBar from "./NewsletterBar";

const TRUST_PILLARS = [
  { icon: "🌿", title: "100% Tự nhiên & Hữu cơ", desc: "Nguồn gốc minh bạch, chọn lọc kỹ" },
  { icon: "🚚", title: "Giao hàng Toàn quốc", desc: "Đồng kiểm trước khi thanh toán" },
  { icon: "🩺", title: "Tư vấn Chuyên sâu", desc: "Thực dưỡng · Đông Tây y kết hợp" },
  { icon: "🛡️", title: "Đổi trả Linh hoạt", desc: "Hỗ trợ nhanh trong 48h nhận hàng" },
];

export default async function Footer() {
  const [site, widget, policies, categories, socialCfg] = await Promise.all([
    getSite(),
    getWidgetSettings(),
    getPages("chinh-sach"),
    getProductCategories(),
    getSocialLinksConfig(),
  ]);

  const primaryPhone =
    (widget.widget_hotline || site.hotline).split("-")[0]?.replace(/[^\d]/g, "") || "0767518592";
  const displayHotline = (widget.widget_hotline || site.hotline).split("-")[0]?.trim() || site.hotline;
  const zaloHref = widget.widget_zalo || `https://zalo.me/${primaryPhone}`;

  return (
    <footer className="mt-14 bg-gradient-to-b from-[#17441a] via-[#133815] to-[#0d280f] text-sm text-emerald-50/90 print:hidden">
      <NewsletterBar hotline={site.hotline} />

      {/* Trust Pillars Strip */}
      <div className="border-b border-white/10 bg-black/15">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-5 lg:grid-cols-4">
          {TRUST_PILLARS.map((item) => (
            <div key={item.title} className="flex items-center gap-3 rounded-xl bg-white/5 px-3.5 py-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-xl">
                {item.icon}
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white sm:text-sm">{item.title}</div>
                <div className="truncate text-[11px] text-emerald-200/80">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main 12-Column Footer Body */}
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-12">
        {/* Column 1: Brand & Legal Info */}
        <div className="space-y-3 lg:col-span-4">
          <div>
            <div className="text-xl font-extrabold tracking-tight text-white">{site.name}</div>
            <div className="text-xs font-medium text-emerald-300">{site.tagline}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs space-y-1.5">
            <p className="font-bold text-white">HỘ KINH DOANH CỬA HÀNG PHÚC THỌ</p>
            <p className="text-emerald-100/85">
              GPKD số <strong>089185004882</strong> cấp ngày 23/10/2025 tại Phòng Kinh Tế TP. Hồ Chí Minh.
            </p>
          </div>
          <p className="text-xs leading-relaxed text-emerald-100/80">
            Cung cấp sản phẩm Thực dưỡng – Thảo dược – Ngũ cốc – Gia vị sạch hữu cơ chuẩn mực. Sống khoẻ Phúc Thọ, Tâm An mỗi ngày.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <RotatingHotline
              raw={[widget.widget_hotline, widget.widget_hotline_2].filter(Boolean).join(" - ") || site.hotline}
              prefix="📞 "
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-brand-dark shadow-xs transition hover:bg-emerald-50"
            />
            <a
              href={zaloHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/40 bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/20"
            >
              💬 Chat Zalo
            </a>
          </div>
          {socialCfg.showInFooter && (
            <div className="pt-1">
              <SocialLinksBlock style="icons" dark />
            </div>
          )}
          <div className="pt-2">
            <a
              href="http://online.gov.vn/Home/WebDetails/138932"
              target="_blank"
              rel="nofollow noreferrer"
              aria-label="Đã thông báo Bộ Công Thương"
              className="inline-block rounded-lg bg-white/95 p-1.5 shadow-xs transition hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/uploads/logo-bo-cong-thuong.png"
                alt="Đã thông báo Bộ Công Thương"
                className="h-12 w-auto object-contain"
              />
            </a>
          </div>
        </div>

        {/* Column 2: Contact & Hours */}
        <div className="space-y-3 lg:col-span-3">
          <h3 className="border-b border-white/15 pb-2 text-xs font-extrabold uppercase tracking-wider text-white">
            Thông tin liên hệ
          </h3>
          <ul className="space-y-2.5 text-xs leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">📍</span>
              <span>{site.address}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="shrink-0">📞</span>
              <a href={`tel:${primaryPhone}`} className="font-semibold text-white hover:underline">
                {site.hotline}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <span className="shrink-0">✉️</span>
              <a href={`mailto:${site.email}`} className="truncate hover:text-white hover:underline">
                {site.email}
              </a>
            </li>
            <li className="flex items-start gap-2 text-emerald-200/90">
              <span className="shrink-0">🕒</span>
              <span>Tư vấn &amp; Giao hàng: 08:00 – 20:30 (Tất cả các ngày)</span>
            </li>
          </ul>
          <div className="rounded-2xl border border-amber-300/35 bg-white/10 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-200">
              <span>💳</span>
              <span>Thông tin chuyển khoản</span>
            </div>
            <div className="mt-2 text-sm font-bold text-white">Ngân hàng BIDV</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xs font-medium text-emerald-100/90">STK:</span>
              <strong className="text-xl font-extrabold tracking-wider text-amber-300 tabular-nums sm:text-2xl">
                8610312888
              </strong>
            </div>
            <div className="mt-1 text-xs font-medium text-emerald-100/85">
              Chủ TK: <span className="text-white">Hộ KD Cửa Hàng Phúc Thọ</span>
            </div>
          </div>
        </div>

        {/* Column 3: Policies & Quick Tools */}
        <div className="space-y-3 lg:col-span-2">
          <h3 className="border-b border-white/15 pb-2 text-xs font-extrabold uppercase tracking-wider text-white">
            Hỗ trợ &amp; Chính sách
          </h3>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/tu-van-nhanh/" className="font-semibold text-amber-300 hover:underline">
                🌿 Tư vấn nhanh AI
              </Link>
            </li>
            <li>
              <Link href="/thu-vien/bai-giang-thuc-duong/" className="hover:text-white hover:underline">
                🎬 Thư viện Video
              </Link>
            </li>
            {policies.map((p) => (
              <li key={p.slug}>
                <Link href={url.page(p)} className="text-emerald-100/90 hover:text-white hover:underline">
                  {p.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/tra-cuu-don-hang/" className="text-emerald-100/90 hover:text-white hover:underline">
                🔍 Tra cứu đơn hàng
              </Link>
            </li>
            <li>
              <Link href="/so-do-trang.html" className="text-emerald-100/90 hover:text-white hover:underline">
                🗺️ Sơ đồ trang (Sitemap)
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Product Categories */}
        <div className="space-y-3 lg:col-span-3">
          <h3 className="border-b border-white/15 pb-2 text-xs font-extrabold uppercase tracking-wider text-white">
            Danh mục sản phẩm
          </h3>
          <ul className="space-y-2 text-xs">
            <li>
              <Link
                href="/canh-duong-sinh/"
                className="inline-flex items-center gap-1.5 font-bold text-amber-300 hover:underline"
              >
                <span>⭐ Canh Dưỡng Sinh King Kung</span>
              </Link>
            </li>
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={url.productCategory(c)} className="text-emerald-100/90 hover:text-white hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Legal & Payment Bar (padded for MobileBottomBar) */}
      <div className="border-t border-white/10 bg-black/25 pb-20 md:pb-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-emerald-200/80">
          <div>
            © {new Date().getFullYear()} <strong className="text-white">{site.name}</strong> · Thực phẩm tự nhiên hỗ trợ sức khoẻ.
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-white">COD Tiền mặt</span>
            <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-white">Chuyển khoản BIDV</span>
            <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-emerald-200">Bảo mật SSL</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
