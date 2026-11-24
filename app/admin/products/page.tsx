import Link from "next/link";
import KiotVietProductsTable from "@/components/admin/KiotVietProductsTable";
import { Flash, Pagination, pageParam, strParam, ui } from "@/components/admin/ui";
import { listProductCategoriesWithCount, listProducts } from "@/lib/admin-data";
import { requireAdminPath } from "@/lib/auth";
import { bulkProductsAction } from "../actions";

export const metadata = { title: "Hàng hóa & Thiết lập giá (Chuẩn KiotViet) | Quản trị" };

export default async function ProductsAdmin({ searchParams }: PageProps<"/admin/products">) {
  await requireAdminPath("/admin/products/");
  const sp = await searchParams;
  const q = strParam(sp.q);
  const category = Number(strParam(sp.category)) || 0;
  const stock = strParam(sp.stock);
  const status = strParam(sp.status);
  const supplier = strParam(sp.supplier);
  const brand = strParam(sp.brand);
  const location = strParam(sp.location);
  const viewMode = strParam(sp.view) === "pricebook" ? "pricebook" : "list";
  const page = pageParam(sp.page);

  const [{ rows, total, summary, facets }, categories] = await Promise.all([
    listProducts({ q, category, stock, status, supplier, brand, location, page }),
    listProductCategoriesWithCount(),
  ]);

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: q || undefined,
      category: category ? String(category) : undefined,
      stock: stock || undefined,
      status: status || undefined,
      supplier: supplier || undefined,
      brand: brand || undefined,
      location: location || undefined,
      view: viewMode === "pricebook" ? "pricebook" : undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/admin/products/?${qs}` : "/admin/products/";
  }

  const returnTo = buildHref({ page: page > 1 ? String(page) : undefined, saved: "1" });
  const hasFilters = Boolean(q || category || stock || status || supplier || brand || location);

  return (
    <div className="mx-auto max-w-7xl pb-12 space-y-4">
      {/* KiotViet Top Sub-header Bar: Title + Search + Mega-Dropdown Shortcuts + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-900">
            {viewMode === "pricebook" ? "💰 Thiết lập giá (#/PriceBook)" : "📦 Danh sách hàng hóa (#/Products)"}
          </h1>
          {/* Quick Search Bar right next to title (KiotViet style) */}
          <form method="get" action="/admin/products/" className="flex items-center gap-1.5">
            {category ? <input type="hidden" name="category" value={category} /> : null}
            {stock ? <input type="hidden" name="stock" value={stock} /> : null}
            {status ? <input type="hidden" name="status" value={status} /> : null}
            {supplier ? <input type="hidden" name="supplier" value={supplier} /> : null}
            {brand ? <input type="hidden" name="brand" value={brand} /> : null}
            {location ? <input type="hidden" name="location" value={location} /> : null}
            {viewMode === "pricebook" ? <input type="hidden" name="view" value="pricebook" /> : null}
            <input
              name="q"
              defaultValue={q}
              placeholder="🔍 Theo mã hàng, tên hàng, mã vạch..."
              className="w-64 rounded-xl border border-gray-300 px-3 py-1.5 text-xs focus:border-brand focus:outline-none"
            />
            <button className="rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark cursor-pointer">
              Tìm
            </button>
            {hasFilters && (
              <Link
                href={viewMode === "pricebook" ? "/admin/products/?view=pricebook" : "/admin/products/"}
                className="rounded-xl border px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                Bỏ lọc
              </Link>
            )}
          </form>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/products/new/" className="rounded-xl bg-brand px-3.5 py-2 text-xs font-extrabold text-white hover:bg-brand-dark">
            + Tạo mới hàng hóa
          </Link>
          <Link href="/admin/kiotviet/" className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100">
            📥 Import Excel KiotViet
          </Link>
          <Link href="/admin/products/import/" className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            🌐 Nhập từ Link
          </Link>
        </div>
      </div>

      {/* KiotViet "Hàng hóa" Mega-Menu Navigation Bar (2 groups: Hàng hóa & Kho hàng) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 px-3.5 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-extrabold uppercase text-brand mr-1">Menu Hàng hóa:</span>
          <Link
            href={buildHref({ view: undefined, page: undefined })}
            className={`rounded-lg px-3 py-1.5 font-bold transition ${
              viewMode === "list" ? "bg-brand text-white shadow-2xs" : "bg-white text-gray-700 border hover:border-brand"
            }`}
          >
            📦 Danh sách hàng hóa
          </Link>
          <Link
            href={buildHref({ view: "pricebook", page: undefined })}
            className={`rounded-lg px-3 py-1.5 font-bold transition ${
              viewMode === "pricebook" ? "bg-amber-600 text-white shadow-2xs" : "bg-white text-gray-700 border hover:border-amber-500"
            }`}
          >
            💰 Thiết lập giá (#/PriceBook)
          </Link>
          <span className="mx-1 text-gray-300">|</span>
          <span className="font-extrabold uppercase text-gray-600 mr-1">Kho hàng:</span>
          <Link
            href="/admin/inventory/?tab=stock"
            className="rounded-lg border bg-white px-2.5 py-1.5 font-semibold text-gray-700 hover:border-brand hover:text-brand"
          >
            📋 Kiểm kho (#/StockTakes)
          </Link>
          <Link
            href="/admin/inventory/?tab=import"
            className="rounded-lg border bg-white px-2.5 py-1.5 font-semibold text-gray-700 hover:border-brand hover:text-brand"
          >
            📥 Nhập hàng &amp; Xuất nội bộ / Xuất hủy
          </Link>
        </div>
      </div>

      <Flash saved={sp.saved} error={sp.error} />

      {/* Main KiotViet 2-Column Layout: Left Filter Sidebar (.col-left) + Right Data Table */}
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* LEFT SIDEBAR FILTERS (Chuẩn KiotViet .col-left) */}
        <aside className="space-y-3">
          {/* Card 1: Nhóm hàng (Tree-view with counts & quick edit link) */}
          <div className="rounded-2xl border bg-white p-3.5 shadow-2xs">
            <div className="mb-2 flex items-center justify-between border-b pb-1.5">
              <span className="text-xs font-extrabold uppercase text-gray-800">Nhóm hàng</span>
              <Link href="/admin/categories/" className="text-[11px] font-bold text-brand hover:underline">
                + Tạo / Sửa
              </Link>
            </div>
            <div className="max-h-56 space-y-0.5 overflow-y-auto pr-1 text-xs">
              <Link
                href={buildHref({ category: undefined, page: undefined })}
                className={`flex items-center justify-between rounded-lg px-2 py-1.5 font-semibold ${
                  !category ? "bg-brand text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>Tất cả nhóm hàng</span>
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={buildHref({ category: String(c.id), page: undefined })}
                  className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
                    category === c.id ? "bg-brand text-white font-bold" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  <span className={`ml-1 rounded-full px-1.5 text-[10px] ${category === c.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
                    {c.n}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Card 2: Tồn kho */}
          <div className="rounded-2xl border bg-white p-3.5 shadow-2xs">
            <div className="mb-2 border-b pb-1.5 text-xs font-extrabold uppercase text-gray-800">
              Tồn kho
            </div>
            <div className="space-y-1 text-xs">
              {[
                { key: "", label: "Tất cả" },
                { key: "in", label: "✓ Còn hàng trong kho (> 0)" },
                { key: "below_min", label: "⚠️ Dưới định mức tồn" },
                { key: "low", label: "⏳ Sắp hết hàng (1 – 5)" },
                { key: "out", label: "❌ Hết hàng trong kho (0)" },
              ].map((st) => (
                <Link
                  key={st.key}
                  href={buildHref({ stock: st.key || undefined, page: undefined })}
                  className={`block rounded-lg px-2.5 py-1.5 ${
                    stock === st.key ? "bg-emerald-100 font-bold text-brand" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {st.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Card 3: Trạng thái & Hiển thị giá Web */}
          <div className="rounded-2xl border bg-white p-3.5 shadow-2xs">
            <div className="mb-2 border-b pb-1.5 text-xs font-extrabold uppercase text-gray-800">
              Trạng thái &amp; Liên kết Web
            </div>
            <div className="space-y-1 text-xs">
              {[
                { key: "", label: "Tất cả trạng thái" },
                { key: "published", label: "🌐 Hàng đang kinh doanh (Hiện Web)" },
                { key: "hidden", label: "🙈 Hàng ngừng KD (Đang ẩn)" },
                { key: "contact_only", label: "📞 Hiện 'Liên hệ' ngoài Web" },
              ].map(( item ) => (
                <Link
                  key={item.key}
                  href={buildHref({ status: item.key || undefined, page: undefined })}
                  className={`block rounded-lg px-2.5 py-1.5 ${
                    status === item.key ? "bg-emerald-100 font-bold text-brand" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Card 4: Nhà cung cấp, Thương hiệu, Vị trí */}
          <form method="get" action="/admin/products/" className="rounded-2xl border bg-white p-3.5 shadow-2xs space-y-2.5 text-xs">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            {category ? <input type="hidden" name="category" value={category} /> : null}
            {stock ? <input type="hidden" name="stock" value={stock} /> : null}
            {status ? <input type="hidden" name="status" value={status} /> : null}
            {viewMode === "pricebook" ? <input type="hidden" name="view" value="pricebook" /> : null}

            <div className="border-b pb-1.5 font-extrabold uppercase text-gray-800">
              Đối tác &amp; Thuộc tính
            </div>

            <div>
              <label className="mb-1 block font-bold text-gray-600">Nhà cung cấp</label>
              <select name="supplier" defaultValue={supplier} className="w-full rounded-lg border px-2 py-1.5 text-xs">
                <option value="">-- Tất cả Nhà cung cấp --</option>
                {facets.suppliers.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.v} ({s.n})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-bold text-gray-600">Thương hiệu</label>
              <select name="brand" defaultValue={brand} className="w-full rounded-lg border px-2 py-1.5 text-xs">
                <option value="">-- Tất cả Thương hiệu --</option>
                {facets.brands.map((b) => (
                  <option key={b.v} value={b.v}>
                    {b.v} ({b.n})
                  </option>
                ))}
              </select>
            </div>

            {facets.locations.length > 0 && (
              <div>
                <label className="mb-1 block font-bold text-gray-600">Vị trí kệ</label>
                <select name="location" defaultValue={location} className="w-full rounded-lg border px-2 py-1.5 text-xs">
                  <option value="">-- Tất cả Vị trí --</option>
                  {facets.locations.map((l) => (
                    <option key={l.v} value={l.v}>
                      {l.v} ({l.n})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button className="w-full rounded-lg bg-brand py-1.5 font-bold text-white hover:bg-brand-dark cursor-pointer">
              Áp dụng bộ lọc
            </button>
          </form>
        </aside>

        {/* RIGHT MAIN AREA: Bulk Action Bar + KiotViet Table + Pagination */}
        <div className="min-w-0 space-y-3">
          <form
            id="bulk"
            action={bulkProductsAction}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 text-xs"
          >
            <input type="hidden" name="return_to" value={returnTo} />
            <span className="font-bold text-blue-900">⚡ Thao tác hàng loạt (tick SP bên dưới):</span>
            <select name="category_id" defaultValue="" className={`${ui.input} max-w-[190px] py-1 text-xs`}>
              <option value="">— Chuyển nhóm hàng —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select name="visibility" defaultValue="" className={`${ui.input} max-w-[170px] py-1 text-xs`}>
              <option value="">— Trạng thái KD —</option>
              <option value="publish">🌐 Cho phép KD (Hiện Web)</option>
              <option value="hide">🙈 Ngừng KD (Ẩn Web)</option>
            </select>
            <select name="price_display" defaultValue="" className={`${ui.input} max-w-[195px] py-1 text-xs`}>
              <option value="">— Hiển thị giá Web —</option>
              <option value="contact_only">📞 Hiện &quot;Liên hệ&quot; ngoài Web</option>
              <option value="show_price">💰 Hiện giá bán ngoài Web</option>
            </select>
            <button className="rounded-lg bg-blue-700 px-3 py-1.5 font-bold text-white hover:bg-blue-800 cursor-pointer">
              Áp dụng
            </button>
          </form>

          <KiotVietProductsTable
            rows={rows}
            total={total}
            summary={summary}
            returnTo={returnTo}
            viewMode={viewMode}
          />

          <Pagination
            basePath="/admin/products/"
            page={page}
            total={total}
            params={{
              q: q || undefined,
              category: category ? String(category) : undefined,
              stock: stock || undefined,
              status: status || undefined,
              supplier: supplier || undefined,
              brand: brand || undefined,
              location: location || undefined,
              view: viewMode === "pricebook" ? "pricebook" : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
