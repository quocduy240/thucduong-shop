import CategoryDeleteControl from "@/components/admin/CategoryDeleteControl";
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
                <input name="slug" defaultValue={c.slug} required className={`${small} w-48`} title="Đường dẫn" />
                <input name="sort" type="number" defaultValue={c.sort} className={`${small} w-16`} title="Thứ tự" />
                <label className="flex cursor-pointer items-center gap-1 text-xs font-medium text-gray-700" title="Bật/tắt hiển thị danh mục này trong dropdown menu Sản phẩm">
                  <input
                    type="checkbox"
                    name="show_in_menu"
                    value="1"
                    defaultChecked={c.show_in_menu !== 0}
                    className="h-3.5 w-3.5 accent-brand"
                  />
                  <span>Hiện Menu</span>
                </label>
                <span className="w-16 text-xs text-gray-500">{c.n} SP</span>
                <button className={ui.secondary}>Lưu</button>
              </form>
              <CategoryDeleteControl
                categoryId={c.id}
                categoryName={c.name}
                itemCount={c.n}
                itemLabel="sản phẩm"
                targets={productCats.map((item) => ({ id: item.id, name: item.name }))}
                allowUnassigned={c.slug !== "chua-phan-loai"}
                action={deleteProductCategoryAction}
              />
            </div>
          ))}
          <form action={saveProductCategoryAction} className="flex flex-wrap items-center gap-2 bg-gray-50 p-3">
            <input type="hidden" name="id" value="0" />
            <input name="name" required placeholder="Tên danh mục mới" className={`${small} min-w-48 flex-1`} />
            <input name="slug" placeholder="Đường dẫn (tự tạo nếu trống)" className={`${small} w-48`} />
            <input name="sort" type="number" placeholder="Thứ tự" className={`${small} w-16`} />
            <label className="flex cursor-pointer items-center gap-1 text-xs font-medium text-gray-700">
              <input type="checkbox" name="show_in_menu" value="1" defaultChecked className="h-3.5 w-3.5 accent-brand" />
              <span>Hiện Menu</span>
            </label>
            <button className={ui.primary}>+ Thêm</button>
          </form>
        </div>
        <p className="mt-2 text-xs text-gray-500">Thứ tự nhỏ hiện trước. Khi xoá danh mục đang có sản phẩm, chọn danh mục đích (hoặc &quot;? Chưa phân loại&quot;) để tự động chuyển toàn bộ sản phẩm sang trước khi xoá. Đổi đường dẫn sẽ đổi URL của mọi sản phẩm trong danh mục.</p>
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
              <CategoryDeleteControl
                categoryId={c.id}
                categoryName={c.name}
                itemCount={c.n}
                itemLabel="bài viết"
                targets={postCats.map((item) => ({ id: item.id, name: item.name }))}
                allowUnassigned={c.slug !== "chua-phan-loai"}
                action={deletePostCategoryAction}
              />
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
