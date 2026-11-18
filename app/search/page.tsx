import { search } from "@/lib/data";
import { Breadcrumb, PostCard, ProductGrid, SectionTitle } from "@/components/ui";

export const metadata = { title: "Tìm kiếm" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim();
  const { products, posts } = q ? await search(q, 40) : { products: [], posts: [] };

  return (
    <>
      <Breadcrumb items={[{ label: "Tìm kiếm" }]} />
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="mb-6 text-2xl font-bold">Kết quả cho “{q}”</h1>
        <section className="mb-10">
          <SectionTitle title={`Sản phẩm (${products.length})`} />
          {products.length ? <ProductGrid products={products} /> : <p className="text-gray-500">Không có sản phẩm phù hợp.</p>}
        </section>
        <section>
          <SectionTitle title={`Bài viết (${posts.length})`} />
          <div className="grid gap-4 md:grid-cols-2">{posts.map((p) => <PostCard key={p.id} p={p} />)}</div>
        </section>
      </div>
    </>
  );
}
