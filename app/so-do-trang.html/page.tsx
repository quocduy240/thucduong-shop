import Link from "next/link";
import type { Metadata } from "next";
import {
  getPages,
  getPostCategories,
  getPostSections,
  getPosts,
  getProductCategories,
  getProducts,
  url,
} from "@/lib/data";
import { Breadcrumb } from "@/components/ui";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Sơ đồ trang (Sitemap)",
  description: "Toàn bộ danh mục sản phẩm, bài viết kiến thức thực dưỡng, tài liệu và chính sách tại Thực Dưỡng Phúc Thọ.",
};

export default async function HtmlSitemapPage() {
  const [prodCats, products, sections, postCats, posts, rootPages, policyPages] = await Promise.all([
    getProductCategories(),
    getProducts(500),
    getPostSections(),
    getPostCategories(),
    getPosts({ limit: 200 }),
    getPages(""),
    getPages("chinh-sach"),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-14">
      <Breadcrumb items={[{ label: "Sơ đồ trang" }]} />

      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-green-50 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 md:text-3xl">🗺️ Sơ đồ trang Website</h1>
            <p className="mt-1 text-sm text-gray-600">
              Tìm nhanh mọi chuyên mục sản phẩm, bài viết kiến thức Thực dưỡng và trang hỗ trợ khách hàng.
            </p>
          </div>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-xs font-bold text-brand hover:bg-emerald-50"
          >
            XML Sitemap (SEO) ↗
          </a>
        </div>
      </div>

      {/* Quick Shortcuts */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          { href: "/", icon: "🏠", label: "Trang chủ" },
          { href: "/san-pham/", icon: "🛍️", label: "Tất cả sản phẩm" },
          { href: "/canh-duong-sinh/", icon: "🌿", label: "Canh Dưỡng Sinh" },
          { href: "/tu-van-nhanh/", icon: "🩺", label: "Tư vấn AI 1:1" },
          { href: "/thu-vien/bai-giang-thuc-duong/", icon: "🎬", label: "Video bài giảng" },
          { href: "/thanh-vien/", icon: "👑", label: "Thành viên & Quà" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-semibold text-gray-800 transition hover:border-brand hover:bg-emerald-50/50 hover:text-brand"
          >
            <span>{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* Products by Category */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="border-b border-gray-100 pb-3 text-lg font-extrabold text-brand">
            🛍️ Danh mục & Sản phẩm ({products.length})
          </h2>
          <div className="mt-4 space-y-5">
            {prodCats.map((cat) => {
              const items = products.filter((p) => p.category_id === cat.id);
              return (
                <div key={cat.id}>
                  <Link href={url.productCategory(cat)} className="text-sm font-bold text-gray-900 hover:text-brand">
                    {cat.name} <span className="text-xs font-normal text-gray-400">({items.length})</span>
                  </Link>
                  <ul className="mt-1.5 grid gap-1 pl-3 text-xs text-gray-600 sm:grid-cols-2">
                    {items.slice(0, 14).map((p) => (
                      <li key={p.id} className="truncate">
                        <Link href={url.product(p)} className="hover:text-brand hover:underline">
                          • {p.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Knowledge Posts & Static Pages */}
        <div className="space-y-8">
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="border-b border-gray-100 pb-3 text-lg font-extrabold text-brand">
              📚 Kiến thức & Chuyên mục ({posts.length})
            </h2>
            <div className="mt-4 space-y-4">
              {sections.map((sec) => {
                const cats = postCats.filter((c) => c.section_slug === sec.slug);
                return (
                  <div key={sec.slug}>
                    <Link href={url.postSection(sec.slug)} className="text-sm font-bold text-gray-900 hover:text-brand">
                      {sec.name}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {cats.map((c) => (
                        <Link
                          key={c.id}
                          href={url.postCategory(c)}
                          className="rounded-full border border-emerald-200 bg-emerald-50/70 px-2.5 py-0.5 text-xs font-medium text-brand hover:bg-emerald-100"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-gray-100 pt-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Bài viết mới nhất</div>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  {posts.slice(0, 20).map((p) => (
                    <li key={p.id} className="truncate">
                      <Link href={url.post(p)} className="hover:text-brand hover:underline">
                        • {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="border-b border-gray-100 pb-3 text-lg font-extrabold text-brand">
              📄 Thông tin & Chính sách
            </h2>
            <ul className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
              {[...rootPages, ...policyPages].map((pg) => (
                <li key={`${pg.grp}-${pg.slug}`}>
                  <Link href={url.page(pg)} className="hover:text-brand hover:underline">
                    • {pg.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
