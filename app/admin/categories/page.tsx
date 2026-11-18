import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageHeader, ui } from "@/components/admin/ui";
import { listPostCategoriesWithCount, listProductCategoriesWithCount } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getPostSections } from "@/lib/data";
import {
  deletePostCategoryAction,
  deleteProductCategoryAction,
  savePostCategoryAction,
  saveProductCategoryAction,
} from "../actions";

export const metadata = { title: "Danh mục | Quản trị" };

export default async function CategoriesAdmin({ searchParams }: PageProps<"/admin/categories">) {
  await requireAdmin();
  const sp = await searchParams;
  const [productCats, postCats, sections] = await Promise.all([
    listProductCategoriesWithCount(),
    listPostCategoriesWithCount(),
    getPostSections(),
  ]);
  const small = `${ui.input} !py-1.5`;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <PageHeader title="Danh mục" />
      <Flash saved={sp.saved} error={sp.error} />

      <section>
        <h2 className="mb-3 text-lg font-bold">Danh mục sản phẩm</h2>
        <div className={`${ui.card} divide-y`}>
          {productCats.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 p-3">
              <form action={saveProductCategoryAction} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input name="name" defaultValue={c.name} required className={`${small} min-w-48 flex-1`} />
                <input name="slug" defaultValue={c.slug} required className={`${small} w-56`} title="Đường dẫn" />
                <input name="sort" type="number" defaultValue={c.sort} className={`${small} w-20`} title="Thứ tự" />
                <span className="w-20 text-xs text-gray-500">{c.n} sản phẩm</span>
                <button className={ui.secondary}>Lưu</button>
              </form>
              {c.n === 0 && (
                <form action={deleteProductCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton message={`Xoá danh mục "${c.name}"?`} className={ui.danger}>Xoá</ConfirmButton>
                </form>
              )}
            </div>
          ))}
          <form action={saveProductCategoryAction} className="flex flex-wrap items-center gap-2 bg-gray-50 p-3">
            <input type="hidden" name="id" value="0" />
            <input name="name" required placeholder="Tên danh mục mới" className={`${small} min-w-48 flex-1`} />
            <input name="slug" placeholder="Đường dẫn (tự tạo nếu trống)" className={`${small} w-56`} />
            <input name="sort" type="number" placeholder="Thứ tự" className={`${small} w-20`} />
            <button className={ui.primary}>+ Thêm</button>
          </form>
        </div>
        <p className="mt-2 text-xs text-gray-500">Thứ tự nhỏ hiện trước. Chỉ xoá được danh mục chưa có sản phẩm. Đổi đường dẫn sẽ đổi URL của mọi sản phẩm trong danh mục.</p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Chuyên mục bài viết</h2>
        <div className={`${ui.card} divide-y`}>
          {postCats.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 p-3">
              <form action={savePostCategoryAction} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <select name="section_slug" defaultValue={c.section_slug} className={`${small} w-40`}>
                  {sections.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                </select>
                <input name="name" defaultValue={c.name} required className={`${small} min-w-48 flex-1`} />
                <input name="slug" defaultValue={c.slug} required className={`${small} w-56`} />
                <span className="w-20 text-xs text-gray-500">{c.n} bài</span>
                <button className={ui.secondary}>Lưu</button>
              </form>
              {c.n === 0 && (
                <form action={deletePostCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton message={`Xoá chuyên mục "${c.name}"?`} className={ui.danger}>Xoá</ConfirmButton>
                </form>
              )}
            </div>
          ))}
          <form action={savePostCategoryAction} className="flex flex-wrap items-center gap-2 bg-gray-50 p-3">
            <input type="hidden" name="id" value="0" />
            <select name="section_slug" className={`${small} w-40`}>
              {sections.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
            <input name="name" required placeholder="Tên chuyên mục mới" className={`${small} min-w-48 flex-1`} />
            <input name="slug" placeholder="Đường dẫn (tự tạo nếu trống)" className={`${small} w-56`} />
            <button className={ui.primary}>+ Thêm</button>
          </form>
        </div>
      </section>
    </div>
  );
}
