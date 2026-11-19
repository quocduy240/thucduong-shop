import Link from "next/link";
import {
  addCashbookAction,
  importInventoryAction,
  stocktakeInventoryAction,
} from "@/app/admin/actions";
import { Flash, PageHeader, strParam, ui } from "@/components/admin/ui";
import { requireRole } from "@/lib/auth";
import {
  getInventoryOverview,
  listCashbookEntries,
  listInventoryMovements,
  listInventoryProducts,
} from "@/lib/retail-ops";
import { vnd } from "@/lib/site";

export const metadata = { title: "Kho hàng & Sổ quỹ | Quản trị" };

type TabKey = "stock" | "import" | "cashbook";

const REASON_LABELS: Record<string, { label: string; badge: string }> = {
  import: { label: "Nhập hàng", badge: "bg-emerald-100 text-emerald-800" },
  stocktake: { label: "Kiểm kho", badge: "bg-blue-100 text-blue-800" },
  sale: { label: "Bán hàng", badge: "bg-amber-100 text-amber-800" },
  cancel: { label: "Huỷ hoàn kho", badge: "bg-gray-100 text-gray-700" },
  kiotviet_sync: { label: "Đồng bộ KiotViet", badge: "bg-indigo-100 text-indigo-800" },
};

export default async function InventoryAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["super_admin", "admin", "sales"]);
  const sp = await searchParams;
  const rawTab = strParam(sp.tab);
  const activeTab: TabKey = rawTab === "import" || rawTab === "cashbook" ? rawTab : "stock";
  const q = strParam(sp.q);
  const stockFilter = strParam(sp.stock);

  const [overview, products, movements, cashbook] = await Promise.all([
    getInventoryOverview(),
    activeTab === "stock" || activeTab === "import"
      ? listInventoryProducts({ q, stockFilter, limit: activeTab === "import" ? 200 : 80 })
      : Promise.resolve([]),
    activeTab === "import" ? listInventoryMovements(50) : Promise.resolve([]),
    activeTab === "cashbook" ? listCashbookEntries(60) : Promise.resolve([]),
  ]);

  const netCash = overview.totalIn - overview.totalOut;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader title="📦 Quản lý Kho hàng, Thẻ kho & Sổ quỹ (Chuẩn KiotViet)">
        <Link href="/admin/pos/" prefetch={false} className={ui.primary}>
          🛒 Mở màn hình Bán hàng (POS)
        </Link>
        <Link href="/admin/kiotviet/" prefetch={false} className={ui.secondary}>
          🔗 Kết nối KiotViet
        </Link>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link
          href="/admin/inventory/?tab=stock"
          prefetch={false}
          className={`rounded-2xl border p-4 transition ${
            activeTab === "stock" && !stockFilter ? "border-brand bg-green-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">💰 Giá trị tồn kho (ước tính)</div>
          <div className="mt-1 text-xl font-extrabold text-brand">{vnd(overview.totalInventoryValue)}</div>
          <div className="mt-1 text-[11px] text-gray-500">{overview.totalProducts} mã sản phẩm</div>
        </Link>

        <Link
          href="/admin/inventory/?tab=stock&stock=low"
          prefetch={false}
          className={`rounded-2xl border p-4 transition ${
            stockFilter === "low" ? "border-amber-400 bg-amber-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">⚠️ Sắp hết / Hết hàng</div>
          <div className="mt-1 text-xl font-extrabold text-amber-600">
            {overview.lowStock} sắp hết · {overview.outOfStock} hết
          </div>
          <div className="mt-1 text-[11px] text-amber-700">Bấm để lọc hàng sắp hết →</div>
        </Link>

        <Link
          href="/admin/inventory/?tab=cashbook"
          prefetch={false}
          className={`rounded-2xl border p-4 transition ${
            activeTab === "cashbook" ? "border-brand bg-green-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">📈 Tổng Thu / Tổng Chi</div>
          <div className="mt-1 text-sm font-extrabold text-emerald-700">Thu: {vnd(overview.totalIn)}</div>
          <div className="text-xs font-bold text-red-600">Chi: {vnd(overview.totalOut)}</div>
        </Link>

        <Link
          href="/admin/inventory/?tab=cashbook"
          prefetch={false}
          className="rounded-2xl border bg-white p-4 hover:border-gray-300 transition"
        >
          <div className="text-xs font-bold text-gray-500">🏦 Tồn quỹ (Thu - Chi)</div>
          <div className={`mt-1 text-xl font-extrabold ${netCash >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {vnd(netCash)}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">Sổ quỹ tiền mặt &amp; chuyển khoản</div>
        </Link>
      </div>

      {/* 3 Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          { key: "stock", label: "📋 Tồn kho & Kiểm kho (Giá vốn)" },
          { key: "import", label: "📥 Nhập hàng & Thẻ kho" },
          { key: "cashbook", label: "📒 Sổ quỹ Thu – Chi" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/admin/inventory/?tab=${t.key}`}
            prefetch={false}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === t.key
                ? "bg-brand text-white shadow-xs"
                : "border bg-white text-gray-700 hover:border-brand hover:text-brand"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* TAB 1: STOCKTAKE & COST PRICE */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          <form method="get" action="/admin/inventory/" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="tab" value="stock" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Tìm theo tên sản phẩm hoặc mã SKU..."
              className={`${ui.input} max-w-xs`}
            />
            <select name="stock" defaultValue={stockFilter} className={`${ui.input} max-w-[180px]`}>
              <option value="">Tất cả tồn kho</option>
              <option value="low">Sắp hết (1–5)</option>
              <option value="out">Hết hàng (0)</option>
            </select>
            <button className={ui.secondary}>Lọc</button>
            {(q || stockFilter) && (
              <Link href="/admin/inventory/?tab=stock" prefetch={false} className={ui.secondary}>
                Bỏ lọc
              </Link>
            )}
          </form>

          <div className={`${ui.card} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className={ui.th}>SKU</th>
                  <th className={ui.th}>Sản phẩm</th>
                  <th className={`${ui.th} text-right`}>Giá bán</th>
                  <th className={ui.th}>Kiểm kho &amp; Giá vốn (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => {
                  const sellPrice = p.sale_price ?? p.price;
                  const margin = p.cost_price > 0 ? sellPrice - p.cost_price : 0;
                  return (
                    <tr key={p.id}>
                      <td className={`${ui.td} font-mono text-xs text-gray-500`}>{p.sku || `#${p.id}`}</td>
                      <td className={ui.td}>
                        <div className="font-semibold text-gray-900">{p.name}</div>
                        <div className="text-[11px] text-gray-500">
                          {p.category_name}
                          {p.cost_price > 0 && ` · Lãi gộp/SP: ${vnd(margin)}`}
                        </div>
                      </td>
                      <td className={`${ui.td} text-right font-bold text-accent`}>{vnd(sellPrice)}</td>
                      <td className={ui.td}>
                        <form action={stocktakeInventoryAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="product_id" value={p.id} />
                          <label className="text-[11px] text-gray-500">
                            Tồn:
                            <input
                              name="actual_stock"
                              type="number"
                              min={0}
                              defaultValue={p.stock}
                              className="ml-1 w-16 rounded border px-2 py-1 text-center text-xs font-bold"
                            />
                          </label>
                          <label className="text-[11px] text-gray-500">
                            Giá vốn:
                            <input
                              name="cost_price"
                              type="number"
                              min={0}
                              defaultValue={p.cost_price}
                              className="ml-1 w-24 rounded border px-2 py-1 text-right text-xs"
                            />
                          </label>
                          <button className="rounded bg-brand px-2.5 py-1 text-xs font-bold text-white hover:bg-brand-dark cursor-pointer">
                            Cập nhật
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: IMPORT STOCK & STOCK LEDGER */}
      {activeTab === "import" && (
        <div className="space-y-6">
          <form action={importInventoryAction} className={`${ui.card} p-5 space-y-4 border-emerald-200 bg-emerald-50/20`}>
            <h2 className="text-base font-bold text-brand">📥 Tạo Phiếu Nhập Hàng Từ Nhà Cung Cấp</h2>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className={ui.label}>Chọn sản phẩm nhập *</label>
                <select name="product_id" required className={ui.input}>
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku ? `[${p.sku}] ` : ""}{p.name} (Tồn: {p.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={ui.label}>Số lượng nhập *</label>
                <input name="qty" type="number" min={1} required defaultValue={20} className={ui.input} />
              </div>
              <div>
                <label className={ui.label}>Giá vốn nhập / SP (VNĐ)</label>
                <input name="unit_cost" type="number" min={0} defaultValue={0} className={ui.input} />
              </div>
              <div className="sm:col-span-3">
                <label className={ui.label}>Ghi chú / Tên Nhà cung cấp</label>
                <input name="note" placeholder="VD: Nhập lô mới từ NCC Thực Dưỡng..." className={ui.input} />
              </div>
              <div className="flex items-end">
                <button className={`${ui.primary} w-full`}>+ Nhập kho ngay</button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <input type="checkbox" name="record_cash_out" value="1" defaultChecked className="accent-brand" />
              <span>Tự động ghi Phiếu Chi vào Sổ quỹ (Số lượng × Giá vốn)</span>
            </label>
          </form>

          <div className={`${ui.card} overflow-x-auto`}>
            <div className="border-b px-4 py-3 font-bold text-sm text-gray-900">
              📜 Thẻ Kho — Lịch sử Biến động Tồn kho (50 giao dịch gần nhất)
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className={ui.th}>Thời gian</th>
                  <th className={ui.th}>Sản phẩm</th>
                  <th className={ui.th}>Loại</th>
                  <th className={`${ui.th} text-right`}>Thay đổi</th>
                  <th className={`${ui.th} text-right`}>Tồn sau</th>
                  <th className={ui.th}>Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.map((m) => {
                  const r = REASON_LABELS[m.reason] ?? { label: m.reason, badge: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={m.id}>
                      <td className={`${ui.td} text-xs text-gray-500 whitespace-nowrap`}>{m.created_at.slice(0, 16)}</td>
                      <td className={ui.td}>
                        <div className="font-medium text-gray-900">{m.product_name}</div>
                        {m.ref_code && <div className="font-mono text-[11px] text-gray-400">{m.ref_code}</div>}
                      </td>
                      <td className={ui.td}>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.badge}`}>{r.label}</span>
                      </td>
                      <td className={`${ui.td} text-right font-bold ${m.change_qty >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {m.change_qty >= 0 ? `+${m.change_qty}` : m.change_qty}
                      </td>
                      <td className={`${ui.td} text-right font-semibold`}>{m.stock_after}</td>
                      <td className={`${ui.td} text-xs text-gray-600`}>{m.note}</td>
                    </tr>
                  );
                })}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm text-gray-500">
                      Chưa có lịch sử biến động tồn kho.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CASHBOOK */}
      {activeTab === "cashbook" && (
        <div className="space-y-6">
          <form action={addCashbookAction} className={`${ui.card} p-5 space-y-4`}>
            <h2 className="text-base font-bold text-gray-900">📒 Lập Phiếu Thu / Chi Sổ quỹ</h2>
            <div className="grid gap-3 sm:grid-cols-5">
              <div>
                <label className={ui.label}>Loại phiếu</label>
                <select name="entry_type" className={ui.input}>
                  <option value="in">➕ Phiếu Thu</option>
                  <option value="out">➖ Phiếu Chi</option>
                </select>
              </div>
              <div>
                <label className={ui.label}>Hạng mục</label>
                <input name="category" placeholder="VD: Thu bán lẻ / Chi ship..." className={ui.input} />
              </div>
              <div>
                <label className={ui.label}>Số tiền (VNĐ) *</label>
                <input name="amount" type="number" min={1} required className={ui.input} />
              </div>
              <div>
                <label className={ui.label}>Ghi chú</label>
                <input name="note" placeholder="Diễn giải chi tiết..." className={ui.input} />
              </div>
              <div className="flex items-end">
                <button className={`${ui.primary} w-full`}>+ Lưu phiếu</button>
              </div>
            </div>
          </form>

          <div className={`${ui.card} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className={ui.th}>Thời gian</th>
                  <th className={ui.th}>Loại</th>
                  <th className={ui.th}>Hạng mục</th>
                  <th className={`${ui.th} text-right`}>Số tiền</th>
                  <th className={ui.th}>Diễn giải</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cashbook.map((c) => (
                  <tr key={c.id}>
                    <td className={`${ui.td} text-xs text-gray-500 whitespace-nowrap`}>{c.created_at.slice(0, 16)}</td>
                    <td className={ui.td}>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          c.entry_type === "in" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {c.entry_type === "in" ? "Phiếu Thu" : "Phiếu Chi"}
                      </span>
                    </td>
                    <td className={`${ui.td} font-medium`}>{c.category}</td>
                    <td className={`${ui.td} text-right font-bold ${c.entry_type === "in" ? "text-emerald-700" : "text-red-600"}`}>
                      {c.entry_type === "in" ? "+" : "-"}
                      {vnd(c.amount)}
                    </td>
                    <td className={`${ui.td} text-xs text-gray-600`}>{c.note}</td>
                  </tr>
                ))}
                {cashbook.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-gray-500">
                      Chưa có giao dịch thu chi nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
