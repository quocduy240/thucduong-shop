import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { getProductById, getProductCategories } from "@/lib/data";
import { deleteProductAction, saveProductAction } from "../../actions";

export const metadata = { title: "Sản phẩm | Quản trị" };

const input = "w-full rounded border px-3 py-2";
const label = "mb-1 block text-sm font-medium";

export default async function ProductEditPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id: rawId } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const id = rawId === "new" ? 0 : Number(rawId);
  if (rawId !== "new" && !Number.isInteger(id)) notFound();
  const p = id ? getProductById(id) : undefined;
  if (id && !p) notFound();
  const categories = getProductCategories();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/products/" className="text-sm text-gray-500 hover:underline">← Danh sách sản phẩm</Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">{p ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form action={saveProductAction} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="image" value={p?.image ?? ""} />
        <div>
          <label className={label}>Tên sản phẩm *</label>
          <input name="name" required defaultValue={p?.name} className={input} />
        </div>
        <div>
          <label className={label}>Đường dẫn (slug)</label>
          <input name="slug" defaultValue={p?.slug} placeholder="Để trống để tự tạo từ tên" className={input} />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className={label}>Danh mục *</label>
            <select name="category_id" required defaultValue={p?.category_id} className={input}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Giá (VNĐ) *</label>
            <input name="price" type="number" min={0} required defaultValue={p?.price} className={input} />
            <p className="mt-1 text-xs text-gray-500">Nhập 0 để hiện &quot;Liên hệ&quot;.</p>
          </div>
          <div>
            <label className={label}>Giá khuyến mãi</label>
            <input name="sale_price" type="number" min={1} defaultValue={p?.sale_price ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Tồn kho (số lượng) *</label>
            <input name="stock" type="number" min={0} required defaultValue={p?.stock ?? 100} className={input} />
            <p className="mt-1 text-xs text-gray-500">Nhập 0 là Hết hàng.</p>
          </div>
        </div>
        <div>
          <label className={label}>Ảnh sản phẩm</label>
          {p?.image && (
            <div className="mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt="" className="h-24 w-24 rounded border object-cover" />
              <label className="text-sm"><input type="checkbox" name="remove_image" value="1" /> Xoá ảnh này</label>
            </div>
          )}
          <input name="image_file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
          <p className="mt-1 text-xs text-gray-500">JPG, PNG, WEBP hoặc GIF, tối đa 10MB. Ảnh vuông hiển thị đẹp nhất.</p>
        </div>
        <div>
          <label className={label}>Mô tả ngắn</label>
          <textarea name="summary" rows={2} defaultValue={p?.summary} className={input} />
        </div>
        <div>
          <label className={label}>Giới thiệu chi tiết (HTML)</label>
          <textarea name="description" rows={10} defaultValue={p?.description} className={`${input} font-mono text-sm`} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" value="1" defaultChecked={!!p?.featured} /> Sản phẩm nổi bật (hiện lên đầu danh mục)
        </label>
        <button className="rounded bg-brand px-5 py-2 font-medium text-white hover:opacity-90">Lưu</button>
      </form>

      {p && (
        <form action={deleteProductAction} className="mt-10 border-t pt-6">
          <input type="hidden" name="id" value={p.id} />
          <ConfirmButton message="Xoá sản phẩm này cùng bình luận của nó? Không thể hoàn tác." className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50">Xoá sản phẩm này</ConfirmButton>
          <span className="ml-3 text-xs text-gray-500">Xoá luôn bình luận của sản phẩm. Không thể hoàn tác.</span>
        </form>
      )}
    </div>
  );
}

