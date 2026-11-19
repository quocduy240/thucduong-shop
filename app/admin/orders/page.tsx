import Link from "next/link";
import { Flash, PageHeader, Pagination, StatusBadge, pageParam, strParam, ui } from "@/components/admin/ui";
import { ORDER_STATUS, countOrdersByStatus, listOrders, type OrderSort } from "@/lib/admin-data";
import { requireRole } from "@/lib/auth";
import { vnd } from "@/lib/site";

export const metadata = { title: "Đơn hàng | Quản trị" };

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function OrdersAdmin({ searchParams }: PageProps<"/admin/orders">) {
  await requireRole(["super_admin", "admin", "sales"]);
  const sp = await searchParams;
  const status = strParam(sp.status);
  const q = strParam(sp.q);
  const payment = strParam(sp.payment);
  const date = strParam(sp.date);
  const month = strParam(sp.month);
  const year = strParam(sp.year);
  const from = strParam(sp.from);
  const to = strParam(sp.to);
  const sortRaw = strParam(sp.sort);
  const sort: OrderSort =
    sortRaw === "oldest" || sortRaw === "total_desc" || sortRaw === "total_asc" ? sortRaw : "newest";
  const page = pageParam(sp.page);

  const filterOpts = { status, q, payment, date, month, year, from, to, sort };
  const [{ rows, total, revenueTotal }, statusCounts] = await Promise.all([
    listOrders({ ...filterOpts, page }),
    countOrdersByStatus({ q, payment, date, month, year, from, to }),
  ]);

  const counts = Object.fromEntries(statusCounts.map((c) => [c.status, c.n]));
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

  const baseParams: Record<string, string> = {};
  if (status) baseParams.status = status;
  if (q) baseParams.q = q;
  if (payment) baseParams.payment = payment;
  if (date) baseParams.date = date;
  if (month) baseParams.month = month;
  if (year) baseParams.year = year;
  if (from) baseParams.from = from;
  if (to) baseParams.to = to;
  if (sort !== "newest") baseParams.sort = sort;

  const buildHref = (overrides: Record<string, string | undefined>, base = "/admin/orders/") => {
    const merged = new URLSearchParams();
    const combined: Record<string, string | undefined> = { ...baseParams, ...overrides };
    for (const [k, v] of Object.entries(combined)) {
      if (v) merged.set(k, v);
    }
    const qs = merged.toString();
    return qs ? `${base}?${qs}` : base;
  };

  // Quick date preset targets (relative to current server date)
  const now = new Date();
  const todayStr = isoDate(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = isoDate(yesterday);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  const sevenDaysAgoStr = isoDate(sevenDaysAgo);

  const curYear = String(now.getFullYear());
  const curMonth = String(now.getMonth() + 1);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = String(prevMonthDate.getMonth() + 1);
  const prevMonthYear = String(prevMonthDate.getFullYear());

  const quickPresets = [
    {
      label: "Hôm nay",
      active: date === todayStr,
      href: buildHref({ date: todayStr, month: undefined, year: undefined, from: undefined, to: undefined }),
    },
    {
      label: "Hôm qua",
      active: date === yesterdayStr,
      href: buildHref({ date: yesterdayStr, month: undefined, year: undefined, from: undefined, to: undefined }),
    },
    {
      label: "7 ngày qua",
      active: from === sevenDaysAgoStr && to === todayStr,
      href: buildHref({ date: undefined, month: undefined, year: undefined, from: sevenDaysAgoStr, to: todayStr }),
    },
    {
      label: "Tháng này",
      active: !date && month === curMonth && year === curYear,
      href: buildHref({ date: undefined, month: curMonth, year: curYear, from: undefined, to: undefined }),
    },
    {
      label: "Tháng trước",
      active: !date && month === prevMonth && year === prevMonthYear,
      href: buildHref({ date: undefined, month: prevMonth, year: prevMonthYear, from: undefined, to: undefined }),
    },
    {
      label: "Năm nay",
      active: !date && !month && year === curYear && !from && !to,
      href: buildHref({ date: undefined, month: undefined, year: curYear, from: undefined, to: undefined }),
    },
  ];

  const hasActiveFilters = Boolean(q || payment || date || month || year || from || to || sort !== "newest");
  const yearsList = Array.from({ length: 6 }, (_, i) => String(now.getFullYear() - i));

  const tab = (key: string, label: string, n: number) => (
    <Link
      key={key}
      href={buildHref({ status: key || undefined })}
      className={`rounded-full px-3 py-1.5 text-sm ${status === key ? "bg-brand text-white" : "border bg-white text-gray-700 hover:bg-gray-50"}`}
    >
      {label} <span className="opacity-70">({n})</span>
    </Link>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title="Đơn hàng">
        <a href={buildHref({}, "/admin/orders/export")} className={ui.secondary}>
          ⬇ Xuất CSV {hasActiveFilters || status ? "(theo bộ lọc)" : ""}
        </a>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />

      {/* Status Tabs (preserve date/search/sort filters) */}
      <div className="flex flex-wrap gap-2">
        {tab("", "Tất cả", allCount)}
        {Object.entries(ORDER_STATUS).map(([k, label]) => tab(k, label, counts[k] ?? 0))}
      </div>

      {/* Quick Date Presets + Multi-criteria Filter Bar */}
      <div className={`${ui.card} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-bold text-gray-600">⏱️ Lọc nhanh:</span>
            {quickPresets.map((p) => (
              <Link
                key={p.label}
                href={p.href}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${p.active
                  ? "bg-brand text-white"
                  : "border border-gray-200 bg-gray-50 text-gray-700 hover:border-brand hover:text-brand"
                  }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
          {hasActiveFilters && (
            <Link
              href={status ? `/admin/orders/?status=${status}` : "/admin/orders/"}
              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              ↺ Xoá bộ lọc
            </Link>
          )}
        </div>

        <form className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="lg:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Tìm kiếm</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Mã đơn, tên, SĐT..."
              className={`${ui.input} text-xs`}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Ngày cụ thể</label>
            <input type="date" name="date" defaultValue={date} className={`${ui.input} text-xs`} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Tháng</label>
            <select name="month" defaultValue={month} className={`${ui.input} text-xs`}>
              <option value="">-- Tháng --</option>
              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Năm</label>
            <select name="year" defaultValue={year} className={`${ui.input} text-xs`}>
              <option value="">-- Năm --</option>
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Từ ngày</label>
            <input type="date" name="from" defaultValue={from} className={`${ui.input} text-xs`} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Đến ngày</label>
            <input type="date" name="to" defaultValue={to} className={`${ui.input} text-xs`} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Thanh toán</label>
            <select name="payment" defaultValue={payment} className={`${ui.input} text-xs`}>
              <option value="">Tất cả</option>
              <option value="cod">COD (Tiền mặt)</option>
              <option value="bank">Chuyển khoản</option>
            </select>
          </div>
          <div className="sm:col-span-2 md:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Sắp xếp theo</label>
            <select name="sort" defaultValue={sort} className={`${ui.input} text-xs`}>
              <option value="newest">🕒 Mới nhất → Cũ nhất</option>
              <option value="oldest">🕰️ Cũ nhất → Mới nhất</option>
              <option value="total_desc">💰 Giá trị đơn: Cao → Thấp</option>
              <option value="total_asc">💵 Giá trị đơn: Thấp → Cao</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className={`${ui.primary} w-full text-xs py-2.5`}>🔍 Lọc đơn hàng</button>
          </div>
        </form>
      </div>

      {/* Summary KPI Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            📦 Tìm thấy: <strong className="text-gray-900">{total}</strong> đơn hàng
          </span>
          <span>
            💰 Doanh thu (trừ đơn huỷ): <strong className="text-brand">{vnd(revenueTotal)}</strong>
          </span>
        </div>
        <span className="text-xs text-gray-600">
          Sắp xếp:{" "}
          <strong>
            {sort === "oldest"
              ? "Cũ nhất → Mới nhất"
              : sort === "total_desc"
                ? "Tổng tiền Cao → Thấp"
                : sort === "total_asc"
                  ? "Tổng tiền Thấp → Cao"
                  : "Mới nhất → Cũ nhất"}
          </strong>
        </span>
      </div>

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className={ui.th}>Mã đơn</th>
              <th className={ui.th}>Khách hàng</th>
              <th className={ui.th}>Tổng tiền</th>
              <th className={ui.th}>Thanh toán</th>
              <th className={ui.th}>Trạng thái</th>
              <th className={ui.th}>Ngày đặt</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className={ui.td}>
                  <Link href={`/admin/orders/${o.id}/`} className="font-medium text-brand hover:underline">
                    {o.code}
                  </Link>
                </td>
                <td className={ui.td}>
                  {o.name}
                  <div className="text-xs text-gray-500">{o.phone}</div>
                </td>
                <td className={`${ui.td} font-medium`}>{vnd(o.total)}</td>
                <td className={ui.td}>{o.payment === "bank" ? "Chuyển khoản" : "COD"}</td>
                <td className={ui.td}>
                  <StatusBadge status={o.status} />
                </td>
                <td className={`${ui.td} whitespace-nowrap`}>{o.created_at.slice(0, 16)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-gray-500">
                  Không có đơn hàng nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination basePath="/admin/orders/" page={page} total={total} params={baseParams} />
    </div>
  );
}
