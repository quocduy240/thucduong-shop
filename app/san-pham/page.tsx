import { getProducts } from "@/lib/data";
import { Breadcrumb, ProductGrid } from "@/components/ui";
import CategorySidebar from "@/components/CategorySidebar";

export const metadata = { title: "Sản phẩm" };

export default function ProductsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Sản phẩm" }]} />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-[240px_1fr]">
        <CategorySidebar />
        <div>
          <h1 className="mb-4 text-2xl font-bold">Tất cả sản phẩm</h1>
          <ProductGrid products={getProducts()} />
        </div>
      </div>
    </>
  );
}
