import Link from "next/link";
import { Flash, PageHeader, Pagination, StatusBadge, pageParam, strParam, ui } from "@/components/admin/ui";
import { ORDER_STATUS, countOrdersByStatus, listOrders } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { vnd } from "@/lib/site";

export const metadata = { title: "Đơn hàng | Quản trị" };

export default async function OrdersAdmin({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = strParam(sp.status);
  const q = strParam(sp.q);
  const page = pageParam(sp.page);
  const [{ rows, total }, statusCounts] = await Promise.all([
    listOrders({ status, q, page }),
    countOrdersByStatus(),
  ]);
  const counts = Object.fromEntries(statusCounts.map((c) => [c.status, c.n]));
  const all = Object.values(counts).reduce((a, b) => a + b, 0);

  const tab = (key: string, label: string, n: number) => (
    <Link
      key={key}
      href={key ? `/admin/orders/?status=${key}` : "/admin/orders/"}
      className={`rounded-full px-3 py-1.5 text-sm ${status === key ? "bg-brand text-white" : "border bg-white text-gray-700 hover:bg-gray-50"}`}
    >
      {label} <span className="opacity-70">({n})</span>
    </Link>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Đơn hàng">
        <a href="/admin/orders/export" className={ui.secondary}>⬇ Xuất CSV</a>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />
      <div className="mb-4 flex flex-wrap gap-2">
        {tab("", "Tất cả", all)}
        {Object.entries(ORDER_STATUS).map(([k, label]) => tab(k, label, counts[k] ?? 0))}
      </div>
      <form className="mb-4 flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Tìm mã đơn, tên, số điện thoại..." className={`${ui.input} max-w-sm`} />
        <button className={ui.secondary}>Tìm</button>
      </form>

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr><th className={ui.th}>Mã đơn</th><th className={ui.th}>Khách hàng</th><th className={ui.th}>Tổng tiền</th><th className={ui.th}>Thanh toán</th><th className={ui.th}>Trạng thái</th><th className={ui.th}>Ngày đặt</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className={ui.td}><Link href={`/admin/orders/${o.id}/`} className="font-medium text-brand hover:underline">{o.code}</Link></td>
                <td className={ui.td}>{o.name}<div className="text-xs text-gray-500">{o.phone}</div></td>
                <td className={`${ui.td} font-medium`}>{vnd(o.total)}</td>
                <td className={ui.td}>{o.payment === "bank" ? "Chuyển khoản" : "COD"}</td>
                <td className={ui.td}><StatusBadge status={o.status} /></td>
                <td className={`${ui.td} whitespace-nowrap`}>{o.created_at.slice(0, 16)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-sm text-gray-500">Chưa có đơn hàng nào.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination basePath="/admin/orders/" page={page} total={total} params={{ status, q }} />
    </div>
  );
}
