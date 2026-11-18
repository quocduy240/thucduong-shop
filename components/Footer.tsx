import Link from "next/link";
import { getPages, getProductCategories, url } from "@/lib/data";
import { getSite } from "@/lib/settings";
import NewsletterBar from "./NewsletterBar";

export default async function Footer() {
  const [site, policies, categories] = await Promise.all([
    getSite(),
    getPages("chinh-sach"),
    getProductCategories(),
  ]);
  return (
    <footer className="mt-12 bg-brand-dark text-sm text-green-50">
      <NewsletterBar hotline={site.hotline} />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="space-y-2">
          <div className="mb-2 text-base font-bold uppercase text-white">Giới thiệu</div>
          <p className="font-semibold text-white">HỘ KINH DOANH CỬA HÀNG PHÚC THỌ</p>
          <p className="text-xs text-green-100/90">
            GPKD số 089185004882 cấp ngày 23/10/2025 tại Phòng Kinh Tế Thành phố Hồ Chí Minh.
          </p>
          <p className="text-xs leading-relaxed text-green-100/90">
            CỬA HÀNG THỰC DƯỠNG PHÚC THỌ - CUNG CẤP CÁC SẢN PHẨM THỰC DƯỠNG - THẢO DƯỢC - ĐỒ ĂN - THỨC UỐNG - GIA VỊ SẠCH HỮU CƠ SỐNG KHỎE PHÚC THỌ - TÂM AN
          </p>
        </div>
        <div className="space-y-2">
          <div className="mb-2 text-base font-bold uppercase text-white">Thông tin liên hệ</div>
          <p>📍 {site.address}</p>
          <p>📞 {site.hotline}</p>
          <p>✉️ {site.email}</p>
        </div>
        <div>
          <div className="mb-2 text-base font-bold uppercase text-white">Chính sách</div>
          <ul className="space-y-1.5">
            {policies.map((p) => (
              <li key={p.slug}>
                <Link href={url.page(p)} className="hover:underline">{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 font-semibold uppercase text-white">Sản phẩm</div>
          <ul className="space-y-1">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={url.productCategory(c)} className="hover:underline">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-3 text-center text-xs">© {new Date().getFullYear()} {site.name}</div>
    </footer>
  );
}
