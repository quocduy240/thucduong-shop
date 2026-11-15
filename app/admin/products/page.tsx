import Link from "next/link";
import { Flash, PageHeader, Pagination, pageParam, strParam, ui } from "@/components/admin/ui";
import { listProducts } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getProductCategories, url } from "@/lib/data";
import { vnd } from "@/lib/site";

export const metadata = { title: "Sản phẩm | Quản trị" };

export default async function ProductsAdmin({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = strParam(sp.q);
  const category = Number(strParam(sp.category)) || 0;
  const page = pageParam(sp.page);
  const { rows, total } = listProducts({ q, category, page });
  const categories = getProductCategories();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Sản phẩm">
        <Link href="/admin/products/new/" className={ui.primary}>+ Thêm sản phẩm</Link>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Tìm theo tên..." className={`${ui.input} max-w-xs`} />
        <select name="category" defaultValue={category || ""} className={`${ui.input} max-w-xs`}>
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className={ui.secondary}>Lọc</button>
        {(q || category) && <Link href="/admin/products/" className={ui.secondary}>Bỏ lọc</Link>}
      </form>

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr><th className={ui.th}>Ảnh</th><th className={ui.th}>Tên</th><th className={ui.th}>Danh mục</th><th className={ui.th}>Giá</th><th className={ui.th}></th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className={ui.td}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-lg bg-gray-100 text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className={`${ui.td} max-w-md`}>
                  <Link href={`/admin/products/${p.id}/`} className="font-medium hover:text-brand">{p.name}</Link>
                  {p.featured ? <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Nổi bật</span> : null}
                </td>
                <td className={ui.td}>{p.category_name}</td>
                <td className={ui.td}>
                  {p.price ? (
                    <>
                      {vnd(p.sale_price ?? p.price)}
                      {p.sale_price ? <div className="text-xs text-gray-400 line-through">{vnd(p.price)}</div> : null}
                    </>
                  ) : (
                    <span className="text-gray-500">Liên hệ</span>
                  )}
                </td>
                <td className={`${ui.td} whitespace-nowrap text-right`}>
                  <Link href={url.product(p)} target="_blank" className="mr-3 text-gray-500 hover:underline">Xem</Link>
                  <Link href={`/admin/products/${p.id}/`} className="text-brand hover:underline">Sửa</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-gray-500">Không có sản phẩm nào.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination basePath="/admin/products/" page={page} total={total} params={{ q, category: category ? String(category) : undefined }} />
    </div>
  );
}
