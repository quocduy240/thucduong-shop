import Link from "next/link";
import { getPages, getProductCategories, url } from "@/lib/data";
import { getSite } from "@/lib/settings";

export default function Footer() {
  const site = getSite();
  return (
    <footer className="mt-12 bg-brand-dark text-sm text-green-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="mb-2 text-lg font-bold text-white">{site.name}</div>
          <p>{site.address}</p>
          <p>Hotline: {site.hotline}</p>
          <p>Email: {site.email}</p>
        </div>
        <div>
          <div className="mb-2 font-semibold uppercase text-white">Chính sách</div>
          <ul className="space-y-1">
            {getPages("chinh-sach").map((p) => (
              <li key={p.slug}>
                <Link href={url.page(p)} className="hover:underline">{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 font-semibold uppercase text-white">Sản phẩm</div>
          <ul className="space-y-1">
            {getProductCategories().slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={url.productCategory(c)} className="hover:underline">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-3 text-center text-xs">© {new Date().getFullYear()} {site.name}</div>
    </footer>
  );
}
