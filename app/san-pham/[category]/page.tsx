import { notFound } from "next/navigation";
import { getProductCategory, getProductsByCategory } from "@/lib/data";
import { Breadcrumb, ProductGrid } from "@/components/ui";
import CategorySidebar from "@/components/CategorySidebar";

export async function generateMetadata({ params }: PageProps<"/san-pham/[category]">) {
  const c = getProductCategory((await params).category);
  return { title: c?.name ?? "Không tìm thấy" };
}

export default async function CategoryPage({ params }: PageProps<"/san-pham/[category]">) {
  const { category } = await params;
  const c = getProductCategory(category);
  if (!c) notFound();
  const products = getProductsByCategory(c.id);

  return (
    <>
      <Breadcrumb items={[{ label: "Sản phẩm", href: "/san-pham/" }, { label: c.name }]} />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-[240px_1fr]">
        <CategorySidebar active={c.slug} />
        <div>
          <h1 className="mb-4 text-2xl font-bold">{c.name}</h1>
          {products.length ? <ProductGrid products={products} /> : <p>Chưa có sản phẩm.</p>}
        </div>
      </div>
    </>
  );
}
