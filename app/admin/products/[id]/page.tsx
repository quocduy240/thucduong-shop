import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ContentEditor from "@/components/admin/ContentEditor";
import CoverImageStudio from "@/components/admin/CoverImageStudio";
import ProductGalleryStudio from "@/components/admin/ProductGalleryStudio";
import { getProductById, getProductCategories, getProducts, url } from "@/lib/data";
import { deleteProductAction, saveProductAction } from "../../actions";

export const metadata = { title: "Sản phẩm | Quản trị" };

const input =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700";

export default async function ProductEditPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id: rawId } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const saved = sp.saved === "1";
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
    <div className="mx-auto max-w-6xl pb-20 space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-4 shadow-xs">
        <div>
          <Link href="/admin/products/" className="text-xs font-semibold text-gray-500 hover:text-brand hover:underline">
            ← Quay lại Danh sách sản phẩm
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-gray-900 md:text-2xl">
              {p ? `Sửa: ${p.name}` : "Thêm sản phẩm mới"}
            </h1>
            {p && (
              <>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    p.stock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                  }`}
                >
                  {p.stock > 0 ? `Còn ${p.stock}` : "Hết hàng"}
                </span>
                {Boolean(p.featured) && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                    ⭐ Nổi bật
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        {p && (
          <a
            href={url.product(p)}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-brand bg-green-50 px-4 py-2 text-xs font-bold text-brand hover:bg-brand hover:text-white transition"
          >
            👁️ Xem sản phẩm ngoài trang ↗
          </a>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
          ⚠️ {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800">
          ✓ Đã lưu thông tin sản phẩm thành công!
        </div>
      )}

      <form action={saveProductAction} className="space-y-6">
        <input type="hidden" name="id" value={id} />

        {/* Section 1: Core Identity (Highlighted Priority Card) */}
        <section className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
            <h2 className="text-sm font-extrabold text-brand">
              1. Thông tin Cốt lõi &amp; Nhận diện SEO
            </h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              Quan trọng nhất
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className={label}>
                Tên sản phẩm <span className="text-red-600">*</span>
              </label>
              <input
                name="name"
                required
                defaultValue={p?.name}
                placeholder="VD: Canh Dưỡng Sinh King Kung Hòa Tan (Hộp 60 gói)"
                className={`${input} border-emerald-300 text-base font-bold text-gray-900`}
              />
            </div>
            <div>
              <label className={label}>Đường dẫn URL (Slug)</label>
              <input
                name="slug"
                defaultValue={p?.slug}
                placeholder="Tự động tạo từ tên nếu để trống"
                className={`${input} font-mono text-xs text-gray-600`}
              />
            </div>
          </div>

          <div>
            <label className={label}>Mô tả ngắn (Tóm tắt nổi bật đầu trang &amp; SEO)</label>
            <textarea
              name="summary"
              rows={2}
              defaultValue={p?.summary}
              placeholder="Tóm tắt ngắn gọn công dụng nổi bật, thành phần chính và điểm khác biệt của sản phẩm..."
              className={input}
            />
          </div>
        </section>

        {/* Section 2: Pricing, Stock & Category (Highlighted Commerce Card) */}
        <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-2.5">
            <h2 className="text-sm font-extrabold text-amber-900">
              2. Giá bán, Danh mục &amp; Quản lý Tồn kho
            </h2>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100">
              <input type="checkbox" name="featured" value="1" defaultChecked={!!p?.featured} className="accent-brand" />
              <span>⭐ Sản phẩm nổi bật (ưu tiên đầu danh mục)</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={label}>
                Danh mục <span className="text-red-600">*</span>
              </label>
              <select name="category_id" required defaultValue={p?.category_id} className={`${input} font-semibold`}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>
                Giá gốc (VNĐ) <span className="text-red-600">*</span>
              </label>
              <input
                name="price"
                type="number"
                min={0}
                required
                defaultValue={p?.price}
                className={`${input} border-amber-300 text-base font-extrabold text-gray-900`}
              />
              <p className="mt-1 text-[11px] text-gray-500">Nhập 0 để hiển thị &quot;Liên hệ&quot;.</p>
            </div>
            <div>
              <label className={label}>Giá khuyến mãi (VNĐ)</label>
              <input
                name="sale_price"
                type="number"
                min={1}
                defaultValue={p?.sale_price ?? ""}
                placeholder="Để trống nếu không giảm"
                className={`${input} border-red-200 text-base font-extrabold text-accent`}
              />
              <p className="mt-1 text-[11px] text-gray-500">Phải nhỏ hơn Giá gốc.</p>
            </div>
            <div>
              <label className={label}>
                Tồn kho (Số lượng) <span className="text-red-600">*</span>
              </label>
              <input
                name="stock"
                type="number"
                min={0}
                required
                defaultValue={p?.stock ?? 100}
                className={`${input} text-base font-extrabold text-brand`}
              />
              <p className="mt-1 text-[11px] text-gray-500">Nhập 0 là Hết hàng.</p>
            </div>
          </div>
        </section>

        {/* Section 3: Product Specifications */}
        <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <h2 className="border-b pb-2.5 text-sm font-extrabold text-gray-800">
            3. Thuộc tính &amp; Nguồn gốc Sản phẩm
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={label}>🏷️ Mã sản phẩm (SKU)</label>
              <input name="sku" defaultValue={p?.sku ?? ""} placeholder="VD: PT-001" className={input} />
            </div>
            <div>
              <label className={label}>🏢 Thương hiệu</label>
              <input name="brand" defaultValue={p?.brand ?? ""} placeholder="VD: King Kung / Phúc Thọ" className={input} />
            </div>
            <div>
              <label className={label}>🌍 Xuất xứ</label>
              <input name="origin" defaultValue={p?.origin ?? ""} placeholder="VD: Đài Loan / Việt Nam" className={input} />
            </div>
            <div>
              <label className={label}>📦 Quy cách / Trọng lượng</label>
              <input name="unit" defaultValue={p?.unit ?? ""} placeholder="VD: Hộp 60 gói / Túi 500g" className={input} />
            </div>
          </div>
        </section>

        {/* Section 4: Media (Cover + Gallery + YouTube Video) */}
        <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-5">
          <h2 className="border-b pb-2.5 text-sm font-extrabold text-gray-800">
            4. Hình ảnh Sản phẩm, Bộ sưu tập Gallery &amp; Video
          </h2>
          <CoverImageStudio
            defaultCover={p?.image ?? ""}
            inputName="image"
            defaultPreset="800x800"
            label="🖼️ Ảnh đại diện chính sản phẩm & Tuỳ biến kích thước (Đa nguồn)"
          />
          <ProductGalleryStudio
            defaultGallery={p?.gallery ?? ""}
            productName={p?.name ?? ""}
          />
          <div>
            <label className={label}>🎬 Video giới thiệu sản phẩm (Link YouTube)</label>
            <input
              name="video_url"
              defaultValue={p?.video_url ?? ""}
              placeholder="VD: https://www.youtube.com/watch?v=... (Để trống nếu không có video)"
              className={input}
            />
          </div>
        </section>

        {/* Section 5: Rich Content Editor */}
        <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
          <div className="border-b pb-2.5">
            <h2 className="text-sm font-extrabold text-gray-800">
              5. Bài viết Giới thiệu Chi tiết Sản phẩm
            </h2>
            <p className="text-xs text-gray-500">
              Hỗ trợ kéo thả khối block, chèn QR/Video/Sản phẩm liên quan, nhập giọng nói và viết lại văn bản bằng AI.
            </p>
          </div>
          <ContentEditor
            name="description"
            defaultValue={p?.description ?? ""}
            products={products}
          />
        </section>

        {/* Sticky Bottom Save Bar */}
        <div className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white/95 px-5 py-3 shadow-lg backdrop-blur-sm">
          <span className="text-xs text-gray-500">
            Kiểm tra lại Tên, Giá bán và Hình ảnh trước khi lưu xuất bản.
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/products/"
              className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Huỷ / Quay lại
            </Link>
            <button className="rounded-xl bg-brand px-7 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark cursor-pointer">
              💾 Lưu Thông Tin Sản Phẩm
            </button>
          </div>
        </div>
      </form>

      {p && (
        <form action={deleteProductAction} className="rounded-2xl border border-red-200 bg-red-50/40 p-4 flex flex-wrap items-center justify-between gap-3">
          <input type="hidden" name="id" value={p.id} />
          <span className="text-xs text-red-700">
            Khu vực nguy hiểm: Xoá sản phẩm này sẽ xoá luôn toàn bộ bình luận liên quan và không thể hoàn tác.
          </span>
          <ConfirmButton
            message="Xoá sản phẩm này cùng bình luận của nó? Không thể hoàn tác."
            className="rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white transition"
          >
            🗑️ Xoá sản phẩm này
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
