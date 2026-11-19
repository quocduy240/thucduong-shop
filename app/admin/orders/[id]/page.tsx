import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash, PageHeader, StatusBadge, ui } from "@/components/admin/ui";
import PrintButton from "@/components/admin/PrintButton";
import { ORDER_STATUS, getOrder } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getOrderShippingInfo } from "@/lib/retail-ops";
import { vnd } from "@/lib/site";
import { pushOrderKiotVietAction, saveOrderShippingAction, updateOrderStatusAction } from "../../actions";

export const metadata = { title: "Chi tiết đơn | Quản trị" };

export default async function OrderDetail({ params, searchParams }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const sp = await searchParams;
  const [data, ship] = await Promise.all([
    Number.isInteger(id) ? getOrder(id) : Promise.resolve(undefined),
    Number.isInteger(id) ? getOrderShippingInfo(id) : Promise.resolve(undefined),
  ]);
  if (!data) notFound();
  const { order: o, items } = data;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/orders/" className="text-sm text-gray-500 hover:underline print:hidden">← Danh sách đơn hàng</Link>
      <PageHeader title={`Đơn ${o.code}`}>
        <StatusBadge status={o.status} />
        <PrintButton className={`${ui.secondary} print:hidden`} />
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className={`${ui.card} p-5`}>
          <h2 className="mb-3 font-semibold">Khách hàng</h2>
          <dl className="space-y-1 text-sm">
            <div><dt className="inline text-gray-500">Họ tên: </dt><dd className="inline font-medium">{o.name}</dd></div>
            <div><dt className="inline text-gray-500">Điện thoại: </dt><dd className="inline font-medium"><a href={`tel:${o.phone}`}>{o.phone}</a></dd></div>
            {o.email && <div><dt className="inline text-gray-500">Email: </dt><dd className="inline">{o.email}</dd></div>}
            <div><dt className="inline text-gray-500">Địa chỉ: </dt><dd className="inline">{[o.address, o.ward_name, o.province_name].filter(Boolean).join(", ")}</dd></div>
            {o.note && <div><dt className="inline text-gray-500">Ghi chú: </dt><dd className="inline">{o.note}</dd></div>}
          </dl>
        </div>
        <div className={`${ui.card} p-5`}>
          <h2 className="mb-3 font-semibold">Thông tin đơn</h2>
          <dl className="space-y-1 text-sm">
            <div><dt className="inline text-gray-500">Ngày đặt: </dt><dd className="inline">{o.created_at}</dd></div>
            <div><dt className="inline text-gray-500">Thanh toán: </dt><dd className="inline">{o.payment === "bank" ? "Chuyển khoản" : "Khi nhận hàng (COD)"}</dd></div>
          </dl>
          <form action={updateOrderStatusAction} className="mt-4 flex gap-2 print:hidden">
            <input type="hidden" name="id" value={o.id} />
            <select name="status" defaultValue={o.status} className={ui.input}>
              {Object.entries(ORDER_STATUS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <button className={ui.primary}>Cập nhật</button>
          </form>
        </div>
      </div>

      <div className={`${ui.card} mt-4 overflow-x-auto`}>
        <table className="w-full">
          <thead className="bg-gray-50"><tr><th className={ui.th}>Sản phẩm</th><th className={`${ui.th} text-right`}>Đơn giá</th><th className={`${ui.th} text-right`}>SL</th><th className={`${ui.th} text-right`}>Thành tiền</th></tr></thead>
          <tbody className="divide-y">
            {items.map((i, k) => (
              <tr key={k}>
                <td className={ui.td}>{i.name}</td>
                <td className={`${ui.td} text-right`}>{vnd(i.price)}</td>
                <td className={`${ui.td} text-right`}>{i.qty}</td>
                <td className={`${ui.td} text-right`}>{vnd(i.price * i.qty)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t bg-gray-50"><td colSpan={3} className={`${ui.td} text-right font-semibold`}>Tổng cộng</td><td className={`${ui.td} text-right text-lg font-bold text-accent`}>{vnd(o.total)}</td></tr></tfoot>
        </table>
      </div>

      {/* Shipping / COD & KiotViet Sync Cards (Chuẩn KiotViet) */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 print:hidden">
        <form action={saveOrderShippingAction} className={`${ui.card} p-5 space-y-3`}>
          <input type="hidden" name="id" value={o.id} />
          <h2 className="text-sm font-bold text-gray-900">🚚 Vận đơn &amp; Đối soát COD</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={ui.label}>Đơn vị vận chuyển</label>
              <select name="shipping_carrier" defaultValue={ship?.shipping_carrier ?? ""} className={ui.input}>
                <option value="">-- Chọn ĐVVC --</option>
                <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                <option value="Viettel Post">Viettel Post</option>
                <option value="J&T">J&amp;T Express</option>
                <option value="Giao nội bộ">Giao nội bộ / Khách lấy</option>
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
      </div>
    </div>
  );
}
