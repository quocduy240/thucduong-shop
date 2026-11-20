import Link from "next/link";
import { Flash, PageHeader, Pagination, pageParam, strParam, ui } from "@/components/admin/ui";
import { listProducts } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getProductCategories, url } from "@/lib/data";
import { vnd } from "@/lib/site";
import { bulkProductsAction, updateProductStockAction } from "../actions";

export const metadata = { title: "Sản phẩm | Quản trị" };

export default async function ProductsAdmin({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = strParam(sp.q);
  const category = Number(strParam(sp.category)) || 0;
  const stock = strParam(sp.stock);
  const status = strParam(sp.status);
  const page = pageParam(sp.page);
  const [{ rows, total }, categories] = await Promise.all([
    listProducts({ q, category, stock, status, page }),
    getProductCategories(),
  ]);

  const currentQuery = new URLSearchParams();
  if (q) currentQuery.set("q", q);
  if (category) currentQuery.set("category", String(category));
  if (stock) currentQuery.set("stock", stock);
  if (status) currentQuery.set("status", status);
  if (page > 1) currentQuery.set("page", String(page));
  currentQuery.set("saved", "1");
  const returnTo = `/admin/products/?${currentQuery.toString()}`;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Sản phẩm">
        <Link href="/admin/products/import/" className={ui.secondary}>
          🌐 Nhập SP từ Link
        </Link>
        <Link href="/admin/products/new/" className={ui.primary}>+ Thêm sản phẩm</Link>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Tìm theo tên, mã SP, thương hiệu..." className={`${ui.input} max-w-xs`} />
        <select name="category" defaultValue={category || ""} className={`${ui.input} max-w-xs`}>
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="stock" defaultValue={stock} className={`${ui.input} max-w-xs`}>
          <option value="">Tất cả tồn kho</option>
          <option value="in">Còn hàng (&gt; 0)</option>
          <option value="low">Sắp hết (1 – 5)</option>
          <option value="out">Hết hàng (0)</option>
        </select>
        <select name="status" defaultValue={status} className={`${ui.input} max-w-xs`}>
          <option value="">Tất cả trạng thái</option>
          <option value="published">Đang công khai</option>
          <option value="hidden">Đang ẩn (nháp)</option>
        </select>
        <button className={ui.secondary}>Lọc</button>
        {(q || category || stock || status) && <Link href="/admin/products/" className={ui.secondary}>Bỏ lọc</Link>}
      </form>

      <form id="bulk" action={bulkProductsAction} className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
        <input type="hidden" name="return_to" value={returnTo} />
        <span className="font-semibold text-blue-900">Thao tác hàng loạt (tick sản phẩm bên dưới):</span>
        <select name="category_id" defaultValue="" className={`${ui.input} max-w-xs`}>
          <option value="">— Giữ nguyên danh mục —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="visibility" defaultValue="" className={`${ui.input} max-w-[200px]`}>
          <option value="">— Giữ nguyên trạng thái —</option>
          <option value="publish">Công khai</option>
          <option value="hide">Ẩn (nháp)</option>
        </select>
        <button className={ui.primary}>Áp dụng</button>
      </form>

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className={ui.th}></th>
              <th className={ui.th}>Ảnh</th>
              <th className={ui.th}>Tên</th>
              <th className={ui.th}>Danh mục</th>
              <th className={ui.th}>Giá</th>
              <th className={ui.th}>Tồn kho</th>
              <th className={ui.th}></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => (
              <tr key={p.id} className={p.is_published ? "" : "bg-gray-50"}>
                <td className={ui.td}><input type="checkbox" form="bulk" name="ids" value={p.id} className="accent-brand" /></td>
                <td className={ui.td}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-lg bg-gray-100 text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className={`${ui.td} max-w-md`}>
                  <Link href={`/admin/products/${p.id}/`} className="font-medium hover:text-brand">{p.name}</Link>
                  {p.is_published ? null : <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">Đang ẩn</span>}
                  {p.featured ? <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Nổi bật</span> : null}
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-500">
                    {p.sku && <span className="font-mono text-gray-600">#{p.sku}</span>}
                    {p.brand && <span>· {p.brand}</span>}
                    {p.unit && <span>· {p.unit}</span>}
                    {p.origin && <span>({p.origin})</span>}
                  </div>
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
                <td className={ui.td}>
                  <form action={updateProductStockAction} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="return_to" value={returnTo} />
                    <input
                      name="stock"
                      type="number"
                      min={0}
                      defaultValue={p.stock}
                      className={`w-20 rounded border px-2 py-1 text-center text-sm ${
                        p.stock <= 0
                          ? "border-red-300 bg-red-50 font-semibold text-red-700"
                          : p.stock <= 5
                            ? "border-amber-300 bg-amber-50 font-medium text-amber-800"
                            : "border-gray-300"
                      }`}
                    />
                    <button className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Lưu</button>
                  </form>
                </td>
                <td className={`${ui.td} whitespace-nowrap text-right`}>
                  <Link href={url.product(p)} target="_blank" className="mr-3 text-gray-500 hover:underline">Xem</Link>
                  <Link href={`/admin/products/${p.id}/`} className="text-brand hover:underline">Sửa</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-sm text-gray-500">Không có sản phẩm nào.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination
        basePath="/admin/products/"
        page={page}
        total={total}
        params={{ q, category: category ? String(category) : undefined, stock: stock || undefined, status: status || undefined }}
      />
    </div>
  );
}
