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
      <section className="my-6 grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="flex min-h-64 flex-col justify-center rounded-xl bg-gradient-to-r from-brand to-green-600 p-8 text-white">
          <p className="text-sm uppercase tracking-widest opacity-80">{site.tagline}</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">{site.name}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed opacity-95">
            CỬA HÀNG THỰC DƯỠNG PHÚC THỌ - CUNG CẤP CÁC SẢN PHẨM THỰC DƯỠNG - THẢO DƯỢC - ĐỒ ĂN - THỨC UỐNG - GIA VỊ SẠCH HỮU CƠ SỐNG KHỎE PHÚC THỌ - TÂM AN
          </p>
          <p className="mt-2 text-xs opacity-80">
            HỘ KINH DOANH CỬA HÀNG PHÚC THỌ · GPKD số 089185004882 cấp ngày 23/10/2025 tại Phòng Kinh Tế TP. Hồ Chí Minh.
          </p>
          <Link href="/san-pham/" className="mt-6 w-fit rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand">
            Xem sản phẩm
          </Link>
        </div>
        <aside className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-bold text-brand">Danh mục sản phẩm</h2>
          <ul className="space-y-1 text-sm">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={url.productCategory(c)} className="block rounded px-2 py-1 hover:bg-green-50 hover:text-brand">{c.name}</Link>
              </li>
            ))}
          </ul>
        </aside>
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
