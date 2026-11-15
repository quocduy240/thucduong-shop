import Link from "next/link";
import { notFound } from "next/navigation";
import ContentEditor from "@/components/admin/ContentEditor";
import { requireAdmin } from "@/lib/auth";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { getPostById, getPostCategories } from "@/lib/data";
import { deletePostAction, savePostAction } from "../../actions";

export const metadata = { title: "Bài viết | Quản trị" };

const input = "w-full rounded border px-3 py-2";
const label = "mb-1 block text-sm font-medium";

export default async function PostEditPage({ params, searchParams }: PageProps<"/admin/posts/[id]">) {
  await requireAdmin();
  const { id: rawId } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const id = rawId === "new" ? 0 : Number(rawId);
  if (rawId !== "new" && !Number.isInteger(id)) notFound();
  const p = id ? getPostById(id) : undefined;
  if (id && !p) notFound();
  const categories = getPostCategories();
  const current = p ? categories.find((c) => c.slug === p.category_slug)?.id : undefined;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/posts/" className="text-sm text-gray-500 hover:underline">← Danh sách bài viết</Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">{p ? "Sửa bài viết" : "Thêm bài viết"}</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form action={savePostAction} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="cover" value={p?.cover ?? ""} />
        <div>
          <label className={label}>Tiêu đề *</label>
          <input name="title" required defaultValue={p?.title} className={input} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Đường dẫn (slug)</label>
            <input name="slug" defaultValue={p?.slug} placeholder="Để trống để tự tạo từ tiêu đề" className={input} />
          </div>
          <div>
            <label className={label}>Chuyên mục *</label>
            <select name="category_id" required defaultValue={current} className={input}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.section_slug} / {c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={label}>Ảnh đại diện</label>
          {p?.cover && (
            <div className="mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.cover} alt="" className="h-24 w-24 rounded border object-cover" />
              <label className="text-sm"><input type="checkbox" name="remove_cover" value="1" /> Xoá ảnh này</label>
            </div>
          )}
          <input name="cover_file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
        </div>
        <div>
          <label className={label}>Mô tả ngắn</label>
          <textarea name="excerpt" rows={2} defaultValue={p?.excerpt} className={input} />
        </div>
        <div>
          <label className={label}>Nội dung</label>
          <ContentEditor name="content" defaultValue={p?.content ?? ""} />
        </div>
        <button className="rounded bg-brand px-5 py-2 font-medium text-white hover:opacity-90">Lưu</button>
      </form>

      {p && (
        <form action={deletePostAction} className="mt-10 border-t pt-6">
          <input type="hidden" name="id" value={p.id} />
          <ConfirmButton message="Xoá bài viết này? Không thể hoàn tác." className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50">Xoá bài viết này</ConfirmButton>
        </form>
      )}
    </div>
  );
}

