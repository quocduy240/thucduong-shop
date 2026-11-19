import { Suspense } from "react";
import { notFound } from "next/navigation";
import { filterProducts, getProductCategory, getProductFilterFacets } from "@/lib/data";
import { Breadcrumb, ProductGrid } from "@/components/ui";
import CategorySidebar from "@/components/CategorySidebar";
import FrontendEditButton from "@/components/FrontendEditButton";
import ProductFilterBar from "@/components/ProductFilterBar";

export async function generateMetadata({ params }: PageProps<"/san-pham/[category]">) {
  const c = await getProductCategory((await params).category);
  return { title: c?.name ?? "Không tìm thấy" };
}

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

export default async function CategoryPage({ params, searchParams }: PageProps<"/san-pham/[category]">) {
  const { category } = await params;
  const sp = await searchParams;
  const c = await getProductCategory(category);
  if (!c) notFound();

  const [products, facets] = await Promise.all([
    filterProducts({
      categoryId: c.id,
      q: str(sp.q),
      brand: str(sp.brand),
      origin: str(sp.origin),
      priceRange: str(sp.price),
      onSale: str(sp.sale) === "1",
      inStock: str(sp.stock) === "1",
      sort: str(sp.sort) || "featured",
    }),
    getProductFilterFacets(c.id),
  ]);

  return (
    <>
      <Breadcrumb items={[{ label: "Sản phẩm", href: "/san-pham/" }, { label: c.name }]} />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-[240px_1fr]">
        <CategorySidebar active={c.slug} />
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-bold">{c.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <FrontendEditButton
                resource="product"
                href="/admin/products/new/"
                label="Thêm sản phẩm"
                variant="inline"
              />
              <FrontendEditButton
                resource="category"
                href="/admin/categories/"
                label="Sửa danh mục"
                variant="inline"
              />
            </div>
          </div>
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
