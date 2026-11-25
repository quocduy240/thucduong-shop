import Link from "next/link";
import { rollbackAuditLogAction } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageHeader, strParam, ui } from "@/components/admin/ui";
import { getActionableSystemNotifications, listAuditLogs, type AuditSeverity } from "@/lib/audit-log";
import { requireAdminPath } from "@/lib/auth";
import { ROLE_META, type AdminRole } from "@/lib/rbac";

export const metadata = { title: "Nhật ký Thao tác & Đối soát (Audit Log) | Quản trị" };

const MODULE_LABELS: Record<string, { label: string; icon: string; badge: string }> = {
  products: { label: "Hàng hóa & Bảng giá", icon: "📦", badge: "bg-emerald-100 text-emerald-800" },
  inventory: { label: "Kho hàng & Kiểm kho", icon: "📋", badge: "bg-blue-100 text-blue-800" },
  cashbook: { label: "Sổ quỹ 3 Quỹ", icon: "📒", badge: "bg-indigo-100 text-indigo-800" },
  orders: { label: "Đơn hàng & Vận đơn", icon: "🧾", badge: "bg-amber-100 text-amber-800" },
  categories: { label: "Danh mục & Menu", icon: "🗂️", badge: "bg-purple-100 text-purple-800" },
  posts: { label: "Bài viết & Kiến thức", icon: "📝", badge: "bg-cyan-100 text-cyan-800" },
  blocks: { label: "Block Giao diện", icon: "🧩", badge: "bg-teal-100 text-teal-800" },
  frontend_live_edit: { label: "Sửa trực tiếp ngoài Web", icon: "⚡", badge: "bg-amber-100 text-amber-900" },
  settings: { label: "Cài đặt & SOP", icon: "⚙️", badge: "bg-gray-100 text-gray-800" },
  system: { label: "Hệ thống", icon: "🛡️", badge: "bg-gray-100 text-gray-700" },
};

const SEVERITY_META: Record<AuditSeverity, { label: string; badge: string }> = {
  info: { label: "🔵 Thông thường", badge: "bg-sky-50 text-sky-800 border border-sky-200" },
  warning: { label: "🟠 Quan trọng (Giá/Tồn/Quỹ)", badge: "bg-amber-50 text-amber-900 border border-amber-300" },
  critical: { label: "🔴 Nghiêm trọng (Xóa/Hủy/Hoàn)", badge: "bg-red-50 text-red-800 border border-red-300" },
};

