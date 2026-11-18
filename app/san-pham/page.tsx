import { Suspense } from "react";
import { filterProducts, getProductFilterFacets } from "@/lib/data";
import { getFlashSaleDashboard } from "@/lib/flash-sale";
import { Breadcrumb, ProductGrid } from "@/components/ui";
import CategorySidebar from "@/components/CategorySidebar";
import { FlashSaleShowcase } from "@/components/FlashSaleShowcase";
import ProductFilterBar from "@/components/ProductFilterBar";

export const metadata = { title: "Sản phẩm" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

export default async function ProductsPage({ searchParams }: PageProps<"/san-pham">) {
  const sp = await searchParams;
  const [products, facets, flashSale] = await Promise.all([
    filterProducts({
      q: str(sp.q),
      brand: str(sp.brand),
      origin: str(sp.origin),
      priceRange: str(sp.price),
      onSale: str(sp.sale) === "1",
      inStock: str(sp.stock) === "1",
      sort: str(sp.sort) || "featured",
    }),
    getProductFilterFacets(),
    getFlashSaleDashboard(),
  ]);

  return (
    <>
      <Breadcrumb items={[{ label: "Sản phẩm" }]} />
      <div className="mx-auto max-w-6xl px-4">
        {flashSale.config.enabled && flashSale.slots.length > 0 && (
          <FlashSaleShowcase
            title={flashSale.config.title}
            subtitle={flashSale.config.subtitle}
            activeSlotId={flashSale.activeSlot?.id ?? flashSale.slots[0].id}
            countdownTargetIso={flashSale.countdownTargetIso}
            slots={flashSale.slots}
          />
        )}
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-[240px_1fr]">
        <CategorySidebar />
        <div>
          <h1 className="mb-3 text-2xl font-bold">Tất cả sản phẩm</h1>
          <Suspense fallback={null}>
            <ProductFilterBar facets={facets} totalCount={products.length} />
          </Suspense>
          {products.length ? (
            <ProductGrid products={products} />
          ) : (
            <div className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-gray-500">
              Không tìm thấy sản phẩm nào khớp với bộ lọc hiện tại.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
