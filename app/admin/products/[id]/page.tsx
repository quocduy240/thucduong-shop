import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ContentEditor from "@/components/admin/ContentEditor";
import CoverImageStudio from "@/components/admin/CoverImageStudio";
import { getProductById, getProductCategories, getProducts, url } from "@/lib/data";
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
  const [p, categories, productsRaw] = await Promise.all([
    id ? getProductById(id) : Promise.resolve(undefined),
    getProductCategories(),
    getProducts(200),
  ]);
  if (id && !p) notFound();

  const products = productsRaw.map((item) => ({
    ...item,
    href: url.product(item),
  }));

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/products/" className="text-sm text-gray-500 hover:underline">← Danh sách sản phẩm</Link>
        {p && (
          <a href={url.product(p)} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand hover:underline">
            Xem sản phẩm ngoài trang ↗
          </a>
        )}
      </div>
      <h1 className="mb-4 mt-2 text-2xl font-bold">{p ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form action={saveProductAction} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <input type="hidden" name="id" value={id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Tên sản phẩm *</label>
            <input name="name" required defaultValue={p?.name} className={input} />
          </div>
          <div>
            <label className={label}>Đường dẫn (slug)</label>
            <input name="slug" defaultValue={p?.slug} placeholder="Để trống để tự tạo từ tên" className={input} />
          </div>
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
        <div className="grid gap-4 rounded-lg border border-green-100 bg-green-50/40 p-4 sm:grid-cols-4">
          <div>
            <label className={label}>Mã sản phẩm (SKU)</label>
            <input name="sku" defaultValue={p?.sku ?? ""} placeholder="VD: PT-001" className={`${input} bg-white`} />
          </div>
          <div>
            <label className={label}>Thương hiệu</label>
            <input name="brand" defaultValue={p?.brand ?? ""} placeholder="VD: Tâm Minh Foods" className={`${input} bg-white`} />
          </div>
          <div>
            <label className={label}>Xuất xứ</label>
            <input name="origin" defaultValue={p?.origin ?? ""} placeholder="VD: Việt Nam / Nhật Bản" className={`${input} bg-white`} />
          </div>
          <div>
            <label className={label}>Quy cách / Trọng lượng</label>
            <input name="unit" defaultValue={p?.unit ?? ""} placeholder="VD: Gói 500g / Hộp 60 gói" className={`${input} bg-white`} />
          </div>
        </div>
        <CoverImageStudio
          defaultCover={p?.image ?? ""}
          inputName="image"
          defaultPreset="800x800"
          label="🖼️ Ảnh đại diện sản phẩm & Tuỳ biến kích thước (Đa nguồn)"
        />
        <div>
          <label className={label}>Bộ sưu tập ảnh phụ (Gallery)</label>
          {p?.gallery && (
            <div className="mb-2 flex flex-wrap gap-2">
              {p.gallery.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).map((imgUrl, idx) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={idx} src={imgUrl} alt="" className="h-14 w-14 rounded border object-cover" />
              ))}
            </div>
          )}
          <input name="gallery_files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="mb-2 text-sm" />
          <textarea
            name="gallery"
            rows={2}
            defaultValue={p?.gallery ?? ""}
            placeholder="Hoặc dán mỗi dòng 1 URL ảnh phụ (xoá dòng để gỡ ảnh phụ)..."
            className={`${input} text-xs`}
          />
        </div>
        <div>
          <label className={label}>Video giới thiệu (Link YouTube)</label>
          <input
            name="video_url"
            defaultValue={p?.video_url ?? ""}
            placeholder="VD: https://www.youtube.com/watch?v=... (Để trống nếu không có video)"
            className={input}
          />
        </div>
        <div>
          <label className={label}>Mô tả ngắn</label>
          <textarea name="summary" rows={2} defaultValue={p?.summary} className={input} />
        </div>
        <div>
          <label className={label}>Giới thiệu chi tiết (Trình soạn thảo chuyên nghiệp)</label>
          <ContentEditor
            name="description"
            defaultValue={p?.description ?? ""}
            products={products}
          />
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

