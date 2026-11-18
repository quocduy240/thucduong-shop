import Link from "next/link";
import { notFound } from "next/navigation";
import { expandNestedBlocks } from "@/lib/blocks";
import { getProduct, getRelatedProducts, url } from "@/lib/data";
import { getProductFlashSale } from "@/lib/flash-sale";
import { getSite } from "@/lib/settings";
import { vnd } from "@/lib/site";
import BlockZone from "@/components/BlockZone";
import { Breadcrumb, Price, ProductGrid, SectionTitle } from "@/components/ui";
import AddToCart from "@/components/AddToCart";
import Comments from "@/components/Comments";
import ProductGallery from "@/components/ProductGallery";
import RecentlyViewed from "@/components/RecentlyViewed";

// URL: /san-pham/<category>/<slug>.html
async function load(params: PageProps<"/san-pham/[category]/[product]">["params"]) {
  const { category, product } = await params;
  if (!product.endsWith(".html")) return undefined;
  return getProduct(category, product.slice(0, -5));
}

function toYoutubeEmbedUrl(raw: string): string | null {
  const s = (raw || "").trim();
  if (!s) return null;
  if (s.includes("youtube.com/embed/")) return s;
  const watchMatch = s.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const shortMatch = s.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  return null;
}

export async function generateMetadata({ params }: PageProps<"/san-pham/[category]/[product]">) {
  const p = await load(params);
  return { title: p?.name ?? "Không tìm thấy", description: p?.summary };
}

