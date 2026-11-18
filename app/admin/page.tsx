import Link from "next/link";
import { Flash, PageHeader, StatusBadge, ui } from "@/components/admin/ui";
import { getStats, listOrders } from "@/lib/admin-data";
import { currentAdmin, hasAdmin } from "@/lib/auth";
import { vnd } from "@/lib/site";
import { loginAction, setupAction } from "./actions";

export const metadata = { title: "Quản trị" };

function Stat({ label, value, href, tone = "" }: { label: string; value: string | number; href?: string; tone?: string }) {
  const body = (
    <div className={`${ui.card} p-5 ${href ? "transition hover:shadow-md" : ""}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const admin = await currentAdmin();

  if (!admin) {
    const first = !(await hasAdmin());
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <div className={`${ui.card} p-6`}>
          <h1 className="mb-1 text-2xl font-bold">{first ? "Tạo tài khoản admin" : "Đăng nhập quản trị"}</h1>
          {first && <p className="mb-2 text-sm text-gray-500">Chưa có admin nào. Tạo tài khoản đầu tiên để bắt đầu.</p>}
          <div className="mt-3"><Flash error={sp.error} /></div>
          <form action={first ? setupAction : loginAction} className="space-y-3">
            <input name="email" type="email" required placeholder="Email" autoComplete="username" className={ui.input} />
            <input
              name="password"
              type="password"
              required
              minLength={first ? 8 : undefined}
              placeholder={first ? "Mật khẩu (tối thiểu 8 ký tự)" : "Mật khẩu"}
              autoComplete={first ? "new-password" : "current-password"}
              className={ui.input}
            />
            {first && <input name="password2" type="password" required placeholder="Nhập lại mật khẩu" autoComplete="new-password" className={ui.input} />}
            <button className={`${ui.primary} w-full`}>{first ? "Tạo tài khoản" : "Đăng nhập"}</button>
          </form>
        </div>
      </div>
    );
  }

  const [s, ordersData] = await Promise.all([getStats(), listOrders({ page: 1 })]);
  const recent = ordersData.rows.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Tổng quan" />
      <Flash saved={sp.saved} error={sp.error} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Đơn mới cần xử lý" value={s.ordersNew} href="/admin/orders/?status=new" tone={s.ordersNew ? "text-red-600" : ""} />
        <Stat label="Doanh thu 30 ngày" value={vnd(s.revenue30)} />
        <Stat label="Tổng doanh thu" value={vnd(s.revenue)} />
        <Stat label="Tổng số đơn" value={s.ordersTotal} href="/admin/orders/" />
        <Stat label="Sản phẩm" value={s.products} href="/admin/products/" />
        <Stat label="Sắp hết / Hết hàng" value={`${s.lowStock} / ${s.outOfStock}`} href="/admin/products/?stock=out" tone={s.outOfStock ? "text-red-600" : s.lowStock ? "text-amber-600" : ""} />
        <Stat label="Bài viết" value={s.posts} href="/admin/posts/" />
        <Stat label="Block thường dùng" value={s.blocks} href="/admin/blocks/" />
        <Stat label="Video bài giảng" value={s.videos} href="/admin/videos/" />
        <Stat label="Tài liệu & Sách" value={s.documents} href="/admin/documents/" />
        <Stat label="Thành viên / Email" value={`${s.members} / ${s.subscribers}`} href="/admin/members/" />
        <Stat label="Bình luận" value={s.comments} href="/admin/comments/" />
      </div>

      <div className={`${ui.card} mt-8`}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Đơn hàng gần đây</h2>
          <Link href="/admin/orders/" className="text-sm text-brand hover:underline">Xem tất cả »</Link>
        </div>
        {recent.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">Chưa có đơn hàng nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr><th className={ui.th}>Mã</th><th className={ui.th}>Khách</th><th className={ui.th}>Tổng</th><th className={ui.th}>Trạng thái</th><th className={ui.th}>Ngày</th></tr></thead>
              <tbody className="divide-y">
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className={ui.td}><Link href={`/admin/orders/${o.id}/`} className="font-medium text-brand hover:underline">{o.code}</Link></td>
                    <td className={ui.td}>{o.name}<div className="text-xs text-gray-500">{o.phone}</div></td>
                    <td className={ui.td}>{vnd(o.total)}</td>
                    <td className={ui.td}><StatusBadge status={o.status} /></td>
                    <td className={ui.td}>{o.created_at.slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
