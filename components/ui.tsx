import Link from "next/link";
import { url, type Post, type Product } from "@/lib/data";
import { vnd } from "@/lib/site";

const palette = ["#e8f5e9", "#fff3e0", "#e3f2fd", "#fce4ec", "#f3e5f5", "#e0f7fa"];

/** Placeholder image — swap for <Image> once you have real product photos. */
export function Thumb({
  label,
  seed,
  image,
  className = "",
}: {
  label: string;
  seed: number;
  image?: string | null;
  className?: string;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={label} className={`aspect-square w-full object-cover ${className}`} />
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
    <div className={big ? "flex items-baseline gap-3" : "flex items-baseline gap-2"}>
      <span className={`font-bold text-accent ${big ? "text-2xl" : ""}`}>{vnd(p.sale_price ?? p.price)}</span>
      {p.sale_price != null && <span className="text-sm text-gray-400 line-through">{vnd(p.price)}</span>}
    </div>
  );
}

export function ProductCard({ p }: { p: Product }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border bg-white transition hover:shadow-md">
      <Link href={url.product(p)} className="relative">
        <Thumb label={p.name} seed={p.id} image={p.image} className="transition group-hover:scale-[1.02]" />
        {p.stock <= 0 && (
          <span className="absolute right-2 top-2 rounded bg-gray-900/80 px-2 py-0.5 text-xs font-medium text-white">
            Hết hàng
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={url.product(p)} className="line-clamp-2 text-sm font-medium hover:text-brand">{p.name}</Link>
        <div className="mt-auto"><Price p={p} /></div>
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
    <article className="flex gap-4 rounded-lg border bg-white p-3">
      <Link href={url.post(p)} className="w-28 shrink-0 overflow-hidden rounded">
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover} alt={p.title} className="aspect-square w-full object-cover" />
        ) : (
          <Thumb label="Bài viết" seed={p.id + 3} className="text-xs" />
        )}
      </Link>
      <div>
        <Link href={url.post(p)} className="font-medium hover:text-brand">{p.title}</Link>
        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{p.excerpt}</p>
        <p className="mt-1 text-xs text-gray-400">{p.category_name} · {p.created_at.slice(0, 10)}</p>
      </div>
    </article>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="mx-auto max-w-6xl px-4 py-3 text-sm text-gray-500">
      <Link href="/" className="hover:text-brand">Trang chủ</Link>
      {items.map((it) => (
        <span key={it.label}>
          <span className="mx-2">/</span>
          {it.href ? <Link href={it.href} className="hover:text-brand">{it.label}</Link> : <span className="text-gray-800">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function SectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between border-b-2 border-brand">
      <h2 className="-mb-0.5 border-b-2 border-brand bg-brand px-4 py-2 text-sm font-bold uppercase text-white">{title}</h2>
      {href && <Link href={href} className="pb-1 text-sm text-brand hover:underline">Xem tất cả »</Link>}
    </div>
  );
}
