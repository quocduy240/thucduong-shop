import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPath } from "@/lib/auth";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ContentEditor from "@/components/admin/ContentEditor";
import CoverImageStudio from "@/components/admin/CoverImageStudio";
import ProductEditTabs from "@/components/admin/ProductEditTabs";
import ProductGalleryStudio from "@/components/admin/ProductGalleryStudio";
import ProductSourceNoteBanner from "@/components/admin/ProductSourceNoteBanner";
import SeoPanel from "@/components/admin/SeoPanel";
import { getAdminProductExtra, listProductMovements } from "@/lib/admin-data";
import { getProductById, getProductCategories, url } from "@/lib/data";
import { listSuppliers } from "@/lib/retail-ops";
import { getSeoFields } from "@/lib/seo";
import { vnd } from "@/lib/site";
import { adjustProductInventoryAction, deleteProductAction, saveProductAction } from "../../actions";

export const metadata = { title: "Sản phẩm | Quản trị" };

const input =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700";

const REASON_LABELS: Record<string, { text: string; badge: string }> = {
  import: { text: "Nhập hàng", badge: "bg-emerald-100 text-emerald-800" },
  stocktake: { text: "Kiểm kho", badge: "bg-blue-100 text-blue-800" },
  sale: { text: "Bán hàng", badge: "bg-amber-100 text-amber-800" },
  cancel: { text: "Trả hàng / Hoàn kho", badge: "bg-purple-100 text-purple-800" },
  internal_use: { text: "Xuất dùng nội bộ", badge: "bg-cyan-100 text-cyan-800" },
  damage: { text: "Xuất hủy", badge: "bg-red-100 text-red-800" },
  kiotviet_sync: { text: "Đồng bộ KiotViet", badge: "bg-indigo-100 text-indigo-800" },
};

