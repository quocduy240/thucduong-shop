import Link from "next/link";
import { url, type Post, type Product } from "@/lib/data";
import type { FrontendEditResource } from "@/lib/frontend-edit";
import { buildImageSrcSet, optimizeImageUrl } from "@/lib/image-url";
import { vnd } from "@/lib/site";
import FrontendEditButton from "./FrontendEditButton";
import QuickAddButton from "./QuickAddButton";

const palette = ["#e8f5e9", "#fff3e0", "#e3f2fd", "#fce4ec", "#f3e5f5", "#e0f7fa"];

/** Product/content square thumbnail with optional Cloudflare R2 + Image Resizing. */
export function Thumb({
  label,
  seed,
  image,
  className = "",
  width = 480,
}: {
  label: string;
  seed: number;
  image?: string | null;
  className?: string;
  width?: number;
}) {
  if (image) {
    const src = optimizeImageUrl(image, { width, quality: 82, fit: "cover" });
    const srcSet = buildImageSrcSet(image, [240, 480, 720], { quality: 82, fit: "cover" });
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? "(max-width: 768px) 50vw, 25vw" : undefined}
        alt={label}
        loading="lazy"
        decoding="async"
        className={`aspect-square w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`grid aspect-square place-items-center p-4 text-center text-sm font-semibold text-gray-600 ${className}`}
      style={{ background: palette[seed % palette.length] }}
    >
      {label}
    </div>
  );
}

export function Price({ p, big = false }: { p: Pick<Product, "price" | "sale_price">; big?: boolean }) {
  if (!p.price) {
    return <span className={`font-bold text-accent ${big ? "text-2xl" : ""}`}>Liên hệ</span>;
  }
  return (
    <div className={big ? "flex flex-wrap items-baseline gap-x-3 gap-y-0.5" : "flex flex-col leading-tight"}>
      <span className={`font-bold text-accent ${big ? "text-2xl" : "text-[15px]"}`}>{vnd(p.sale_price ?? p.price)}</span>
      {p.sale_price != null && (
        <span className={`${big ? "text-sm" : "mt-0.5 text-xs"} text-gray-400 line-through`}>
          {vnd(p.price)}
        </span>
      )}
    </div>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const discountPct =
    p.price > 0 && p.sale_price != null && p.sale_price < p.price
      ? Math.round(((p.price - p.sale_price) / p.price) * 100)
      : 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md">
      <div className="relative overflow-hidden">
        <Link href={url.product(p)} className="block">
          <Thumb label={p.name} seed={p.id} image={p.image} className="transition duration-300 group-hover:scale-105" />
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {discountPct > 0 && (
              <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                -{discountPct}%
              </span>
            )}
            {p.featured === 1 && (
              <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                ★ Bán chạy
              </span>
            )}
          </div>
          {p.stock <= 0 && (
            <span className="absolute right-2 top-2 rounded-md bg-gray-900/80 px-2 py-0.5 text-xs font-medium text-white">
              Hết hàng
            </span>
          )}
        </Link>
        <FrontendEditButton
          resource="product"
          href={`/admin/products/${p.id}/`}
          label="Sửa SP"
          variant="badge"
          className="absolute bottom-2 right-2 z-10"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {(p.brand || p.unit) && (
          <div className="flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
            {p.brand && <span className="font-medium text-brand">{p.brand}</span>}
            {p.brand && p.unit && <span>·</span>}
            {p.unit && <span>{p.unit}</span>}
          </div>
        )}
        <Link href={url.product(p)} className="line-clamp-2 text-sm font-semibold text-gray-800 hover:text-brand">
          {p.name}
        </Link>
        {p.rating_count > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-amber-500">★</span>
            <span className="font-medium text-gray-700">{p.rating_avg}</span>
            <span className="text-gray-400">({p.rating_count})</span>
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <Price p={p} />
          <QuickAddButton productId={p.id} price={p.sale_price ?? p.price} stock={p.stock} />
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {products.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}

export function PostCard({ p }: { p: Post }) {
  return (
    <article className="group relative flex gap-3.5 rounded-xl border border-gray-200/90 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md">
      <FrontendEditButton
        resource="post"
        href={`/admin/posts/${p.id}/`}
        label="Sửa bài"
        variant="badge"
        className="absolute right-2.5 top-2.5 z-10"
      />
      <Link href={url.post(p)} className="w-24 shrink-0 overflow-hidden rounded-lg sm:w-28">
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={optimizeImageUrl(p.cover, { width: 320, quality: 80, fit: "cover" })}
            srcSet={buildImageSrcSet(p.cover, [200, 320, 480], { quality: 80, fit: "cover" })}
            sizes="(max-width: 640px) 96px, 112px"
            alt={p.title}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <Thumb label="Bài viết" seed={p.id + 3} className="text-xs" />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-brand">
            {p.category_name}
          </span>
          <Link href={url.post(p)} className="mt-1 line-clamp-2 block text-sm font-bold leading-snug text-gray-900 group-hover:text-brand sm:text-base">
            {p.title}
          </Link>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{p.excerpt}</p>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">📅 {p.created_at.slice(0, 10)}</p>
      </div>
    </article>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto flex max-w-6xl flex-wrap items-center gap-y-1 px-4 py-3 text-xs text-gray-500 sm:text-sm">
      <Link href="/" className="hover:text-brand">🏠 Trang chủ</Link>
      {items.map((it) => (
        <span key={it.label} className="flex items-center">
          <span className="mx-1.5 text-gray-300">/</span>
          {it.href ? (
            <Link href={it.href} className="hover:text-brand">{it.label}</Link>
          ) : (
            <span className="line-clamp-1 font-medium text-gray-800">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SectionTitle({
  title,
  href,
  edit,
}: {
  title: string;
  href?: string;
  edit?: { resource: FrontendEditResource; href: string; label?: string };
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-2 border-b-2 border-brand">
      <h2 className="-mb-0.5 border-b-2 border-brand bg-brand px-4 py-2 text-sm font-bold uppercase text-white">{title}</h2>
      <div className="flex items-center gap-2 pb-1">
        {edit && (
          <FrontendEditButton
            resource={edit.resource}
            href={edit.href}
            label={edit.label || "Sửa"}
            variant="inline"
          />
        )}
        {href && <Link href={href} className="text-sm text-brand hover:underline">Xem tất cả »</Link>}
      </div>
    </div>
  );
}
