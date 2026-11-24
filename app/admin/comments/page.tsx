import { Flash, PageHeader, Pagination, pageParam, ui } from "@/components/admin/ui";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { listComments } from "@/lib/admin-data";
import { requireAdminPath } from "@/lib/auth";
import { deleteCommentAction } from "../actions";

export const metadata = { title: "Bình luận | Quản trị" };

export default async function CommentsAdmin({ searchParams }: PageProps<"/admin/comments">) {
  await requireAdminPath("/admin/comments/");
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const { rows, total } = await listComments(page);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Bình luận" />
      <Flash saved={sp.saved} error={sp.error} />
      <div className={`${ui.card} divide-y`}>
        {rows.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{c.name}</span>
                <span className="text-amber-500" title={`${c.rating || 5} sao`}>
                  {"★".repeat(Math.max(1, Math.min(5, c.rating || 5)))}
                  <span className="text-gray-300">{"★".repeat(5 - Math.max(1, Math.min(5, c.rating || 5)))}</span>
                </span>
                <span className="text-gray-400">· {c.created_at.slice(0, 16)}</span>
              </div>
              <div className="text-xs text-gray-500">Sản phẩm: {c.product_name}</div>
              <p className="mt-1 whitespace-pre-line break-words text-sm">{c.content}</p>
            </div>
            <form action={deleteCommentAction}>
              <input type="hidden" name="id" value={c.id} />
              <ConfirmButton message="Xoá bình luận này?" className={ui.danger}>Xoá</ConfirmButton>
            </form>
          </div>
        ))}
        {rows.length === 0 && <p className="p-8 text-center text-sm text-gray-500">Chưa có bình luận nào.</p>}
      </div>
      <Pagination basePath="/admin/comments/" page={page} total={total} />
    </div>
  );
}