export default async function ProductEditPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireAdminPath("/admin/products/");
  const { id: rawId } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const saved = sp.saved === "1";
  const id = rawId === "new" ? 0 : Number(rawId);
  if (rawId !== "new" && !Number.isInteger(id)) notFound();

  const [p, categories, extra, movements, seo, suppliers] = await Promise.all([
    id ? getProductById(id) : Promise.resolve(undefined),
    getProductCategories(),
    id ? getAdminProductExtra(id) : Promise.resolve(undefined),
    id ? listProductMovements(id, 50) : Promise.resolve([]),
    id ? getSeoFields("products", id) : Promise.resolve({ seo_title: "", seo_description: "", seo_keywords: "" }),
    listSuppliers().catch(() => []),
  ]);
  if (id && !p) notFound();

  const costPrice = extra?.cost_price ?? 0;
  const contactOnly = Boolean(p?.contact_only || extra?.contact_only);
  const effPrice = p ? (p.sale_price ?? p.price) : 0;
  const profit = effPrice > 0 && costPrice > 0 ? effPrice - costPrice : null;
  const marginPct = profit !== null && effPrice > 0 ? Math.round((profit / effPrice) * 100) : null;
  const reserved = extra?.customer_reserved ?? 0;
  const availableStock = p ? Math.max(0, p.stock - reserved) : 0;
  const belowMin = p ? p.stock <= (extra?.min_stock ?? 0) : false;

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
                    p.stock <= 0
                      ? "bg-red-100 text-red-700"
                      : belowMin
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {p.stock > 0 ? `Tồn: ${p.stock}` : "Hết hàng"}
                  {reserved > 0 ? ` · KH đặt: ${reserved}` : ""}
                </span>
                {extra?.kv_code && (
                  <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-mono font-bold text-indigo-700">
                    KV: {extra.kv_code}
                  </span>
                )}
                {Boolean(p.featured) && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                    ⭐ Nổi bật
                  </span>
                )}
                {contactOnly && (
                  <span className="rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
                    📞 Web hiển thị: Liên hệ (Giữ giá Backend)
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

      {p && (extra?.source_url || extra?.source_note) && (
        <ProductSourceNoteBanner
          productId={p.id}
          sourceUrl={extra.source_url}
          sourceNote={extra.source_note}
        />
      )}

      {/* Standalone form for Tab 4 Stock Card adjustments (avoids nested HTML <form>) */}
      {p && (
        <form id="inv-adjust" action={adjustProductInventoryAction}>
          <input type="hidden" name="id" value={p.id} />
        </form>
      )}

      <form action={saveProductAction} className="space-y-6">
        <input type="hidden" name="id" value={id} />

        <ProductEditTabs
          isNew={!p}
          productUrl={p ? url.product(p) : undefined}
          checks={{
            hasBasic: Boolean(p?.name?.trim() && p?.category_id),
            hasPrice: Boolean(p && p.price > 0),
            hasMedia: Boolean(p?.image?.trim()),
            hasDescription: Boolean(p?.description && p.description.replace(/<[^>]+>/g, "").trim().length > 20),
          }}
          basicTab={
            <>
              {/* Section 1: Core Identity */}
              <section className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-brand">
                    1. Thông tin Cốt lõi &amp; Định danh
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
                  <label className={label}>Mô tả ngắn / Ghi chú đặt hàng</label>
                  <textarea
                    name="summary"
                    rows={2}
                    defaultValue={p?.summary}
                    placeholder="Tóm tắt ngắn gọn công dụng nổi bật, thành phần chính hoặc ghi chú đặt hàng..."
                    className={input}
                  />
                </div>
              </section>

              {/* Section 2: Pricing, Cost, Stock & Limits (KiotViet style) */}
              <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-white p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-amber-900">
                    2. Giá bán, Giá vốn, Danh mục &amp; Định mức Tồn kho
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-green-300 bg-green-50 px-3.5 py-1 text-xs font-bold text-green-900 hover:bg-green-100">
                      <input type="checkbox" name="is_published" value="1" defaultChecked={p ? !!p.is_published : true} className="accent-brand" />
                      <span>🌐 Công khai</span>
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100">
                      <input type="checkbox" name="featured" value="1" defaultChecked={!!p?.featured} className="accent-brand" />
                      <span>⭐ Nổi bật</span>
                    </label>
                    <label
                      title="Khi bật: ngoài trang khách hiển thị 'Liên hệ', không cho bấm thêm giỏ hàng, nhưng trong Admin & POS vẫn giữ nguyên Giá bán và Giá vốn"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-purple-300 bg-purple-50 px-3.5 py-1 text-xs font-bold text-purple-900 hover:bg-purple-100"
                    >
                      <input type="checkbox" name="contact_only" value="1" defaultChecked={contactOnly} className="accent-purple-700" />
                      <span>📞 Hiện &quot;Liên hệ&quot; ngoài Web (Giữ giá Backend/POS)</span>
                    </label>
                  </div>
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
                      Giá vốn (VNĐ)
                    </label>
                    <input
                      name="cost_price"
                      type="number"
                      min={0}
                      defaultValue={costPrice}
                      className={`${input} font-bold text-gray-800`}
                    />
                    {profit !== null && (
                      <p className={`mt-1 text-[11px] font-semibold ${profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        Lãi gộp: {vnd(profit)} ({marginPct}%)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={label}>
                      Giá bán gốc (VNĐ) <span className="text-red-600">*</span>
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
                </div>

                <div className="grid gap-4 sm:grid-cols-3 pt-1">
                  <div>
                    <label className={label}>
                      Tồn kho hiện tại <span className="text-red-600">*</span>
                    </label>
                    <input
                      name="stock"
                      type="number"
                      min={0}
                      required
                      defaultValue={p?.stock ?? 0}
                      className={`${input} text-base font-extrabold text-brand`}
                    />
                    <p className="mt-1 text-[11px] text-gray-500">Đổi số này sẽ tự động ghi 1 dòng vào Thẻ kho.</p>
                  </div>
                  <div>
                    <label className={label}>Định mức tồn ít nhất</label>
                    <input
                      name="min_stock"
                      type="number"
                      min={0}
                      defaultValue={extra?.min_stock ?? 0}
                      className={input}
                    />
                    <p className="mt-1 text-[11px] text-gray-500">Cảnh báo đỏ khi tồn ≤ mức này.</p>
                  </div>
                  <div>
                    <label className={label}>Định mức tồn nhiều nhất</label>
                    <input
                      name="max_stock"
                      type="number"
                      min={0}
                      defaultValue={extra?.max_stock ?? 999999999}
                      className={input}
                    />
                  </div>
                </div>
              </section>

              {/* Section 3: Product Specifications (KiotViet attributes) */}
              <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
                <h2 className="border-b pb-2.5 text-sm font-extrabold text-gray-800">
                  3. Mã hàng, Thuộc tính, Vị trí &amp; Nhà cung cấp
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={label}>🏷️ Mã hàng (SKU)</label>
                    <input name="sku" defaultValue={p?.sku ?? ""} placeholder="VD: SP000525" className={`${input} font-mono`} />
                  </div>
                  <div>
                    <label className={label}>🔗 Mã đồng bộ KiotViet</label>
                    <input name="kv_code" defaultValue={extra?.kv_code ?? ""} placeholder="VD: SP000525" className={`${input} font-mono`} />
                  </div>
                  <div>
                    <label className={label}>📊 Mã vạch (Barcode)</label>
                    <input name="barcode" defaultValue={extra?.barcode ?? ""} placeholder="VD: 8936117520259" className={`${input} font-mono`} />
                  </div>
                  <div>
                    <label className={label}>⚖️ Trọng lượng (gram)</label>
                    <input name="weight_grams" type="number" min={0} defaultValue={extra?.weight_grams ?? 0} placeholder="VD: 500" className={input} />
                  </div>
                  <div>
                    <label className={label}>🏢 Thương hiệu</label>
                    <input name="brand" defaultValue={p?.brand ?? ""} placeholder="VD: King Kung / C'Lavie" className={input} />
                  </div>
                  <div>
                    <label className={label}>🌍 Xuất xứ</label>
                    <input name="origin" defaultValue={p?.origin ?? ""} placeholder="VD: Đài Loan / Mỹ / Việt Nam" className={input} />
                  </div>
                  <div>
                    <label className={label}>📦 Đơn vị tính (ĐVT)</label>
                    <input name="unit" defaultValue={p?.unit ?? ""} placeholder="VD: Hộp / Gói / Chai / Túi" className={input} />
                  </div>
                  <div>
                    <label className={label}>📍 Vị trí kho / kệ</label>
                    <input name="location" defaultValue={extra?.location ?? ""} placeholder="VD: Kệ A2, Kho lạnh..." className={input} />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className={label}>🚚 Nhà cung cấp mặc định (chọn hoặc gõ mới — quản lý tại Kho &amp; Sổ quỹ → Nhà cung cấp)</label>
                    <input
                      name="supplier"
                      list="supplier-suggestions"
                      defaultValue={extra?.supplier ?? ""}
                      placeholder="VD: AMAZON-VIETXPRESS, Tâm Minh Foods, C'Lavie..."
                      className={input}
                    />
                    <datalist id="supplier-suggestions">
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.code} {s.phone ? `(${s.phone})` : ""}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>
              </section>
            </>
          }
          mediaTab={
            <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-5">
              <h2 className="border-b pb-2.5 text-sm font-extrabold text-gray-800">
                Hình ảnh Sản phẩm, Bộ sưu tập Gallery &amp; Video
              </h2>
              <CoverImageStudio
                defaultCover={p?.image ?? ""}
                inputName="image"
                defaultPreset="800x800"
                label="🖼️ Ảnh đại diện chính sản phẩm & Tuỳ biến kích thước (Đa nguồn)"
                allowTextBanner={false}
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
          }
          contentTab={
            <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
              <div className="border-b pb-2.5">
                <h2 className="text-sm font-extrabold text-gray-800">
                  Mô tả Chi tiết Sản phẩm &amp; Trợ lý AI
                </h2>
                <p className="text-xs text-gray-500">
                  Giao diện soạn thảo tinh gọn: dùng thanh công cụ cơ bản ở trên hoặc bấm &quot;+ Công cụ nâng cao&quot; khi cần chèn bảng, video hay block sản phẩm.
                </p>
              </div>
              <ContentEditor
                name="description"
                defaultValue={p?.description ?? ""}
                sourceUrl={extra?.source_url ?? ""}
                enableProductAiRewrite
                variant="product"
              />
            </section>
          }
          stockCardTab={
            <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900">📋 Thẻ kho (Lịch sử xuất / nhập / kiểm kho)</h2>
                  <p className="text-xs text-gray-500">
                    Ghi nhận tự động mọi biến động tồn kho khi bán hàng, hoàn đơn, nhập hàng, kiểm kho và đồng bộ KiotViet.
                  </p>
                </div>
                <Link href="/admin/inventory/" className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  📦 Xem toàn bộ Sổ kho →
                </Link>
              </div>

              {p ? (
                <>
                  {/* Quick Stock In / Stocktake Form (binds to external #inv-adjust form) */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                    <div className="text-xs font-extrabold text-emerald-900">⚡ Tạo phiếu Nhập kho / Kiểm kho nhanh</div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div>
                        <label className={label}>Loại giao dịch</label>
                        <select form="inv-adjust" name="mode" defaultValue="import" className={input}>
                          <option value="import">➕ Nhập hàng (+SL)</option>
                          <option value="stocktake">⚖️ Kiểm kho (Đặt tồn mới)</option>
                          <option value="internal_use">📤 Xuất dùng nội bộ (-SL)</option>
                          <option value="damage">🗑️ Xuất hủy hàng hỏng (-SL)</option>
                        </select>
                      </div>
                      <div>
                        <label className={label}>Số lượng</label>
                        <input form="inv-adjust" name="qty" type="number" required defaultValue={1} className={input} />
                      </div>
                      <div>
                        <label className={label}>Giá vốn nhập (VNĐ)</label>
                        <input form="inv-adjust" name="unit_cost" type="number" min={0} defaultValue={costPrice} className={input} />
                      </div>
                      <div>
                        <label className={label}>Mã chứng từ</label>
                        <input form="inv-adjust" name="ref_code" placeholder="VD: PN000155" className={`${input} font-mono`} />
                      </div>
                      <div>
                        <label className={label}>Đối tác / Ghi chú</label>
                        <input form="inv-adjust" name="note" placeholder="VD: Nhập lô mới NCC" className={input} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
                        <input form="inv-adjust" type="checkbox" name="update_cost" value="1" defaultChecked className="accent-brand" />
                        <span>Cập nhật luôn Giá vốn sản phẩm theo giá nhập này</span>
                      </label>
                      <button
                        type="submit"
                        form="inv-adjust"
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer"
                      >
                        ✓ Ghi nhận vào Thẻ kho
                      </button>
                    </div>
                  </div>

                  {/* Movements Table (8 columns KiotViet-style) */}
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="p-2.5">Chứng từ</th>
                          <th className="p-2.5">Thời gian</th>
                          <th className="p-2.5">Loại giao dịch</th>
                          <th className="p-2.5 text-right">Giá vốn</th>
                          <th className="p-2.5 text-right">Số lượng</th>
                          <th className="p-2.5 text-right">Tồn cuối</th>
                          <th className="p-2.5">Đối tác / Ghi chú</th>
                          <th className="p-2.5">Người tạo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {movements.map((m) => {
                          const meta = REASON_LABELS[m.reason] ?? { text: m.reason, badge: "bg-gray-100 text-gray-700" };
                          return (
                            <tr key={m.id} className="hover:bg-gray-50/70">
                              <td className="p-2.5 font-mono font-semibold text-gray-800">{m.ref_code || `#${m.id}`}</td>
                              <td className="p-2.5 whitespace-nowrap text-gray-500">{m.created_at}</td>
                              <td className="p-2.5">
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                                  {meta.text}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-mono">{m.unit_cost ? vnd(m.unit_cost) : "—"}</td>
                              <td className={`p-2.5 text-right font-bold ${m.change_qty > 0 ? "text-emerald-700" : m.change_qty < 0 ? "text-red-600" : "text-gray-600"}`}>
                                {m.change_qty > 0 ? `+${m.change_qty}` : m.change_qty}
                              </td>
                              <td className="p-2.5 text-right font-bold text-gray-900">{m.stock_after}</td>
                              <td className="p-2.5 text-gray-700">{m.note || "—"}</td>
                              <td className="p-2.5 text-gray-500">{m.created_by || "system"}</td>
                            </tr>
                          );
                        })}
                        {movements.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-gray-500">
                              Chưa có giao dịch kho nào cho sản phẩm này. Mọi lần nhập/kiểm kho, đặt hàng hoặc đồng bộ KiotViet sẽ hiển thị tại đây.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-gray-500">
                  Hãy lưu sản phẩm mới trước để bắt đầu theo dõi Thẻ kho.
                </div>
              )}
            </section>
          }
          inventoryTab={
            <div className="space-y-5">
              {/* Inventory & KiotViet Sync Overview */}
              <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-gray-900">📊 Tổng quan Tồn kho &amp; Đồng bộ KiotViet</h2>
                    <p className="text-xs text-gray-500">
                      Theo dõi tồn kho thực tế, số lượng khách đang đặt trên website và trạng thái ghép mã KiotViet.
                    </p>
                  </div>
                  <Link href="/admin/kiotviet/" className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                    🔗 Trang Đồng bộ KiotViet →
                  </Link>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border bg-gray-50 p-3.5">
                    <div className="text-[11px] font-bold uppercase text-gray-500">Tồn kho hiện tại</div>
                    <div className={`mt-1 text-2xl font-extrabold ${p && p.stock <= 0 ? "text-red-600" : "text-gray-900"}`}>
                      {p?.stock ?? 0}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Định mức: {extra?.min_stock ?? 0} – {(extra?.max_stock ?? 999999999).toLocaleString("vi-VN")}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-amber-50/50 p-3.5">
                    <div className="text-[11px] font-bold uppercase text-amber-800">KH đang đặt (Đơn chờ)</div>
                    <div className="mt-1 text-2xl font-extrabold text-amber-900">{reserved}</div>
                    <div className="text-[11px] text-amber-700">Đơn mới / đã xác nhận / đang giao</div>
                  </div>
                  <div className="rounded-xl border bg-emerald-50/50 p-3.5">
                    <div className="text-[11px] font-bold uppercase text-emerald-800">Tồn khả dụng</div>
                    <div className="mt-1 text-2xl font-extrabold text-emerald-900">{availableStock}</div>
                    <div className="text-[11px] text-emerald-700">Tồn kho trừ KH đang đặt</div>
                  </div>
                  <div className="rounded-xl border bg-indigo-50/50 p-3.5">
                    <div className="text-[11px] font-bold uppercase text-indigo-800">Đồng bộ KiotViet</div>
                    <div className="mt-1 text-base font-extrabold font-mono text-indigo-900">
                      {extra?.kv_code || "Chưa ghép"}
                    </div>
                    <div className="text-[11px] text-indigo-700">
                      {extra?.kv_updated_at ? `Sync: ${extra.kv_updated_at}` : "Chưa có lịch sử sync"}
                    </div>
                  </div>
                </div>
              </section>

              {/* SEO Google Panel */}
              <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <SeoPanel
                  entityType="product"
                  defaultSeoTitle={seo.seo_title}
                  defaultSeoDescription={seo.seo_description}
                  defaultSeoKeywords={seo.seo_keywords}
                  titleFieldName="name"
                  summaryFieldName="summary"
                  imageFieldName="image"
                  defaultTitle={p?.name ?? ""}
                  defaultSummary={p?.summary ?? ""}
                  defaultSlug={p?.slug ?? ""}
                  defaultImage={p?.image ?? ""}
                  urlPrefix={`https://thucduongshop.duyvo.win/san-pham/${p?.category_slug || "danh-muc"}/`}
                />
              </section>
            </div>
          }
        />
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
