import Link from "next/link";
import { notFound } from "next/navigation";
import { expandNestedBlocks, getQrBadgesForPosition } from "@/lib/blocks";
import QrCornerBadge from "@/components/QrCornerBadge";
import { getProduct, getRelatedProducts, url } from "@/lib/data";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { getProductFlashSale } from "@/lib/flash-sale";
import { getSeoFields } from "@/lib/seo";
import { getSite } from "@/lib/settings";
import { getSocialLinksConfig } from "@/lib/social-links";
import { vnd } from "@/lib/site";
import BlockZone from "@/components/BlockZone";
import FrontendEditButton from "@/components/FrontendEditButton";
import RotatingHotline from "@/components/RotatingHotline";
import SocialLinksBlock from "@/components/SocialLinksBlock";
import { Breadcrumb, Price, ProductGrid, SectionTitle } from "@/components/ui";
import AddToCart from "@/components/AddToCart";
import Comments from "@/components/Comments";
import ProductGallery from "@/components/ProductGallery";
import RecentlyViewed from "@/components/RecentlyViewed";

// URL: /san-pham/<category>/<slug>.html
export const revalidate = 300;

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
  if (!p) return { title: "Không tìm thấy" };
  const seo = await getSeoFields("products", p.id);
  const title = seo.seo_title || p.name;
  const description = seo.seo_description || p.summary || undefined;
  return {
    title,
    description,
    keywords: seo.seo_keywords || undefined,
    alternates: { canonical: url.product(p) },
    openGraph: {
      title,
      description,
      images: p.image ? [p.image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/san-pham/[category]/[product]">) {
  const p = await load(params);
  if (!p) notFound();
  const [related, site, flashDeal, expandedDescription, productQrBadges] = await Promise.all([
    getRelatedProducts(p),
    getSite(),
    getProductFlashSale(p.id),
    expandNestedBlocks(p.description),
    getQrBadgesForPosition("product_card_badge", { productId: p.id }),
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

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.summary || undefined,
    image: p.image ? [p.image] : undefined,
    sku: p.sku || undefined,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    offers:
      p.price > 0
        ? {
            "@type": "Offer",
            priceCurrency: "VND",
            price: effectiveSalePrice ?? p.price,
            availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }}
      />
      <Breadcrumb
        items={[
          { label: "Sản phẩm", href: "/san-pham/" },
          { label: p.category_name, href: url.productCategory({ slug: p.category_slug }) },
          { label: p.name },
        ]}
      />
      <div className="mx-auto max-w-6xl px-4 pb-10">
        <div className="grid gap-8 rounded-3xl border border-emerald-100/90 bg-white p-5 shadow-sm md:grid-cols-[450px_1fr] md:p-8">
          {/* Left: Interactive Image Gallery + Product QR Badge */}
          <div className="space-y-3">
            <ProductGallery
              name={p.name}
              seed={p.id}
              image={p.image}
              gallery={p.gallery}
              discountPct={discountPct}
              outOfStock={p.stock <= 0}
            />
            {productQrBadges.length > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-2.5">
                <QrCornerBadge items={productQrBadges} label="Quét QR sản phẩm" />
              </div>
            )}
          </div>

          {/* Right: Product Info, Metadata, Price & Actions */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                {p.brand && (
                  <Link
                    href={`/san-pham/?brand=${encodeURIComponent(p.brand)}`}
                    className="rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 font-bold text-brand hover:bg-emerald-100"
                  >
                    🌿 {p.brand}
                  </Link>
                )}
                {p.sku && (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-mono text-[11px] font-medium text-gray-600">
                    SKU: {p.sku}
                  </span>
                )}
                {p.origin && (
                  <Link
                    href={`/san-pham/?origin=${encodeURIComponent(p.origin)}`}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-medium text-gray-600 hover:border-brand hover:text-brand"
                  >
                    🌍 {p.origin}
                  </Link>
                )}
                <FrontendEditButton
                  resource="product"
                  href={`/admin/products/${p.id}/`}
                  label="Sửa sản phẩm"
                  variant="inline"
                />
                <FrontendEditButton
                  resource="category"
                  href="/admin/categories/"
                  label="Sửa danh mục"
                  variant="inline"
                />
              </div>

              <h1 className="text-2xl font-extrabold leading-snug tracking-tight text-gray-900 md:text-[1.85rem]">
                {p.name}
              </h1>

              {/* Rating & Stock bar */}
              <div className="mt-3 flex flex-wrap items-center gap-3.5 text-sm">
                <a href="#danh-gia" className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 hover:bg-amber-100">
                  <span className="text-amber-500">
                    {"★".repeat(Math.round(p.rating_avg || 5))}
                  </span>
                  <span className="font-bold text-gray-900">{p.rating_avg || "5.0"}</span>
                  <span className="text-xs text-gray-500">
                    ({p.rating_count} đánh giá)
                  </span>
                </a>
                <span className="text-gray-300">|</span>
                <div>
                  <span className="text-gray-500">Tình trạng: </span>
                  {p.stock > 0 ? (
                    <span className="font-bold text-brand">✓ Còn hàng ({p.stock})</span>
                  ) : (
                    <span className="font-bold text-red-600">Hết hàng</span>
                  )}
                </div>
                {p.unit && (
                  <>
                    <span className="text-gray-300">|</span>
                    <div>
                      <span className="text-gray-500">Quy cách: </span>
                      <span className="font-bold text-gray-800">{p.unit}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Flash Sale Banner if active */}
              {flashDeal && (
                <div className="mt-4 overflow-hidden rounded-2xl border-2 border-red-500 bg-gradient-to-r from-red-600 via-red-500 to-amber-500 p-3.5 text-white shadow-sm">
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
              <div className="my-5 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/75 via-orange-50/40 to-white p-4 md:p-5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <Price p={{ ...p, sale_price: effectiveSalePrice }} big />
                  {savedAmount > 0 && (
                    <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-white shadow-2xs">
                      Tiết kiệm {vnd(savedAmount)} (-{discountPct}%)
                    </span>
                  )}
                </div>
                {p.summary && (
                  <p className="mt-2.5 text-sm leading-relaxed text-gray-700">{p.summary}</p>
                )}
              </div>

              {p.price > 0 ? (
                <AddToCart productId={p.id} stock={p.stock} />
              ) : (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
                  Vui lòng liên hệ hotline <strong>{site.hotline}</strong> để được báo giá và đặt mua.
                </p>
              )}

              {(await getSocialLinksConfig()).showOnProductPage && (
                <SocialLinksBlock style="pills" group="marketplace" className="mt-3" />
              )}

              {/* Quick Consultation Hotline / Zalo Callout */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-green-50/40 p-4 text-sm">
                <div>
                  <div className="font-bold text-brand">🌿 Cần tư vấn thực dưỡng phù hợp thể trạng?</div>
                  <div className="text-xs text-gray-600">Gọi trực tiếp hoặc nhắn Zalo để được hướng dẫn cách dùng chi tiết</div>
                </div>
                <div className="flex items-center gap-2">
                  <RotatingHotline
                    raw={site.hotline}
                    prefix="📞 "
                    className="rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-brand-dark"
                  />
                  <a
                    href={`https://zalo.me/${primaryPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-brand bg-white px-3.5 py-2 text-xs font-bold text-brand transition hover:bg-green-50"
                  >
                    💬 Chat Zalo
                  </a>
                </div>
              </div>
            </div>

            {/* Service Commitments linked to Policy Pages */}
            <div className="mt-5 grid grid-cols-1 gap-2.5 text-xs text-gray-700 sm:grid-cols-2">
              <Link
                href="/chinh-sach/chinh-sach-kiem-hang.html"
                className="flex items-start gap-2.5 rounded-xl border border-gray-200/90 bg-gray-50/50 p-3 transition hover:-translate-y-0.5 hover:border-brand hover:bg-white hover:shadow-xs"
              >
                <span className="rounded-lg bg-emerald-100/70 p-1.5 text-base leading-none">📦</span>
                <div>
                  <strong className="text-brand">Chính sách kiểm hàng:</strong> Đồng kiểm với shipper hoặc trong 30 phút từ khi nhận hàng.
                </div>
              </Link>
              <Link
                href="/chinh-sach/chinh-sach-van-chuyen.html"
                className="flex items-start gap-2.5 rounded-xl border border-gray-200/90 bg-gray-50/50 p-3 transition hover:-translate-y-0.5 hover:border-brand hover:bg-white hover:shadow-xs"
              >
                <span className="rounded-lg bg-emerald-100/70 p-1.5 text-base leading-none">🚚</span>
                <div>
                  <strong className="text-brand">Chính sách vận chuyển:</strong> Giao 1–2 ngày tại TP.HCM, 3–4 ngày tỉnh khác.
                </div>
              </Link>
              <Link
                href="/chinh-sach/chinh-sach-doi-tra-hoan-tien.html"
                className="flex items-start gap-2.5 rounded-xl border border-gray-200/90 bg-gray-50/50 p-3 transition hover:-translate-y-0.5 hover:border-brand hover:bg-white hover:shadow-xs"
              >
                <span className="rounded-lg bg-emerald-100/70 p-1.5 text-base leading-none">🔄</span>
                <div>
                  <strong className="text-brand">Chính sách đổi trả:</strong> Thông báo trong 48h, gửi trả trong 7 ngày nếu lỗi/bể vỡ.
                </div>
              </Link>
              <Link
                href="/chinh-sach/chinh-sach-thanh-toan.html"
                className="flex items-start gap-2.5 rounded-xl border border-gray-200/90 bg-gray-50/50 p-3 transition hover:-translate-y-0.5 hover:border-brand hover:bg-white hover:shadow-xs"
              >
                <span className="rounded-lg bg-emerald-100/70 p-1.5 text-base leading-none">💳</span>
                <div>
                  <strong className="text-brand">Chính sách thanh toán:</strong> COD tiền mặt hoặc chuyển khoản BIDV (8610312888).
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Specifications Table & Detailed Description */}
        <div className="my-10 grid gap-8 md:grid-cols-[1fr_330px]">
          <section>
            <SectionTitle title="Thông tin chi tiết sản phẩm" />
            {embedUrl && (
              <div className="mb-6 overflow-hidden rounded-2xl border shadow-sm">
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
              className="prose-content rounded-3xl border border-gray-200/90 bg-white p-6 text-[15.5px] leading-[1.82] shadow-sm md:p-9"
              // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(expandedDescription) }}
            />
            <BlockZone position="product_bottom" productId={p.id} className="mt-4" />
            <p className="mt-3 text-xs italic text-gray-500">
              * Lưu ý: Thực phẩm thực dưỡng hỗ trợ cân bằng quân bình âm dương và nâng cao sức khỏe tự nhiên, không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh.
            </p>
          </section>

          {/* Right column: Structured Specifications Table + Product Sidebar Blocks */}
          <div className="h-fit space-y-6 md:sticky md:top-24">
            <aside className="rounded-3xl border border-gray-200/90 bg-white p-5 shadow-sm">
              <h2 className="mb-3 border-b border-emerald-100 pb-2.5 text-base font-extrabold text-brand">
                📋 Thông số sản phẩm
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
