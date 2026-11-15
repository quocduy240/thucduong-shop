import Link from "next/link";
import { getProductCategories, url } from "@/lib/data";

export default function CategorySidebar({ active }: { active?: string }) {
  return (
    <aside className="h-fit rounded-lg border bg-white p-4">
      <h2 className="mb-2 font-bold uppercase text-brand">Danh mục</h2>
      <ul className="space-y-1 text-sm">
        {getProductCategories().map((c) => (
          <li key={c.slug}>
            <Link
              href={url.productCategory(c)}
              className={`block rounded px-2 py-1 hover:bg-green-50 ${active === c.slug ? "bg-green-50 font-semibold text-brand" : ""}`}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