export default async function AuditLogsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requireAdminPath("/admin/audit-logs/");
  const sp = await searchParams;
  const modFilter = strParam(sp.module) || "all";
  const sevFilter = strParam(sp.severity) || "all";
  const actorFilter = strParam(sp.actor) || "all";
  const q = strParam(sp.q);
  const msg = strParam(sp.msg);

  const [{ rows, stats, actors }, notifications] = await Promise.all([
    listAuditLogs({
      module: modFilter,
      severity: sevFilter,
      actor: actorFilter,
      q,
      limit: 120,
    }),
    getActionableSystemNotifications(me.role),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <PageHeader title="🛡️ Nhật ký Kiểm toán (Log Audit), Quy trách nhiệm & Trung tâm Thông báo Phân cấp">
        <Link href="/admin/inventory/?tab=eod" className={ui.secondary}>
          📊 Báo cáo chốt ca cuối ngày
        </Link>
        <a href="/api/admin/backup/" className={ui.primary}>
          💾 Sao lưu D1 (.JSON)
        </a>
      </PageHeader>

      <Flash saved={strParam(sp.saved)} error={strParam(sp.error)} />
      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-800">
          ✅ {msg}
        </div>
      )}

      {/* 1. HIERARCHICAL ACTIONABLE NOTIFICATION & TASK ROUTING CENTER */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">
              🔔 Trung tâm Thông báo Hệ thống, Hàng hóa &amp; Khách hàng (Phân cấp P1 → P3 &amp; Định hướng đúng người)
            </h2>
            <p className="text-xs text-gray-500">
              Hệ thống tự động quét tồn kho, lô hàng FEFO, công nợ NCC, đơn mới và lịch hẹn khách hàng để phân công đúng bộ phận xử lý.
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
            Vai trò của bạn: {ROLE_META[me.role]?.label ?? me.role}
          </span>
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center text-sm font-semibold text-emerald-800">
            🎉 Tuyệt vời! Hiện tại không có cảnh báo tồn đọng nào cần xử lý.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {notifications.map((n) => {
              const cardStyle =
                n.priority === "P1"
                  ? "border-red-300 bg-red-50/60"
                  : n.priority === "P2"
                    ? "border-amber-300 bg-amber-50/50"
                    : "border-sky-200 bg-sky-50/50";
              const badgeStyle =
                n.priority === "P1"
                  ? "bg-red-600 text-white"
                  : n.priority === "P2"
                    ? "bg-amber-600 text-white"
                    : "bg-sky-700 text-white";
              return (
                <div
                  key={n.id}
                  className={`flex flex-col justify-between rounded-xl border p-4 transition ${cardStyle}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${badgeStyle}`}>
                        {n.priorityLabel} · {n.categoryLabel}
                      </span>
                      <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-bold text-gray-700 shadow-2xs">
                        🎯 {n.targetDeptLabel}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-gray-900">{n.title}</h3>
                    <p className="text-xs leading-relaxed text-gray-600">{n.detail}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2.5">
                    <span className="text-[11px] font-semibold text-gray-500">
                      {n.isForCurrentRole ? "✓ Thuộc phạm vi trách nhiệm của bạn" : "Phối hợp liên bộ phận"}
                    </span>
                    <Link
                      href={n.actionHref}
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-extrabold text-white shadow-2xs hover:bg-brand-dark"
                    >
                      {n.actionLabel}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. AUDIT LOG KPI CARDS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-bold text-gray-500">📜 Tổng bản ghi Nhật ký</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{stats.total}</div>
          <div className="mt-0.5 text-[11px] text-gray-500">Lưu vết toàn bộ lịch sử thao tác</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-bold text-gray-500">📅 Thao tác trong hôm nay</div>
          <div className="mt-1 text-2xl font-extrabold text-brand">{stats.todayCount}</div>
          <div className="mt-0.5 text-[11px] text-gray-500">Theo múi giờ Việt Nam (UTC+7)</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
          <div className="text-xs font-bold text-amber-900">🟠 Biến động Giá / Tồn / Quỹ</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-700">{stats.warningCount}</div>
          <div className="mt-0.5 text-[11px] text-amber-800">Cần đối soát khi chốt ca</div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4">
          <div className="text-xs font-bold text-red-900">🔴 Thao tác Xóa / Hủy / Hoàn</div>
          <div className="mt-1 text-2xl font-extrabold text-red-600">{stats.criticalCount}</div>
          <div className="mt-0.5 text-[11px] text-red-800">Giám sát rủi ro &amp; quy trách nhiệm</div>
        </div>
      </div>

      {/* 3. FILTER BAR */}
      <form method="get" action="/admin/audit-logs/" className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-4 shadow-2xs">
        <input
          name="q"
          defaultValue={q}
          placeholder="🔍 Tìm theo tên SP, mã SKU, mã đơn, nội dung sửa hoặc email nhân viên..."
          className={`${ui.input} flex-1 min-w-[240px]`}
        />
        <select name="module" defaultValue={modFilter} className={`${ui.input} max-w-[200px]`}>
          <option value="all">Tất cả phân hệ</option>
          {Object.entries(MODULE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.icon} {v.label}
            </option>
          ))}
        </select>
        <select name="severity" defaultValue={sevFilter} className={`${ui.input} max-w-[210px]`}>
          <option value="all">Tất cả mức độ</option>
          <option value="critical">🔴 Nghiêm trọng (Xóa/Hủy/Hoàn)</option>
          <option value="warning">🟠 Quan trọng (Giá/Tồn/Quỹ)</option>
          <option value="info">🔵 Thông thường</option>
        </select>
        <select name="actor" defaultValue={actorFilter} className={`${ui.input} max-w-[200px]`}>
          <option value="all">Tất cả người thực hiện</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              👤 {a}
            </option>
          ))}
        </select>
        <button className={ui.primary}>Lọc nhật ký</button>
        {(modFilter !== "all" || sevFilter !== "all" || actorFilter !== "all" || q) && (
          <Link href="/admin/audit-logs/" className={ui.secondary}>
            Bỏ lọc
          </Link>
        )}
      </form>

      {/* 4. AUDIT LOG TABLE WITH BEFORE/AFTER DIFF & 1-CLICK ROLLBACK */}
      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className={ui.th}>Mã / Thời gian</th>
              <th className={ui.th}>Người thực hiện</th>
              <th className={ui.th}>Phân hệ &amp; Mức độ</th>
              <th className={ui.th}>Đối tượng tác động</th>
              <th className={ui.th}>Chi tiết thay đổi (Trước → Sau)</th>
              <th className={`${ui.th} text-right`}>Hoàn tác / Đối soát</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => {
              const modMeta = MODULE_LABELS[r.module] ?? MODULE_LABELS.system;
              const sevMeta = SEVERITY_META[r.severity] ?? SEVERITY_META.info;
              const roleMeta = ROLE_META[(r.actor_role as AdminRole) || "admin"] ?? ROLE_META.admin;
              const canRollback =
                r.rolled_back === 0 &&
                Boolean(r.before_json) &&
                r.action !== "delete" &&
                r.action !== "create" &&
                (r.entity_type === "product" || r.entity_type === "product_category" || r.entity_type === "post");

              return (
                <tr key={r.id} className="hover:bg-gray-50/70">
                  <td className={`${ui.td} whitespace-nowrap`}>
                    <div className="font-mono text-xs font-bold text-gray-800">#LOG-{r.id}</div>
                    <div className="text-[11px] text-gray-500">{r.created_at.slice(0, 16)}</div>
                  </td>
                  <td className={ui.td}>
                    <div className="font-bold text-gray-900">{r.actor_name || r.actor_email}</div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleMeta.badge}`}>
                        {roleMeta.shortLabel}
                      </span>
                      <span className="text-[11px] text-gray-500">{r.actor_email}</span>
                    </div>
                  </td>
                  <td className={ui.td}>
                    <div className="flex flex-col items-start gap-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${modMeta.badge}`}>
                        {modMeta.icon} {modMeta.label}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sevMeta.badge}`}>
                        {sevMeta.label}
                      </span>
                    </div>
                  </td>
                  <td className={ui.td}>
                    <div className="font-bold text-gray-900">{r.entity_label}</div>
                    <div className="font-mono text-[11px] text-gray-500">
                      {r.entity_type} #{r.entity_id} · {r.action}
                    </div>
                  </td>
                  <td className={`${ui.td} max-w-md`}>
                    <div className="text-xs font-medium leading-relaxed text-gray-800">{r.diff_summary}</div>
                    {(r.before_json || r.after_json) && (
                      <details className="mt-1 text-[11px] text-gray-500">
                        <summary className="cursor-pointer font-semibold text-brand hover:underline">
                          🔍 Xem dữ liệu gốc Trước / Sau (JSON Snapshot)
                        </summary>
                        <div className="mt-1.5 grid gap-2 rounded-lg border bg-gray-900 p-2.5 font-mono text-[10px] text-emerald-300 sm:grid-cols-2">
                          <div>
                            <div className="mb-1 font-bold text-amber-300">TRƯỚC KHI SỬA:</div>
                            <pre className="max-h-36 overflow-auto whitespace-pre-wrap">
                              {r.before_json ? JSON.stringify(JSON.parse(r.before_json), null, 2) : "—"}
                            </pre>
                          </div>
                          <div>
                            <div className="mb-1 font-bold text-emerald-300">SAU KHI SỬA:</div>
                            <pre className="max-h-36 overflow-auto whitespace-pre-wrap">
                              {r.after_json ? JSON.stringify(JSON.parse(r.after_json), null, 2) : "—"}
                            </pre>
                          </div>
                        </div>
                      </details>
                    )}
                  </td>
                  <td className={`${ui.td} text-right whitespace-nowrap`}>
                    {r.rolled_back === 1 ? (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">
                        ✓ Đã hoàn tác
                      </span>
                    ) : canRollback ? (
                      <form action={rollbackAuditLogAction}>
                        <input type="hidden" name="log_id" value={r.id} />
                        <ConfirmButton
                          message={`Khôi phục "${r.entity_label}" về trạng thái trước thao tác #LOG-${r.id}?`}
                          className="cursor-pointer rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-900 hover:bg-amber-500 hover:text-white transition"
                        >
                          ⏪ Hoàn tác 1 chạm
                        </ConfirmButton>
                      </form>
                    ) : (
                      <span className="text-xs text-gray-400">Đã lưu vết</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm text-gray-500">
                  Chưa có bản ghi nhật ký nào khớp bộ lọc. Mọi thao tác sửa Hàng hóa, Giá bán, Kho, Sổ quỹ, Đơn hàng hoặc Sửa trực tiếp ngoài Frontend sẽ tự động xuất hiện tại đây.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
