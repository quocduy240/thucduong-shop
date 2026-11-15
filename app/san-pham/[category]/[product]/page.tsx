import { notFound } from "next/navigation";
import { getProduct, getRelatedProducts, url } from "@/lib/data";
import { Breadcrumb, Price, ProductGrid, SectionTitle, Thumb } from "@/components/ui";
import AddToCart from "@/components/AddToCart";
import Comments from "@/components/Comments";

// URL: /san-pham/<category>/<slug>.html
async function load(params: PageProps<"/san-pham/[category]/[product]">["params"]) {
  const { category, product } = await params;
  if (!product.endsWith(".html")) return undefined;
  return getProduct(category, product.slice(0, -5));
}

export async function generateMetadata({ params }: PageProps<"/san-pham/[category]/[product]">) {
  const p = await load(params);
  return { title: p?.name ?? "Không tìm thấy", description: p?.summary };
}

export default async function ProductPage({ params }: PageProps<"/san-pham/[category]/[product]">) {
  const p = await load(params);
  if (!p) notFound();
  const related = getRelatedProducts(p);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Sản phẩm", href: "/san-pham/" },
          { label: p.category_name, href: url.productCategory({ slug: p.category_slug }) },
          { label: p.name },
        ]}
      />
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border">
            <Thumb label={p.name} seed={p.id} image={p.image} className="text-lg" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{p.name}</h1>
            <div className="my-4"><Price p={p} big /></div>
            <p className="text-gray-600">{p.summary}</p>
            {p.price > 0 ? (
              <AddToCart productId={p.id} />
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Vui lòng liên hệ cửa hàng để biết giá và đặt mua.</p>
            )}
            <ul className="mt-6 space-y-1 rounded-lg bg-green-50 p-4 text-sm">
              <li>✔ Giao hàng toàn quốc</li>
              <li>✔ Thanh toán khi nhận hàng (COD)</li>
              <li>✔ Đổi trả theo chính sách</li>
            </ul>
          </div>
        </div>

        <section className="my-10">
          <SectionTitle title="Giới thiệu sản phẩm" />
          {/* Video block placeholder (reference site embeds a YouTube intro here) */}
          <div className="mb-4 grid aspect-video max-w-2xl place-items-center rounded-lg bg-gray-100 text-gray-400">Video giới thiệu (tuỳ chọn)</div>
          <div className="prose-content" dangerouslySetInnerHTML={{ __html: p.description }} />
          <p className="mt-4 text-xs italic text-gray-500">
            Thông tin trên website chỉ mang tính chất tham khảo, không thay thế chẩn đoán hoặc điều trị y khoa.
          </p>
        </section>

        <section className="my-10">
          <SectionTitle title="Bình luận" />
          <Comments productId={p.id} />
        </section>

        {related.length > 0 && (
          <section className="my-10">
            <SectionTitle title="Sản phẩm liên quan" />
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </>
  );
}
