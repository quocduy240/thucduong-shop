import Link from "next/link";
import { getPosts, getProductCategories, getProductsByCategory, url } from "@/lib/data";
import { PostCard, ProductGrid, SectionTitle } from "@/components/ui";
import { getSite } from "@/lib/settings";

export default function Home() {
  const site = getSite();
  const categories = getProductCategories();
  const posts = getPosts({ limit: 6 });

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Banner */}
      <section className="my-6 grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="flex min-h-64 flex-col justify-center rounded-xl bg-gradient-to-r from-brand to-green-600 p-8 text-white">
          <p className="text-sm uppercase tracking-widest opacity-80">{site.tagline}</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">{site.name}</h1>
          <p className="mt-3 max-w-md opacity-90">Banner chính — thay bằng ảnh/slider của bạn.</p>
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

      {/* One block per product category, like the reference home page */}
      {categories.map((c) => {
        const products = getProductsByCategory(c.id, 4);
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
    </div>
  );
}
