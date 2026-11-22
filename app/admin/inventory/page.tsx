import Link from "next/link";
import {
  addCashbookAction,
  deleteDeliveryPartnerAction,
  deleteSupplierAction,
  exportInventoryIssueAction,
  importInventoryAction,
  saveDeliveryPartnerAction,
  saveSupplierAction,
  stocktakeInventoryAction,
} from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import PrintButton from "@/components/admin/PrintButton";
import { Flash, PageHeader, StatusBadge, strParam, ui } from "@/components/admin/ui";
import { requireRole } from "@/lib/auth";
import {
  CASHBOOK_PAYMENT_METHODS,
  getEndOfDayReport,
  getInventoryOverview,
  listCashbookEntries,
  listDeliveryPartners,
  listInventoryMovements,
  listInventoryProducts,
  listSuppliers,
  type CashbookPaymentMethod,
} from "@/lib/retail-ops";
import { vnd } from "@/lib/site";

export const metadata = { title: "Kho hàng, Sổ quỹ & Báo cáo cuối ngày | Quản trị" };

type TabKey = "stock" | "import" | "cashbook" | "partners" | "eod";

const REASON_LABELS: Record<string, { label: string; badge: string }> = {
  import: { label: "Nhập hàng", badge: "bg-emerald-100 text-emerald-800" },
  stocktake: { label: "Kiểm kho", badge: "bg-blue-100 text-blue-800" },
  sale: { label: "Bán hàng", badge: "bg-amber-100 text-amber-800" },
  cancel: { label: "Trả hàng / Hoàn kho", badge: "bg-purple-100 text-purple-800" },
  internal_use: { label: "Xuất dùng nội bộ", badge: "bg-cyan-100 text-cyan-800" },
  damage: { label: "Xuất hủy", badge: "bg-red-100 text-red-800" },
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
  const activeTab: TabKey =
    rawTab === "import" || rawTab === "cashbook" || rawTab === "partners" || rawTab === "eod"
      ? rawTab
      : "stock";
  const q = strParam(sp.q);
  const stockFilter = strParam(sp.stock);
  const methodFilter = strParam(sp.method);
  const eodDateParam = strParam(sp.date);

  const [overview, products, movements, cashbook, suppliers, deliveryPartners, eod] = await Promise.all([
    getInventoryOverview(),
    activeTab === "stock" || activeTab === "import"
      ? listInventoryProducts({ q, stockFilter, limit: activeTab === "import" ? 250 : 80 })
      : Promise.resolve([]),
    activeTab === "import" ? listInventoryMovements(50) : Promise.resolve([]),
    activeTab === "cashbook" ? listCashbookEntries({ limit: 80, paymentMethod: methodFilter }) : Promise.resolve([]),
    activeTab === "import" || activeTab === "partners" ? listSuppliers() : Promise.resolve([]),
    activeTab === "partners" ? listDeliveryPartners() : Promise.resolve([]),
    activeTab === "eod" ? getEndOfDayReport(eodDateParam) : Promise.resolve(undefined),
  ]);

  const netCash = overview.totalIn - overview.totalOut;
  const netCashFund = overview.cashIn - overview.cashOut;
  const netBankFund = overview.bankIn - overview.bankOut;
  const netKvFund = overview.kvIn - overview.kvOut;

  const vnToday = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const vnYesterday = new Date(Date.now() + 7 * 3600 * 1000 - 86400 * 1000).toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="print:hidden">
        <PageHeader title="📦 Quản lý Kho, Đối tác, Sổ quỹ 3 Quỹ & Báo cáo cuối ngày (KiotViet)">
          <Link href="/admin/pos/" prefetch={false} className={ui.primary}>
            🛒 Mở màn hình Bán hàng (POS)
          </Link>
          <Link href="/admin/kiotviet/" prefetch={false} className={ui.secondary}>
            🔗 Kết nối KiotViet
          </Link>
        </PageHeader>
        <Flash saved={sp.saved} error={sp.error} />
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 print:hidden">
        <Link
          href="/admin/inventory/?tab=stock"
          prefetch={false}
          className={`rounded-2xl border p-4 transition ${
            activeTab === "stock" && !stockFilter ? "border-brand bg-green-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">💰 Giá trị tồn kho (theo Giá vốn)</div>
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
          <div className="text-xs font-bold text-gray-500">🏦 Tổng Tồn quỹ (3 Quỹ)</div>
          <div className={`mt-1 text-xl font-extrabold ${netCash >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {vnd(netCash)}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Thu: {vnd(overview.totalIn)} · Chi: {vnd(overview.totalOut)}
          </div>
        </Link>

        <Link
          href="/admin/inventory/?tab=eod"
          prefetch={false}
          className={`rounded-2xl border p-4 transition ${
            activeTab === "eod" ? "border-brand bg-green-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">📊 Báo cáo cuối ngày</div>
          <div className="mt-1 text-base font-extrabold text-indigo-800">Chốt ca &amp; Đối soát</div>
          <div className="mt-1 text-[11px] text-indigo-700">Doanh thu · Giá vốn · Lãi gộp →</div>
        </Link>
      </div>

      {/* 5 Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-3 print:hidden">
        {[
          { key: "stock", label: "📋 Tồn kho & Kiểm kho (Giá vốn)" },
          { key: "import", label: "📥 Nhập hàng & Thẻ kho" },
          { key: "cashbook", label: "📒 Sổ quỹ Thu – Chi (3 Quỹ)" },
          { key: "partners", label: "🚚 Nhà cung cấp & ĐVVC" },
          { key: "eod", label: "📊 Báo cáo cuối ngày" },
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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link href={`/admin/products/${p.id}/`} className="font-semibold text-gray-900 hover:text-brand">
                            {p.name}
                          </Link>
                          {Boolean(p.contact_only) && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                              📞 Web: Liên hệ
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {p.category_name}
                          {p.supplier ? ` · NCC: ${p.supplier}` : ""}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-brand">📥 Tạo Phiếu Nhập Hàng Từ Nhà Cung Cấp</h2>
              <Link href="/admin/inventory/?tab=partners" className="text-xs font-bold text-brand hover:underline">
                + Quản lý danh sách Nhà cung cấp →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className={ui.label}>Chọn sản phẩm nhập *</label>
                <select name="product_id" required className={ui.input}>
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku ? `[${p.sku}] ` : ""}{p.name} (Tồn: {p.stock} · Vốn: {vnd(p.cost_price)})
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
              <div>
                <label className={ui.label}>Nhà cung cấp</label>
                <input
                  name="supplier_name"
                  list="import-suppliers-list"
                  placeholder="Chọn hoặc gõ tên NCC..."
                  className={ui.input}
                />
                <datalist id="import-suppliers-list">
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.code}
                    </option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className={ui.label}>Mã phiếu nhập</label>
                <input name="ref_code" placeholder="Tự tạo nếu để trống" className={`${ui.input} font-mono`} />
              </div>
              <div>
                <label className={ui.label}>Quỹ chi thanh toán NCC</label>
                <select name="payment_method" defaultValue="cash" className={ui.input}>
                  <option value="cash">💵 Quỹ Tiền mặt</option>
                  <option value="bank">🏦 Quỹ Chuyển khoản NH</option>
                  <option value="kiotviet">🔗 Quỹ Theo KiotViet</option>
                </select>
              </div>
              <div>
                <label className={ui.label}>Ghi chú lô hàng</label>
                <input name="note" placeholder="VD: Lô mới hạn 2027..." className={ui.input} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <input type="checkbox" name="record_cash_out" value="1" defaultChecked className="accent-brand" />
                <span>Tự động ghi Phiếu Chi vào Sổ quỹ đã chọn (Số lượng × Giá vốn)</span>
              </label>
              <button className={ui.primary}>+ Nhập kho ngay</button>
            </div>
          </form>

          {/* KiotViet Kho hàng: Xuất dùng nội bộ (#/InternalUse) & Xuất hủy (#/DamageItems) */}
          <form action={exportInventoryIssueAction} className={`${ui.card} p-5 space-y-3 border-amber-200 bg-amber-50/20`}>
            <h2 className="text-base font-bold text-amber-900">
              📤 Tạo Phiếu Xuất Dùng Nội Bộ (#/InternalUse) hoặc Xuất Hủy Hàng Hỏng (#/DamageItems)
            </h2>
            <div className="grid gap-3 sm:grid-cols-5">
              <div className="sm:col-span-2">
                <label className={ui.label}>Chọn sản phẩm xuất *</label>
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
                <label className={ui.label}>Loại phiếu xuất *</label>
                <select name="issue_type" defaultValue="internal_use" className={ui.input}>
                  <option value="internal_use">📤 Xuất dùng nội bộ</option>
                  <option value="damage">🗑️ Xuất hủy (Hỏng / Hết hạn)</option>
                </select>
              </div>
              <div>
                <label className={ui.label}>Số lượng xuất *</label>
                <input name="qty" type="number" min={1} required defaultValue={1} className={ui.input} />
              </div>
              <div>
                <label className={ui.label}>Lý do / Ghi chú</label>
                <input name="note" placeholder="VD: Pha mời khách / Hết hạn..." className={ui.input} />
              </div>
            </div>
            <div className="flex justify-end">
              <button className="rounded-lg bg-amber-700 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800 cursor-pointer">
                − Ghi nhận Xuất kho vào Thẻ kho
              </button>
            </div>
          </form>

          <div className={`${ui.card} overflow-x-auto`}>
            <div className="border-b px-4 py-3 font-bold text-sm text-gray-900">
              📜 Thẻ Kho — Lịch sử Biến động Tồn kho (50 giao dịch gần nhất)
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className={ui.th}>Chứng từ</th>
                  <th className={ui.th}>Thời gian</th>
                  <th className={ui.th}>Sản phẩm</th>
                  <th className={ui.th}>Loại</th>
                  <th className={`${ui.th} text-right`}>Giá vốn</th>
                  <th className={`${ui.th} text-right`}>Thay đổi</th>
                  <th className={`${ui.th} text-right`}>Tồn cuối</th>
                  <th className={ui.th}>Đối tác / Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.map((m) => {
                  const r = REASON_LABELS[m.reason] ?? { label: m.reason, badge: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={m.id}>
                      <td className={`${ui.td} font-mono text-xs font-semibold text-gray-700`}>
                        {m.ref_code || `#${m.id}`}
                      </td>
                      <td className={`${ui.td} text-xs text-gray-500 whitespace-nowrap`}>{m.created_at.slice(0, 16)}</td>
                      <td className={ui.td}>
                        <Link href={`/admin/products/${m.product_id}/`} className="font-medium text-gray-900 hover:text-brand">
                          {m.product_name}
                        </Link>
                        {m.sku && <div className="font-mono text-[11px] text-gray-400">{m.sku}</div>}
                      </td>
                      <td className={ui.td}>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.badge}`}>{r.label}</span>
                      </td>
                      <td className={`${ui.td} text-right font-mono text-xs`}>
                        {m.unit_cost > 0 ? vnd(m.unit_cost) : "—"}
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
                    <td colSpan={8} className="p-8 text-center text-sm text-gray-500">
                      Chưa có lịch sử biến động tồn kho.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CASHBOOK 3 FUNDS (TIỀN MẶT / CHUYỂN KHOẢN NH / THEO KIOTVIET) */}
      {activeTab === "cashbook" && (
        <div className="space-y-6">
          {/* 3 Fund Breakdown Cards */}
          <div className="grid gap-3 md:grid-cols-3">
            <Link
              href={methodFilter === "cash" ? "/admin/inventory/?tab=cashbook" : "/admin/inventory/?tab=cashbook&method=cash"}
              prefetch={false}
              className={`rounded-2xl border p-4 transition ${
                methodFilter === "cash" ? "border-emerald-500 bg-emerald-50/70 shadow-xs" : "bg-white hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-emerald-800">💵 1. Quỹ Tiền mặt</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  {methodFilter === "cash" ? "Đang lọc" : "Bấm để lọc"}
                </span>
              </div>
              <div className={`mt-1.5 text-xl font-extrabold ${netCashFund >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                Tồn: {vnd(netCashFund)}
              </div>
              <div className="mt-1 flex justify-between text-xs text-gray-600">
                <span>Thu: <strong className="text-emerald-700">+{vnd(overview.cashIn)}</strong></span>
                <span>Chi: <strong className="text-red-600">-{vnd(overview.cashOut)}</strong></span>
              </div>
            </Link>

            <Link
              href={methodFilter === "bank" ? "/admin/inventory/?tab=cashbook" : "/admin/inventory/?tab=cashbook&method=bank"}
              prefetch={false}
              className={`rounded-2xl border p-4 transition ${
                methodFilter === "bank" ? "border-blue-500 bg-blue-50/70 shadow-xs" : "bg-white hover:border-blue-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-blue-800">🏦 2. Quỹ Chuyển khoản NH</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  {methodFilter === "bank" ? "Đang lọc" : "Bấm để lọc"}
                </span>
              </div>
              <div className={`mt-1.5 text-xl font-extrabold ${netBankFund >= 0 ? "text-blue-700" : "text-red-600"}`}>
                Tồn: {vnd(netBankFund)}
              </div>
              <div className="mt-1 flex justify-between text-xs text-gray-600">
                <span>Thu: <strong className="text-emerald-700">+{vnd(overview.bankIn)}</strong></span>
                <span>Chi: <strong className="text-red-600">-{vnd(overview.bankOut)}</strong></span>
              </div>
            </Link>

            <Link
              href={methodFilter === "kiotviet" ? "/admin/inventory/?tab=cashbook" : "/admin/inventory/?tab=cashbook&method=kiotviet"}
              prefetch={false}
              className={`rounded-2xl border p-4 transition ${
                methodFilter === "kiotviet" ? "border-indigo-500 bg-indigo-50/70 shadow-xs" : "bg-white hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-indigo-800">🔗 3. Quỹ Theo KiotViet</span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                  {methodFilter === "kiotviet" ? "Đang lọc" : "Bấm để lọc"}
                </span>
              </div>
              <div className={`mt-1.5 text-xl font-extrabold ${netKvFund >= 0 ? "text-indigo-700" : "text-red-600"}`}>
                Tồn: {vnd(netKvFund)}
              </div>
              <div className="mt-1 flex justify-between text-xs text-gray-600">
                <span>Thu: <strong className="text-emerald-700">+{vnd(overview.kvIn)}</strong></span>
                <span>Chi: <strong className="text-red-600">-{vnd(overview.kvOut)}</strong></span>
              </div>
            </Link>
          </div>

          <form action={addCashbookAction} className={`${ui.card} p-5 space-y-4`}>
            <h2 className="text-base font-bold text-gray-900">📒 Lập Phiếu Thu / Chi Sổ quỹ (Chuẩn KiotViet #/CashFlow)</h2>
            <div className="grid gap-3 sm:grid-cols-6">
              <div>
                <label className={ui.label}>Loại phiếu</label>
                <select name="entry_type" className={ui.input}>
                  <option value="in">➕ Phiếu Thu</option>
                  <option value="out">➖ Phiếu Chi</option>
                </select>
              </div>
              <div>
                <label className={ui.label}>Loại quỹ *</label>
                <select name="payment_method" defaultValue={methodFilter || "cash"} className={ui.input}>
                  <option value="cash">💵 Tiền mặt</option>
                  <option value="bank">🏦 Chuyển khoản NH</option>
                  <option value="kiotviet">🔗 Theo KiotViet</option>
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
                <label className={ui.label}>Mã chứng từ</label>
                <input name="ref_code" placeholder="VD: PT0012 / HD..." className={`${ui.input} font-mono`} />
              </div>
              <div>
                <label className={ui.label}>Ghi chú / Đối tượng</label>
                <input name="note" placeholder="Diễn giải chi tiết..." className={ui.input} />
              </div>
            </div>
            <div className="flex justify-end">
              <button className={ui.primary}>+ Lưu phiếu vào Sổ quỹ</button>
            </div>
          </form>

          <div className={`${ui.card} overflow-x-auto`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <div className="font-bold text-sm text-gray-900">
                Danh sách Phiếu Thu – Chi {methodFilter ? `(${CASHBOOK_PAYMENT_METHODS[methodFilter as CashbookPaymentMethod]?.label ?? methodFilter})` : "(Tất cả 3 Quỹ)"}
              </div>
              {methodFilter && (
                <Link href="/admin/inventory/?tab=cashbook" className="text-xs font-semibold text-brand hover:underline">
                  Xem tất cả 3 quỹ →
                </Link>
              )}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className={ui.th}>Chứng từ</th>
                  <th className={ui.th}>Thời gian</th>
                  <th className={ui.th}>Loại phiếu</th>
                  <th className={ui.th}>Loại quỹ</th>
                  <th className={ui.th}>Hạng mục</th>
                  <th className={`${ui.th} text-right`}>Số tiền</th>
                  <th className={ui.th}>Diễn giải</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cashbook.map((c) => {
                  const mMeta = CASHBOOK_PAYMENT_METHODS[c.payment_method] ?? CASHBOOK_PAYMENT_METHODS.cash;
                  return (
                    <tr key={c.id}>
                      <td className={`${ui.td} font-mono text-xs font-semibold text-gray-700`}>
                        {c.ref_code || `SQ#${c.id}`}
                      </td>
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
                      <td className={ui.td}>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${mMeta.badge}`}>
                          {mMeta.label}
                        </span>
                      </td>
                      <td className={`${ui.td} font-medium`}>{c.category}</td>
                      <td className={`${ui.td} text-right font-bold ${c.entry_type === "in" ? "text-emerald-700" : "text-red-600"}`}>
                        {c.entry_type === "in" ? "+" : "-"}
                        {vnd(c.amount)}
                      </td>
                      <td className={`${ui.td} text-xs text-gray-600`}>{c.note}</td>
                    </tr>
                  );
                })}
                {cashbook.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-gray-500">
                      Chưa có giao dịch thu chi nào trong quỹ này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SUPPLIERS & DELIVERY PARTNERS (#/PartnerDelivery & #/Suppliers) */}
      {activeTab === "partners" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column: Suppliers */}
          <div className="space-y-4">
            <form action={saveSupplierAction} className={`${ui.card} p-5 space-y-3 border-emerald-200`}>
              <h2 className="text-base font-extrabold text-brand">🏢 Thêm Nhà cung cấp (Suppliers)</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={ui.label}>Mã NCC</label>
                  <input name="code" placeholder="VD: NCC0010 (Tự tạo nếu trống)" className={`${ui.input} font-mono text-xs`} />
                </div>
                <div>
                  <label className={ui.label}>Tên Nhà cung cấp *</label>
                  <input name="name" required placeholder="VD: Tâm Minh Foods / C'Lavie..." className={ui.input} />
                </div>
                <div>
                  <label className={ui.label}>Điện thoại</label>
                  <input name="phone" placeholder="VD: 0909..." className={ui.input} />
                </div>
                <div>
                  <label className={ui.label}>Địa chỉ / Khu vực</label>
                  <input name="address" placeholder="VD: TP.HCM / Đài Loan..." className={ui.input} />
                </div>
                <div className="sm:col-span-2">
                  <label className={ui.label}>Ghi chú nguồn hàng / chiết khấu</label>
                  <input name="note" placeholder="VD: Chuyên dòng Canh dưỡng sinh, chiết khấu đại lý..." className={ui.input} />
                </div>
              </div>
              <button className={ui.primary}>+ Lưu Nhà cung cấp</button>
            </form>

            <div className={`${ui.card} overflow-x-auto`}>
              <div className="border-b px-4 py-3 text-sm font-bold text-gray-900">
                Danh sách Nhà cung cấp ({suppliers.length})
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={ui.th}>Mã</th>
                    <th className={ui.th}>Nhà cung cấp</th>
                    <th className={`${ui.th} text-center`}>Số SP</th>
                    <th className={ui.th}></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <td className={`${ui.td} font-mono text-xs text-gray-600`}>{s.code}</td>
                      <td className={ui.td}>
                        <div className="font-bold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">
                          {[s.phone, s.address, s.note].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </td>
                      <td className={`${ui.td} text-center font-bold text-brand`}>{s.product_count}</td>
                      <td className={`${ui.td} text-right`}>
                        <form action={deleteSupplierAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <ConfirmButton
                            message={`Xoá nhà cung cấp "${s.name}"?`}
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Xoá
                          </ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Delivery Partners (#/PartnerDelivery) */}
          <div className="space-y-4">
            <form action={saveDeliveryPartnerAction} className={`${ui.card} p-5 space-y-3 border-blue-200`}>
              <h2 className="text-base font-extrabold text-blue-900">🚚 Thêm Đối tác giao hàng (#/PartnerDelivery)</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={ui.label}>Mã ĐTGH</label>
                  <input name="code" placeholder="VD: DT0007 (Tự tạo nếu trống)" className={`${ui.input} font-mono text-xs`} />
                </div>
                <div>
                  <label className={ui.label}>Tên Đơn vị vận chuyển *</label>
                  <input name="name" required placeholder="VD: GHN / GHTK / Viettel Post..." className={ui.input} />
                </div>
                <div>
                  <label className={ui.label}>Hotline / Bưu cục</label>
                  <input name="phone" placeholder="VD: 1900 636677" className={ui.input} />
                </div>
                <div>
                  <label className={ui.label}>Phí ship mặc định (VNĐ)</label>
                  <input name="default_fee" type="number" min={0} defaultValue={30000} className={ui.input} />
                </div>
                <div className="sm:col-span-2">
                  <label className={ui.label}>Ghi chú đối soát COD</label>
                  <input name="note" placeholder="VD: Đối soát COD thứ 2-4-6 hàng tuần..." className={ui.input} />
                </div>
              </div>
              <button className={ui.primary}>+ Lưu Đối tác giao hàng</button>
            </form>

            <div className={`${ui.card} overflow-x-auto`}>
              <div className="border-b px-4 py-3 text-sm font-bold text-gray-900">
                Danh sách Đối tác giao hàng ({deliveryPartners.length})
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={ui.th}>Mã</th>
                    <th className={ui.th}>Đơn vị vận chuyển</th>
                    <th className={`${ui.th} text-right`}>Phí chuẩn</th>
                    <th className={`${ui.th} text-center`}>Đơn</th>
                    <th className={ui.th}></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deliveryPartners.map((d) => (
                    <tr key={d.id}>
                      <td className={`${ui.td} font-mono text-xs text-gray-600`}>{d.code}</td>
                      <td className={ui.td}>
                        <div className="font-bold text-gray-900">{d.name}</div>
                        <div className="text-xs text-gray-500">
                          {[d.phone, d.note].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </td>
                      <td className={`${ui.td} text-right font-mono text-xs`}>{vnd(d.default_fee)}</td>
                      <td className={`${ui.td} text-center font-bold text-blue-700`}>{d.order_count}</td>
                      <td className={`${ui.td} text-right`}>
                        <form action={deleteDeliveryPartnerAction}>
                          <input type="hidden" name="id" value={d.id} />
                          <ConfirmButton
                            message={`Xoá đối tác giao hàng "${d.name}"?`}
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Xoá
                          </ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: END OF DAY REPORT (#/EndOfDayReport) */}
      {activeTab === "eod" && eod && (
        <div className="space-y-6">
          {/* Date Selector & Print Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-xs print:hidden">
            <form method="get" action="/admin/inventory/" className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="tab" value="eod" />
              <span className="text-xs font-extrabold uppercase text-gray-600">📅 Ngày báo cáo:</span>
              <input
                type="date"
                name="date"
                defaultValue={eod.date}
                className={`${ui.input} w-44 font-bold`}
              />
              <button className={ui.primary}>Xem báo cáo</button>
              <Link
                href={`/admin/inventory/?tab=eod&date=${vnToday}`}
                className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                  eod.date === vnToday ? "border-brand bg-green-50 text-brand" : "bg-white text-gray-700"
                }`}
              >
                Hôm nay ({vnToday})
              </Link>
              <Link
                href={`/admin/inventory/?tab=eod&date=${vnYesterday}`}
                className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                  eod.date === vnYesterday ? "border-brand bg-green-50 text-brand" : "bg-white text-gray-700"
                }`}
              >
                Hôm qua ({vnYesterday})
              </Link>
            </form>
            <PrintButton className={ui.secondary} />
          </div>

          {/* Printable Header */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-brand">
                  CỬA HÀNG THỰC DƯỠNG PHÚC THỌ — BÁO CÁO CUỐI NGÀY (#/EndOfDayReport)
                </div>
                <h2 className="mt-1 text-xl font-extrabold text-gray-900">
                  📊 Báo cáo Tổng kết Bán hàng, Thu Chi &amp; Lợi nhuận ngày {eod.date}
                </h2>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>Giờ xuất báo cáo: {new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ")}</div>
                <div>Đơn vị tiền tệ: VNĐ</div>
              </div>
            </div>

            {/* 1. Sales & Gross Profit KPIs */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-emerald-50/60 p-4">
                <div className="text-xs font-bold text-emerald-900">1. Doanh thu thực bán</div>
                <div className="mt-1 text-2xl font-extrabold text-emerald-800">{vnd(eod.ordersSummary.grossRevenue)}</div>
                <div className="mt-1 text-[11px] text-emerald-700">
                  {eod.ordersSummary.totalOrders} đơn ({eod.ordersSummary.completedOrders} hoàn thành · {eod.ordersSummary.pendingOrders} đang giao/xử lý · {eod.ordersSummary.returnedOrCancelledOrders} trả/huỷ)
                </div>
              </div>

              <div className="rounded-xl border bg-amber-50/60 p-4">
                <div className="text-xs font-bold text-amber-900">2. Tổng Giá vốn hàng bán</div>
                <div className="mt-1 text-2xl font-extrabold text-amber-800">{vnd(eod.profitSummary.totalCogs)}</div>
                <div className="mt-1 text-[11px] text-amber-700">
                  Tổng số lượng xuất bán: {eod.profitSummary.totalItemsSold} SP
                </div>
              </div>

              <div className="rounded-xl border bg-blue-50/60 p-4">
                <div className="text-xs font-bold text-blue-900">3. Lợi nhuận gộp trong ngày</div>
                <div className={`mt-1 text-2xl font-extrabold ${eod.profitSummary.grossProfit >= 0 ? "text-blue-800" : "text-red-600"}`}>
                  {vnd(eod.profitSummary.grossProfit)}
                </div>
                <div className="mt-1 text-[11px] text-blue-700">
                  Tỷ suất lãi gộp: <strong>{eod.profitSummary.marginPct}%</strong>
                </div>
              </div>

              <div className="rounded-xl border bg-indigo-50/60 p-4">
                <div className="text-xs font-bold text-indigo-900">4. Thực thu Sổ quỹ trong ngày</div>
                <div className="mt-1 text-2xl font-extrabold text-indigo-800">
                  {vnd(eod.cashbookSummary.totalIn - eod.cashbookSummary.totalOut)}
                </div>
                <div className="mt-1 text-[11px] text-indigo-700">
                  Thu: +{vnd(eod.cashbookSummary.totalIn)} · Chi: -{vnd(eod.cashbookSummary.totalOut)}
                </div>
              </div>
            </div>

            {/* 2. Daily Cashbook Reconciliation by 3 Funds */}
            <div className="mt-6">
              <h3 className="mb-2.5 text-sm font-extrabold text-gray-900">
                🏦 Đối soát Thu – Chi trong ngày theo 3 Quỹ (Tiền mặt · Chuyển khoản NH · Theo KiotViet)
              </h3>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={ui.th}>Loại quỹ</th>
                      <th className={`${ui.th} text-right`}>Doanh thu đơn hàng</th>
                      <th className={`${ui.th} text-right`}>Tổng Thu Sổ quỹ</th>
                      <th className={`${ui.th} text-right`}>Tổng Chi / Hoàn tiền</th>
                      <th className={`${ui.th} text-right`}>Chênh lệch (Thu - Chi)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className={`${ui.td} font-bold text-emerald-800`}>💵 1. Quỹ Tiền mặt / COD</td>
                      <td className={`${ui.td} text-right font-mono`}>{vnd(eod.ordersSummary.codRevenue)}</td>
                      <td className={`${ui.td} text-right font-bold text-emerald-700`}>+{vnd(eod.cashbookSummary.cashIn)}</td>
                      <td className={`${ui.td} text-right font-bold text-red-600`}>-{vnd(eod.cashbookSummary.cashOut)}</td>
                      <td className={`${ui.td} text-right font-extrabold`}>{vnd(eod.cashbookSummary.cashIn - eod.cashbookSummary.cashOut)}</td>
                    </tr>
                    <tr>
                      <td className={`${ui.td} font-bold text-blue-800`}>🏦 2. Quỹ Chuyển khoản NH</td>
                      <td className={`${ui.td} text-right font-mono`}>{vnd(eod.ordersSummary.bankRevenue)}</td>
                      <td className={`${ui.td} text-right font-bold text-emerald-700`}>+{vnd(eod.cashbookSummary.bankIn)}</td>
                      <td className={`${ui.td} text-right font-bold text-red-600`}>-{vnd(eod.cashbookSummary.bankOut)}</td>
                      <td className={`${ui.td} text-right font-extrabold`}>{vnd(eod.cashbookSummary.bankIn - eod.cashbookSummary.bankOut)}</td>
                    </tr>
                    <tr>
                      <td className={`${ui.td} font-bold text-indigo-800`}>🔗 3. Quỹ Theo KiotViet / POS</td>
                      <td className={`${ui.td} text-right font-mono`}>{vnd(eod.ordersSummary.posRevenue)}</td>
                      <td className={`${ui.td} text-right font-bold text-emerald-700`}>+{vnd(eod.cashbookSummary.kvIn)}</td>
                      <td className={`${ui.td} text-right font-bold text-red-600`}>-{vnd(eod.cashbookSummary.kvOut)}</td>
                      <td className={`${ui.td} text-right font-extrabold`}>{vnd(eod.cashbookSummary.kvIn - eod.cashbookSummary.kvOut)}</td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t bg-gray-50 font-extrabold">
                    <tr>
                      <td className={ui.td}>TỔNG CỘNG TRONG NGÀY</td>
                      <td className={`${ui.td} text-right text-brand`}>{vnd(eod.ordersSummary.grossRevenue)}</td>
                      <td className={`${ui.td} text-right text-emerald-700`}>+{vnd(eod.cashbookSummary.totalIn)}</td>
                      <td className={`${ui.td} text-right text-red-600`}>-{vnd(eod.cashbookSummary.totalOut)}</td>
                      <td className={`${ui.td} text-right text-indigo-900`}>
                        {vnd(eod.cashbookSummary.totalIn - eod.cashbookSummary.totalOut)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 3. Products Sold Breakdown */}
            <div className="mt-6">
              <h3 className="mb-2.5 text-sm font-extrabold text-gray-900">
                📦 Chi tiết Hàng hoá xuất bán trong ngày ({eod.topItems.length} mặt hàng)
              </h3>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={ui.th}>Mã SP</th>
                      <th className={ui.th}>Tên hàng hoá</th>
                      <th className={`${ui.th} text-right`}>SL bán</th>
                      <th className={`${ui.th} text-right`}>Doanh thu</th>
                      <th className={`${ui.th} text-right`}>Giá vốn</th>
                      <th className={`${ui.th} text-right`}>Lãi gộp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {eod.topItems.map((it) => (
                      <tr key={`${it.product_id}-${it.name}`}>
                        <td className={`${ui.td} font-mono text-xs text-gray-500`}>{it.sku || `#${it.product_id}`}</td>
                        <td className={`${ui.td} font-semibold text-gray-900`}>{it.name}</td>
                        <td className={`${ui.td} text-right font-bold`}>{it.qty_sold}</td>
                        <td className={`${ui.td} text-right font-semibold`}>{vnd(it.revenue)}</td>
                        <td className={`${ui.td} text-right text-gray-600`}>{vnd(it.cogs)}</td>
                        <td className={`${ui.td} text-right font-bold ${it.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                          {vnd(it.profit)}
                        </td>
                      </tr>
                    ))}
                    {eod.topItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-xs text-gray-500">
                          Không có hàng hoá nào xuất bán trong ngày {eod.date}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Orders in the Day */}
            <div className="mt-6">
              <h3 className="mb-2.5 text-sm font-extrabold text-gray-900">
                🧾 Danh sách Đơn hàng phát sinh ngày {eod.date} ({eod.dayOrders.length} đơn)
              </h3>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={ui.th}>Mã đơn</th>
                      <th className={ui.th}>Giờ đặt</th>
                      <th className={ui.th}>Khách hàng</th>
                      <th className={ui.th}>Thanh toán</th>
                      <th className={ui.th}>Trạng thái</th>
                      <th className={`${ui.th} text-right`}>Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {eod.dayOrders.map((o) => (
                      <tr key={o.id}>
                        <td className={`${ui.td} font-mono font-bold text-brand`}>
                          <Link href={`/admin/orders/${o.id}/`} className="hover:underline">
                            {o.code}
                          </Link>
                        </td>
                        <td className={`${ui.td} text-xs text-gray-500`}>{o.created_at.slice(11, 19) || o.created_at}</td>
                        <td className={ui.td}>
                          <div className="font-medium text-gray-900">{o.name}</div>
                          <div className="text-xs text-gray-500">{o.phone}</div>
                        </td>
                        <td className={`${ui.td} text-xs uppercase font-semibold text-gray-600`}>{o.payment}</td>
                        <td className={ui.td}>
                          <StatusBadge status={o.status} />
                        </td>
                        <td className={`${ui.td} text-right font-bold text-gray-900`}>{vnd(o.total)}</td>
                      </tr>
                    ))}
                    {eod.dayOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-xs text-gray-500">
                          Chưa có đơn hàng nào trong ngày {eod.date}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
