import Link from "next/link";
import { getHomeCategoryProducts, getPosts, getProductCategories, url } from "@/lib/data";
import { getFlashSaleDashboard } from "@/lib/flash-sale";
import BlockZone from "@/components/BlockZone";
import { FlashSaleShowcase } from "@/components/FlashSaleShowcase";
import { PostCard, ProductGrid, SectionTitle } from "@/components/ui";
import { getSite } from "@/lib/settings";

export const revalidate = 60;

export default async function Home() {
  const [site, categories, posts, flashSale, categoryProductsMap] = await Promise.all([
    getSite(),
    getProductCategories(),
    getPosts({ limit: 6 }),
    getFlashSaleDashboard(),
    getHomeCategoryProducts(4),
  ]);
  const categoryProducts = categories.map((c) => ({
    c,
    products: categoryProductsMap.get(c.id) ?? [],
  }));

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Banner */}
      <section className="my-5">
        <div className="flex min-h-60 flex-col justify-center rounded-2xl bg-gradient-to-br from-[#1f5a22] via-brand to-emerald-600 p-6 text-white shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">{site.tagline}</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">{site.name}</h1>
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-emerald-50">
            Thực phẩm Thực dưỡng – Thảo dược – Ngũ cốc &amp; Gia vị hữu cơ chuẩn mực. Cân bằng quân bình âm dương, sống khoẻ &amp; an tâm mỗi ngày.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-emerald-50">
            <span className="rounded-full bg-white/15 px-2.5 py-1">🌿 100% Tự nhiên</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1">🩺 Tư vấn 1:1</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1">🚚 Giao toàn quốc</span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link href="/san-pham/" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand shadow-xs transition hover:bg-emerald-50">
              🛍️ Mua sắm ngay
            </Link>
            <Link href="/tu-van-nhanh/" className="rounded-full border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">
              ✨ Tư vấn AI miễn phí
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-emerald-100/75">
            HKD Cửa Hàng Phúc Thọ · GPKD: 089185004882 (23/10/2025 – TP.HCM)
          </p>
        </div>
      </section>

      {/* Quick Shortcuts Strip */}
      <section className="my-4 flex gap-2 overflow-x-auto pb-1">
        {[
          { href: "/canh-duong-sinh/", label: "🌿 Canh Dưỡng Sinh" },
          { href: "/san-pham/", label: "🛍️ Tất cả sản phẩm" },
          { href: "/tu-van-nhanh/", label: "🩺 Tư vấn AI 1:1" },
          { href: "/thu-vien/bai-giang-thuc-duong/", label: "🎬 Video & Tài liệu" },
          { href: "/thanh-vien/", label: "👑 Tích điểm & Quà tặng" },
          { href: "/so-do-trang.html", label: "🗺️ Sơ đồ trang" },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:border-brand hover:bg-emerald-50 hover:text-brand"
          >
            {q.label}
          </Link>
        ))}
      </section>

      {flashSale.config.enabled && flashSale.slots.length > 0 && (
        <FlashSaleShowcase
          title={flashSale.config.title}
          subtitle={flashSale.config.subtitle}
          activeSlotId={flashSale.activeSlot?.id ?? flashSale.slots[0].id}
          countdownTargetIso={flashSale.countdownTargetIso}
          slots={flashSale.slots}
        />
      )}

      <BlockZone position="home_top" className="my-6" />

      {/* One block per product category, like the reference home page */}
      {categoryProducts.map(({ c, products }) => {
        if (!products.length) return null;
        return (
          <section key={c.slug} className="my-10">
            <SectionTitle title={c.name} href={url.productCategory(c)} />
            <ProductGrid products={products} />
          </section>
        );
      })}

      <section className="my-10">
        <SectionTitle title="Kiến thức" href="/thuc-duong/" />
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((p) => <PostCard key={p.id} p={p} />)}
        </div>
      </section>

      <BlockZone position="home_bottom" className="my-8" />
    </div>
  );
}
