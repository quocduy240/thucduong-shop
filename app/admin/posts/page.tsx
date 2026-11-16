import Link from "next/link";
import { Flash, PageHeader, Pagination, pageParam, strParam, ui } from "@/components/admin/ui";
import { listPosts } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getPostCategories, url } from "@/lib/data";

export const metadata = { title: "Bài viết | Quản trị" };

export default async function PostsAdmin({ searchParams }: PageProps<"/admin/posts">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = strParam(sp.q);
  const category = Number(strParam(sp.category)) || 0;
  const page = pageParam(sp.page);
  const { rows, total } = listPosts({ q, category, page });
  const categories = getPostCategories();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Bài viết">
        <Link href="/admin/posts/new/" className={ui.primary}>+ Thêm bài viết</Link>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Tìm theo tiêu đề..." className={`${ui.input} max-w-xs`} />
        <select name="category" defaultValue={category || ""} className={`${ui.input} max-w-xs`}>
          <option value="">Tất cả chuyên mục</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.section_slug} / {c.name}</option>)}
        </select>
        <button className={ui.secondary}>Lọc</button>
        {(q || category) && <Link href="/admin/posts/" className={ui.secondary}>Bỏ lọc</Link>}
      </form>

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr><th className={ui.th}>Ảnh</th><th className={ui.th}>Tiêu đề</th><th className={ui.th}>Chuyên mục</th><th className={ui.th}>Ngày</th><th className={ui.th}></th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className={ui.td}>
                  {p.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-lg bg-gray-100 text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className={`${ui.td} max-w-md`}><Link href={`/admin/posts/${p.id}/`} className="font-medium hover:text-brand">{p.title}</Link></td>
                <td className={ui.td}>{p.category_name}</td>
                <td className={`${ui.td} whitespace-nowrap`}>{p.created_at.slice(0, 10)}</td>
                <td className={`${ui.td} whitespace-nowrap text-right`}>
                  <Link href={url.post(p)} target="_blank" className="mr-3 text-gray-500 hover:underline">Xem</Link>
                  <Link href={`/admin/posts/${p.id}/`} className="text-brand hover:underline">Sửa</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-gray-500">Không có bài viết nào.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination basePath="/admin/posts/" page={page} total={total} params={{ q, category: category ? String(category) : undefined }} />
    </div>
  );
}
