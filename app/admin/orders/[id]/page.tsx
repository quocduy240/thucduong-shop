import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmButton from "@/components/admin/ConfirmButton";
import KiotVietInvoicePrintStudio from "@/components/admin/KiotVietInvoicePrintStudio";
import { Flash, PageHeader, StatusBadge, ui } from "@/components/admin/ui";
import { ORDER_STATUS, getOrder } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getOrderShippingInfo, listDeliveryPartners } from "@/lib/retail-ops";
import { getInvoicePrintConfig, getSite } from "@/lib/settings";
import { vnd } from "@/lib/site";
import {
  pushOrderKiotVietAction,
  returnOrderAction,
  saveOrderShippingAction,
  updateOrderStatusAction,
} from "../../actions";

export const metadata = { title: "Chi tiết đơn & In hóa đơn KiotViet A5 | Quản trị" };

export default async function OrderDetail({ params, searchParams }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const sp = await searchParams;
  const [data, ship, partners, site, printConfig] = await Promise.all([
    Number.isInteger(id) ? getOrder(id) : Promise.resolve(undefined),
    Number.isInteger(id) ? getOrderShippingInfo(id) : Promise.resolve(undefined),
    listDeliveryPartners().catch(() => []),
    getSite(),
    getInvoicePrintConfig(),
  ]);
  if (!data) notFound();
  const { order: o, items } = data;
  const fullAddress = [o.address, o.ward_name, o.province_name].filter(Boolean).join(", ");
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="mx-auto max-w-4xl pb-12">
      {/* Screen Breadcrumb & Header */}
      <div className="print:hidden">
        <Link href="/admin/orders/" className="text-sm text-gray-500 hover:underline">
          ← Danh sách đơn hàng
        </Link>
        <PageHeader title={`Đơn ${o.code}`}>
          <StatusBadge status={o.status} />
        </PageHeader>
        <Flash saved={sp.saved} error={sp.error} />
      </div>

      {/* KiotViet A5 / A4 / K80 Invoice Print Studio (Handles both Print output & Interactive Block Configurator) */}
      <KiotVietInvoicePrintStudio
        initialConfig={printConfig}
        order={{
          id: o.id,
          code: o.code,
          name: o.name,
          phone: o.phone,
          email: o.email,
          fullAddress,
          note: o.note,
          payment: o.payment,
          total: o.total,
          status: o.status,
          statusLabel: ORDER_STATUS[o.status as keyof typeof ORDER_STATUS] ?? o.status,
          created_at: o.created_at,
          shipping_carrier: ship?.shipping_carrier ?? "",
          tracking_code: ship?.tracking_code ?? "",
          shipping_fee: ship?.shipping_fee ?? 0,
          cod_amount: ship?.cod_amount ?? 0,
          kiotviet_code: ship?.kiotviet_code ?? "",
        }}
        items={items}
        siteName={site.name}
        siteHotline={site.hotline}
        siteAddress={site.address}
      />

      {/* Screen Order Management Panels */}
      <div className="print:hidden">
        <div className="grid gap-4 md:grid-cols-2">
          <div className={`${ui.card} p-5`}>
            <h2 className="mb-3 font-semibold">Khách hàng</h2>
            <dl className="space-y-1 text-sm">
              <div><dt className="inline text-gray-500">Họ tên: </dt><dd className="inline font-medium">{o.name}</dd></div>
              <div><dt className="inline text-gray-500">Điện thoại: </dt><dd className="inline font-medium"><a href={`tel:${o.phone}`}>{o.phone}</a></dd></div>
              {o.email && <div><dt className="inline text-gray-500">Email: </dt><dd className="inline">{o.email}</dd></div>}
              <div><dt className="inline text-gray-500">Địa chỉ: </dt><dd className="inline">{fullAddress}</dd></div>
              {o.note && <div><dt className="inline text-gray-500">Ghi chú: </dt><dd className="inline">{o.note}</dd></div>}
            </dl>
          </div>
          <div className={`${ui.card} p-5`}>
            <h2 className="mb-3 font-semibold">Thông tin đơn</h2>
            <dl className="space-y-1 text-sm">
              <div><dt className="inline text-gray-500">Ngày đặt: </dt><dd className="inline">{o.created_at}</dd></div>
              <div>
                <dt className="inline text-gray-500">Thanh toán: </dt>
                <dd className="inline font-medium">
                  {o.payment === "bank"
                    ? "🏦 Chuyển khoản NH"
                    : o.payment === "cash"
                      ? "💵 Tiền mặt (POS)"
                      : o.payment === "kiotviet"
                        ? "🔗 Theo KiotViet"
                        : "🚚 Khi nhận hàng (COD)"}
                </dd>
              </div>
            </dl>
            <form action={updateOrderStatusAction} className="mt-4 flex gap-2">
              <input type="hidden" name="id" value={o.id} />
              <select name="status" defaultValue={o.status} className={ui.input}>
                {Object.entries(ORDER_STATUS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
              <button className={ui.primary}>Cập nhật</button>
            </form>
          </div>
        </div>

        <div className={`${ui.card} mt-4 overflow-x-auto`}>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className={ui.th}>Mã SP</th>
                <th className={ui.th}>Sản phẩm</th>
                <th className={`${ui.th} text-center`}>ĐVT</th>
                <th className={`${ui.th} text-right`}>Đơn giá</th>
                <th className={`${ui.th} text-right`}>SL</th>
                <th className={`${ui.th} text-right`}>Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((i, k) => (
                <tr key={k}>
                  <td className={`${ui.td} font-mono text-xs text-gray-500`}>{i.sku || `#${i.product_id}`}</td>
                  <td className={ui.td}>
                    <Link href={`/admin/products/${i.product_id}/`} className="font-medium hover:text-brand">
                      {i.name}
                    </Link>
                  </td>
                  <td className={`${ui.td} text-center text-xs text-gray-500`}>{i.unit || "SP"}</td>
                  <td className={`${ui.td} text-right`}>{vnd(i.price)}</td>
                  <td className={`${ui.td} text-right font-semibold`}>{i.qty}</td>
                  <td className={`${ui.td} text-right font-semibold`}>{vnd(i.price * i.qty)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50">
                <td colSpan={5} className={`${ui.td} text-right font-semibold`}>
                  Tổng cộng ({totalQty} sản phẩm)
                </td>
                <td className={`${ui.td} text-right text-lg font-bold text-accent`}>{vnd(o.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Shipping / COD & KiotViet Sync Cards (Chuẩn KiotViet) */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <form action={saveOrderShippingAction} className={`${ui.card} p-5 space-y-3`}>
            <input type="hidden" name="id" value={o.id} />
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">🚚 Vận đơn &amp; Đối soát COD</h2>
              <Link href="/admin/inventory/?tab=partners" className="text-xs font-semibold text-brand hover:underline">
                + Quản lý ĐVVC →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={ui.label}>Đối tác giao hàng (#/PartnerDelivery)</label>
                <select name="shipping_carrier" defaultValue={ship?.shipping_carrier ?? ""} className={ui.input}>
                  <option value="">-- Chọn ĐVVC --</option>
                  {partners.length > 0 ? (
                    partners.map((dp) => (
                      <option key={dp.id} value={dp.name}>
                        {dp.name} ({vnd(dp.default_fee)})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                      <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                      <option value="Viettel Post">Viettel Post</option>
                      <option value="J&T Express">J&amp;T Express</option>
                      <option value="Giao nội bộ">Giao nội bộ / Khách lấy</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className={ui.label}>Trạng thái vận đơn</label>
                <select name="shipping_status" defaultValue={ship?.shipping_status ?? ""} className={ui.input}>
                  <option value="">Chưa tạo vận đơn</option>
                  <option value="pending">Chờ lấy hàng</option>
                  <option value="picked">Đã lấy hàng</option>
                  <option value="shipping">Đang giao hàng</option>
                  <option value="delivered">Giao thành công</option>
                  <option value="returned">Hoàn hàng</option>
                </select>
              </div>
              <div>
                <label className={ui.label}>Mã vận đơn</label>
                <input
                  name="tracking_code"
                  defaultValue={ship?.tracking_code ?? ""}
                  placeholder="VD: GHN839201"
                  className={`${ui.input} font-mono text-xs`}
                />
              </div>
              <div>
                <label className={ui.label}>Phí ship trả ĐVVC (VNĐ)</label>
                <input
                  name="shipping_fee"
                  type="number"
                  min={0}
                  defaultValue={ship?.shipping_fee ?? 0}
                  className={ui.input}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={ui.label}>Tiền thu hộ COD (VNĐ)</label>
                <input
                  name="cod_amount"
                  type="number"
                  min={0}
                  defaultValue={ship?.cod_amount || (o.payment === "cod" ? o.total : 0)}
                  className={ui.input}
                />
              </div>
            </div>
            <button className={ui.primary}>💾 Lưu Vận đơn</button>
          </form>

          <div className="space-y-4">
            <div className={`${ui.card} p-5 flex flex-col justify-between space-y-3`}>
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-gray-900">🔗 Đồng bộ sang KiotViet</h2>
                {ship?.kiotviet_code ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                    <div>✓ Đã đẩy sang KiotViet</div>
                    <div className="mt-1 font-mono font-bold">
                      Mã KiotViet: {ship.kiotviet_code} (ID: {ship.kiotviet_order_id})
                    </div>
                    <div className="text-[11px] text-emerald-700">Lúc: {ship.kiotviet_synced_at}</div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Chuyển trực tiếp đơn hàng này sang KiotViet qua Public API (khớp theo SKU sản phẩm).
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={pushOrderKiotVietAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer">
                    🚀 {ship?.kiotviet_code ? "Đẩy lại sang KiotViet" : "Đẩy đơn sang KiotViet"}
                  </button>
                </form>
                <Link href="/admin/kiotviet/" prefetch={false} className={ui.secondary}>
                  ⚙️ Cấu hình KiotViet
                </Link>
              </div>
            </div>

            {/* KiotViet Return Order & Stock Restoration Card */}
            <form action={returnOrderAction} className={`${ui.card} border-purple-200 bg-purple-50/30 p-5 space-y-3`}>
              <input type="hidden" name="id" value={o.id} />
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-purple-900">↩️ Khách trả hàng / Hoàn kho (KiotViet)</h2>
                {o.status === "returned" && (
                  <span className="rounded-full bg-purple-200 px-2.5 py-0.5 text-[11px] font-bold text-purple-900">
                    ✓ Đã hoàn kho
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600">
                Tự động cộng hoàn lại tồn kho cho {items.length} mặt hàng vào Thẻ kho (`TH-{o.code}`), chuyển đơn sang trạng thái <strong>Đã trả hàng</strong> và tuỳ chọn ghi Phiếu Chi hoàn tiền vào Sổ quỹ.
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <label className={ui.label}>Số tiền hoàn lại khách (VNĐ)</label>
                  <input
                    name="refund_amount"
                    type="number"
                    min={0}
                    defaultValue={o.total}
                    className={ui.input}
                  />
                </div>
                <div>
                  <label className={ui.label}>Hoàn tiền từ Quỹ</label>
                  <select name="refund_method" defaultValue={o.payment === "bank" ? "bank" : "cash"} className={ui.input}>
                    <option value="cash">💵 Quỹ Tiền mặt</option>
                    <option value="bank">🏦 Quỹ Chuyển khoản NH</option>
                    <option value="kiotviet">🔗 Quỹ Theo KiotViet</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={ui.label}>Lý do trả hàng / Ghi chú Thẻ kho</label>
                  <input
                    name="return_note"
                    placeholder="VD: Khách đổi ý / Đổi sang sản phẩm khác..."
                    className={ui.input}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-purple-900">
                <input type="checkbox" name="record_refund" value="1" defaultChecked className="accent-purple-700" />
                <span>Tự động lập Phiếu Chi hoàn tiền trong Sổ quỹ</span>
              </label>
              <ConfirmButton
                message={`Xác nhận nhận hàng trả lại cho đơn ${o.code}? Hệ thống sẽ cộng hoàn lại tồn kho vào Thẻ kho.`}
                className="w-full rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800 cursor-pointer"
              >
                ↩️ Xác nhận Trả hàng &amp; Hoàn kho
              </ConfirmButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
