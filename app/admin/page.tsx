import Link from "next/link";
import { Flash, PageHeader, StatusBadge, ui } from "@/components/admin/ui";
import { getStats, listOrders } from "@/lib/admin-data";
import { getActionableSystemNotifications, listAuditLogs } from "@/lib/audit-log";
import { currentAdmin, hasAdmin } from "@/lib/auth";
import { ROLE_META } from "@/lib/rbac";
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
            <input
              name={first ? "email" : "identifier"}
              type={first ? "email" : "text"}
              required
              placeholder={first ? "Email" : "Email hoặc Số điện thoại"}
              autoComplete="username"
              className={ui.input}
            />
            {first && (
              <input
                name="phone"
                type="tel"
                placeholder="Số điện thoại đăng nhập (tùy chọn)"
                autoComplete="tel"
                className={ui.input}
              />
            )}
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

  const [s, ordersData, notifications, recentAudits] = await Promise.all([
    getStats(),
    listOrders({ page: 1 }),
    getActionableSystemNotifications(admin.role),
    listAuditLogs({ limit: 8 }),
  ]);
  const recent = ordersData.rows.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader title="📊 Bảng điều khiển Trung tâm & Điều phối Công việc">
        <Link href="/admin/pos/" className={ui.primary}>
          🛒 Mở Bán hàng tại quầy (POS)
        </Link>
        <Link href="/admin/audit-logs/" className={ui.secondary}>
          🛡️ Nhật ký Kiểm toán (Log Audit)
        </Link>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />

      {/* 1. Hierarchical Actionable Notification & Task Routing Center */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
          <div>
            <h2 className="text-sm font-extrabold text-gray-900">
              🔔 Luồng Công Việc &amp; Cảnh Báo Phân Cấp Hôm Nay ({notifications.length} mục)
            </h2>
            <p className="text-xs text-gray-500">
              Sắp xếp theo thứ tự ưu tiên: 🔴 P1 Khẩn cấp → 🟠 P2 Trong ca trực → 🔵 P3 Đối soát &amp; Tối ưu
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_META[admin.role].badge}`}>
            👤 {admin.name || admin.email} · {ROLE_META[admin.role].shortLabel}
          </span>
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4 text-center text-xs font-semibold text-emerald-800">
            ✓ Mọi chỉ số Đơn hàng, Tồn kho và Chăm sóc khách hàng đều đã được xử lý sạch sẽ!
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex flex-col justify-between rounded-xl border p-3.5 ${
                  n.priority === "P1"
                    ? "border-red-300 bg-red-50/60"
                    : n.priority === "P2"
                      ? "border-amber-300 bg-amber-50/50"
                      : "border-sky-200 bg-sky-50/50"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white ${
                        n.priority === "P1"
                          ? "bg-red-600"
                          : n.priority === "P2"
                            ? "bg-amber-600"
                            : "bg-sky-700"
                      }`}
                    >
                      {n.priorityLabel}
                    </span>
                    <span className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                      🎯 {n.targetDeptLabel}
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-gray-900">{n.title}</div>
                  <p className="text-[11px] text-gray-600">{n.detail}</p>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-black/5 pt-2">
                  <span className="text-[10px] font-semibold text-gray-500">
                    {n.isForCurrentRole ? "✓ Giao cho vai trò của bạn" : "Phối hợp bộ phận"}
                  </span>
                  <Link
                    href={n.actionHref}
                    className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-brand-dark"
                  >
                    {n.actionLabel}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Đơn mới cần xử lý" value={s.ordersNew} href="/admin/orders/?status=new" tone={s.ordersNew ? "text-red-600" : ""} />
        <Stat label="Doanh thu 30 ngày" value={vnd(s.revenue30)} href="/admin/inventory/?tab=eod" />
        <Stat label="Tổng doanh thu" value={vnd(s.revenue)} href="/admin/inventory/?tab=cashbook" />
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

      <div className="grid gap-6 lg:grid-cols-12">
        <div className={`${ui.card} lg:col-span-7`}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold text-sm">🧾 Đơn hàng gần đây</h2>
            <Link href="/admin/orders/" className="text-xs font-bold text-brand hover:underline">Xem tất cả »</Link>
          </div>
          {recent.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">Chưa có đơn hàng nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
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

        {/* Recent Audit Logs Widget on Dashboard */}
        <div className={`${ui.card} lg:col-span-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold text-sm">🛡️ Nhật ký thao tác mới nhất (Log Audit)</h2>
              <Link href="/admin/audit-logs/" className="text-xs font-bold text-brand hover:underline">
                Đối soát &amp; Hoàn tác »
              </Link>
            </div>
            {recentAudits.rows.length === 0 ? (
              <p className="p-6 text-center text-xs text-gray-500">
                Chưa có thao tác nào được ghi nhận. Mọi chỉnh sửa giá, tồn kho, đơn hàng sẽ hiển thị tại đây.
              </p>
            ) : (
              <div className="divide-y">
                {recentAudits.rows.map((log) => (
                  <div key={log.id} className="px-4 py-2.5 text-xs space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-900 truncate">{log.entity_label}</span>
                      <span className="shrink-0 font-mono text-[10px] text-gray-400">
                        {log.created_at.slice(11, 16)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2">{log.diff_summary}</p>
                    <div className="text-[10px] text-gray-400">
                      👤 {log.actor_name || log.actor_email} · #{log.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
