import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash, PageHeader, StatusBadge, ui } from "@/components/admin/ui";
import PrintButton from "@/components/admin/PrintButton";
import { ORDER_STATUS, getOrder } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { vnd } from "@/lib/site";
import { updateOrderStatusAction } from "../../actions";

export const metadata = { title: "Chi tiết đơn | Quản trị" };

export default async function OrderDetail({ params, searchParams }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const sp = await searchParams;
  const data = Number.isInteger(id) ? await getOrder(id) : undefined;
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
    </div>
  );
}
