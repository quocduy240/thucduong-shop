import Link from "next/link";
import { notFound } from "next/navigation";
import ContentEditor from "@/components/admin/ContentEditor";
import CoverImageStudio from "@/components/admin/CoverImageStudio";
import { requireAdmin } from "@/lib/auth";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { getPostById, getPostCategories, getProducts, url } from "@/lib/data";
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
  const [p, categories, productsRaw] = await Promise.all([
    id ? getPostById(id) : Promise.resolve(undefined),
    getPostCategories(),
    getProducts(200),
  ]);
  if (id && !p) notFound();
  const current = p ? categories.find((c) => c.slug === p.category_slug)?.id : undefined;
  const products = productsRaw.map((prod) => ({
    id: prod.id,
    name: prod.name,
    slug: prod.slug,
    category_slug: prod.category_slug,
    category_name: prod.category_name,
    price: prod.price,
    sale_price: prod.sale_price,
    image: prod.image,
    sku: prod.sku,
    brand: prod.brand,
    unit: prod.unit,
    summary: prod.summary,
  }));

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/posts/" className="text-sm text-gray-500 hover:underline">← Danh sách bài viết</Link>
        {p && (
          <Link href={url.post(p)} target="_blank" className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-brand hover:bg-green-50">
            Xem bài viết ngoài trang ↗
          </Link>
        )}
      </div>
      <h1 className="mb-4 mt-2 text-2xl font-bold">{p ? "Sửa bài viết" : "Thêm bài viết"}</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form action={savePostAction} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <input type="hidden" name="id" value={id} />
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
          <label className={label}>Mô tả ngắn (Meta Description chuẩn SEO)</label>
          <textarea name="excerpt" rows={2} defaultValue={p?.excerpt} className={input} />
        </div>
        <CoverImageStudio defaultCover={p?.cover ?? ""} />
        <div>
          <label className={label}>Nội dung bài viết &amp; Block Sản phẩm đính kèm</label>
          <ContentEditor
            name="content"
            defaultValue={p?.content ?? ""}
            products={products}
            defaultComboIds={p?.related_product_ids ?? ""}
            defaultComboTitle={p?.combo_title ?? ""}
          />
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

