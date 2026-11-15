import Link from "next/link";
import { Flash, PageHeader, ui } from "@/components/admin/ui";
import { listAllPages } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { url } from "@/lib/data";

export const metadata = { title: "Trang tĩnh | Quản trị" };

export default async function PagesAdmin({ searchParams }: PageProps<"/admin/pages">) {
  await requireAdmin();
  const sp = await searchParams;
  const pages = listAllPages();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Trang tĩnh" />
      <Flash saved={sp.saved} error={sp.error} />
      <div className={`${ui.card} divide-y`}>
        {pages.map((p) => (
          <div key={`${p.grp}/${p.slug}`} className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-gray-500">{url.page(p)}</div>
            </div>
            <div className="whitespace-nowrap text-sm">
              <Link href={url.page(p)} target="_blank" className="mr-3 text-gray-500 hover:underline">Xem</Link>
              <Link href={`/admin/pages/${p.grp || "-"}__${p.slug}/`} className="text-brand hover:underline">Sửa</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