export default async function ProductPage({ params }: PageProps<"/san-pham/[category]/[product]">) {
  const p = await load(params);
  if (!p) notFound();
  const [related, site, flashDeal, expandedDescription] = await Promise.all([
    getRelatedProducts(p),
    getSite(),
    getProductFlashSale(p.id),
    expandNestedBlocks(p.description),
  ]);
  const effectiveSalePrice = flashDeal ? flashDeal.flash_price : p.sale_price;

  const discountPct =
    p.price > 0 && effectiveSalePrice != null && effectiveSalePrice < p.price
      ? Math.round(((p.price - effectiveSalePrice) / p.price) * 100)
      : 0;
  const savedAmount =
    p.price > 0 && effectiveSalePrice != null && effectiveSalePrice < p.price ? p.price - effectiveSalePrice : 0;
  const embedUrl = toYoutubeEmbedUrl(p.video_url);
  const primaryPhone = site.hotline.split("-")[0]?.replace(/[^\d]/g, "") || "0767518592";

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
        <div className="grid gap-8 md:grid-cols-[440px_1fr]">
          {/* Left: Interactive Image Gallery */}
          <ProductGallery
            name={p.name}
            seed={p.id}
            image={p.image}
            gallery={p.gallery}
            discountPct={discountPct}
            outOfStock={p.stock <= 0}
          />

          {/* Right: Product Info, Metadata, Price & Actions */}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {p.brand && (
                <Link
                  href={`/san-pham/?brand=${encodeURIComponent(p.brand)}`}
                  className="rounded-full bg-green-50 px-2.5 py-0.5 font-semibold text-brand hover:underline"
                >
                  Thương hiệu: {p.brand}
                </Link>
              )}
              {p.sku && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-mono text-gray-600">
                  Mã SP: {p.sku}
                </span>
              )}
              {p.origin && (
                <Link
                  href={`/san-pham/?origin=${encodeURIComponent(p.origin)}`}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-600 hover:text-brand"
                >
                  Xuất xứ: {p.origin}
                </Link>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{p.name}</h1>

            {/* Rating & Stock bar */}
            <div className="mt-2.5 flex flex-wrap items-center gap-4 text-sm">
              <a href="#danh-gia" className="flex items-center gap-1.5 hover:underline">
                <span className="text-amber-500">
                  {"★".repeat(Math.round(p.rating_avg || 5))}
                </span>
                <span className="font-semibold text-gray-800">{p.rating_avg || "5.0"}</span>
                <span className="text-xs text-gray-500">
                  ({p.rating_count} đánh giá)
                </span>
              </a>
              <span className="text-gray-300">|</span>
              <div>
                <span className="text-gray-500">Tình trạng: </span>
                {p.stock > 0 ? (
                  <span className="font-semibold text-brand">✓ Còn hàng ({p.stock})</span>
                ) : (
                  <span className="font-semibold text-red-600">Hết hàng</span>
                )}
              </div>
              {p.unit && (
                <>
                  <span className="text-gray-300">|</span>
                  <div>
                    <span className="text-gray-500">Quy cách: </span>
                    <span className="font-semibold text-gray-800">{p.unit}</span>
                  </div>
                </>
              )}
            </div>

            {/* Flash Sale Banner if active */}
            {flashDeal && (
              <div className="mt-4 rounded-xl overflow-hidden border-2 border-red-500 bg-gradient-to-r from-red-600 via-red-500 to-amber-500 p-3.5 text-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-yellow-300 px-2.5 py-0.5 text-xs font-extrabold uppercase text-red-900">
                      ⚡ GIỜ VÀNG SĂN SALE
                    </span>
                    <span className="text-xs font-semibold text-amber-100">
                      Đã săn {flashDeal.sold}/{flashDeal.quota} suất ưu đãi
                    </span>
                  </div>
                  {flashDeal.gift_note && (
                    <span className="rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold text-yellow-200">
                      🎁 {flashDeal.gift_note}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Price Box */}
            <div className="my-4 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <Price p={{ ...p, sale_price: effectiveSalePrice }} big />
                {savedAmount > 0 && (
                  <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                    Tiết kiệm {vnd(savedAmount)} (-{discountPct}%)
                  </span>
                )}
              </div>
              {p.summary && <p className="mt-2 text-sm text-gray-600">{p.summary}</p>}
            </div>

            {p.price > 0 ? (
              <AddToCart productId={p.id} stock={p.stock} />
            ) : (
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Vui lòng liên hệ hotline <strong>{site.hotline}</strong> để được báo giá và đặt mua.
              </p>
            )}

            {/* Quick Consultation Hotline / Zalo Callout */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50/70 p-3.5 text-sm">
              <div>
                <div className="font-bold text-brand">Cần tư vấn thực dưỡng phù hợp thể trạng?</div>
                <div className="text-xs text-gray-600">Gọi trực tiếp hoặc nhắn Zalo để được hướng dẫn cách dùng chi tiết</div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${primaryPhone}`}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                >
                  📞 {site.hotline.split("-")[0]?.trim()}
                </a>
                <a
                  href={`https://zalo.me/${primaryPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-brand bg-white px-3 py-1.5 text-xs font-semibold text-brand hover:bg-green-50"
                >
                  Chat Zalo
                </a>
              </div>
            </div>

            {/* Service Commitments linked to Policy Pages */}
            <div className="mt-4 grid grid-cols-1 gap-2.5 text-xs text-gray-700 sm:grid-cols-2">
              <Link
                href="/chinh-sach/chinh-sach-kiem-hang.html"
                className="flex items-start gap-2 rounded-lg border bg-white p-2.5 transition hover:border-brand hover:bg-green-50/40"
              >
                <span className="text-base">📦</span>
                <div>
                  <strong className="text-brand">Chính sách kiểm hàng:</strong> Đồng kiểm với shipper hoặc trong 30 phút từ khi nhận hàng (quay video mở thùng).
                </div>
              </Link>
              <Link
                href="/chinh-sach/chinh-sach-van-chuyen.html"
                className="flex items-start gap-2 rounded-lg border bg-white p-2.5 transition hover:border-brand hover:bg-green-50/40"
              >
                <span className="text-base">🚚</span>
                <div>
                  <strong className="text-brand">Chính sách vận chuyển:</strong> Giao 1–2 ngày tại TP.HCM, 3–4 ngày tỉnh khác; cam kết nguyên đai nguyên kiện.
                </div>
              </Link>
              <Link
                href="/chinh-sach/chinh-sach-doi-tra-hoan-tien.html"
                className="flex items-start gap-2 rounded-lg border bg-white p-2.5 transition hover:border-brand hover:bg-green-50/40"
              >
                <span className="text-base">🔄</span>
                <div>
                  <strong className="text-brand">Chính sách đổi trả:</strong> Thông báo trong 48h, gửi trả trong 7 ngày nếu sai mẫu, thiếu hàng hoặc bể vỡ.
                </div>
              </Link>
              <Link
                href="/chinh-sach/chinh-sach-thanh-toan.html"
                className="flex items-start gap-2 rounded-lg border bg-white p-2.5 transition hover:border-brand hover:bg-green-50/40"
              >
                <span className="text-base">💳</span>
                <div>
                  <strong className="text-brand">Chính sách thanh toán:</strong> Tiền mặt khi nhận hàng (COD) hoặc chuyển khoản BIDV (STK: 8610312888).
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Specifications Table & Detailed Description */}
        <div className="my-10 grid gap-8 md:grid-cols-[1fr_320px]">
          <section>
            <SectionTitle title="Thông tin chi tiết sản phẩm" />
            {embedUrl && (
              <div className="mb-6 overflow-hidden rounded-xl border shadow-sm">
                <iframe
                  src={embedUrl}
                  title={`Video giới thiệu ${p.name}`}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            <BlockZone position="product_top" productId={p.id} className="mb-4" />
            <div
              className="prose-content rounded-xl border bg-white p-6 shadow-sm"
              dangerouslySetInnerHTML={{ __html: expandedDescription }}
            />
            <BlockZone position="product_bottom" productId={p.id} className="mt-4" />
            <p className="mt-3 text-xs italic text-gray-500">
              * Lưu ý: Thực phẩm thực dưỡng hỗ trợ cân bằng quân bình âm dương và nâng cao sức khỏe tự nhiên, không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh.
            </p>
          </section>

          {/* Right column: Structured Specifications Table + Product Sidebar Blocks */}
          <div className="space-y-6 h-fit">
            <aside className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-3 border-b pb-2 text-base font-bold text-brand">
                Thông số sản phẩm
              </h2>
              <dl className="divide-y text-sm">
                {p.sku && (
                  <div className="flex justify-between py-2.5">
                    <dt className="text-gray-500">Mã sản phẩm</dt>
                    <dd className="font-mono font-medium text-gray-800">{p.sku}</dd>
                  </div>
                )}
                {p.brand && (
                  <div className="flex justify-between py-2.5">
                    <dt className="text-gray-500">Thương hiệu</dt>
                    <dd className="font-medium text-gray-800">{p.brand}</dd>
                  </div>
                )}
                {p.origin && (
                  <div className="flex justify-between py-2.5">
                    <dt className="text-gray-500">Xuất xứ</dt>
                    <dd className="font-medium text-gray-800">{p.origin}</dd>
                  </div>
                )}
                {p.unit && (
                  <div className="flex justify-between py-2.5">
                    <dt className="text-gray-500">Quy cách đóng gói</dt>
                    <dd className="font-medium text-gray-800">{p.unit}</dd>
                  </div>
                )}
                <div className="flex justify-between py-2.5">
                  <dt className="text-gray-500">Danh mục</dt>
                  <dd className="font-medium text-brand">
                    <Link href={url.productCategory({ slug: p.category_slug })} className="hover:underline">
                      {p.category_name}
                    </Link>
                  </dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-gray-500">Tình trạng</dt>
                  <dd className="font-medium text-gray-800">
                    {p.stock > 0 ? "Còn hàng" : "Tạm hết hàng"}
                  </dd>
                </div>
              </dl>
            </aside>
            <BlockZone position="product_sidebar" productId={p.id} />
          </div>
        </div>

        {/* Customer Reviews & Star Ratings */}
        <section id="danh-gia" className="my-10 scroll-mt-20">
          <SectionTitle title={`Đánh giá & Nhận xét (${p.rating_count})`} />
          <Comments productId={p.id} />
        </section>

        {related.length > 0 && (
          <section className="my-10">
            <SectionTitle title="Sản phẩm cùng danh mục" href={url.productCategory({ slug: p.category_slug })} />
            <ProductGrid products={related} />
          </section>
        )}

        {/* Recently Viewed Products */}
        <RecentlyViewed
          current={{
            id: p.id,
            name: p.name,
            href: url.product(p),
            price: p.price,
            sale_price: p.sale_price,
            image: p.image,
            brand: p.brand,
            unit: p.unit,
          }}
        />
      </div>
    </>
  );
}
