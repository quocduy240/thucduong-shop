import Link from "next/link";
import AdminHandbookDrawer from "@/components/admin/AdminHandbookDrawer";
import AdminNav from "@/components/admin/AdminNav";
import { getStats } from "@/lib/admin-data";
import { currentAdmin } from "@/lib/auth";
import { ROLE_META } from "@/lib/rbac";
import { getSite } from "@/lib/settings";
import { logoutAction } from "./actions";

// The admin area is a full-screen layer that covers the shop's Header/Footer from the root layout.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await currentAdmin();
  if (!admin) return <div className="fixed inset-0 z-50 overflow-auto bg-gray-50">{children}</div>;

  const [site, stats] = await Promise.all([getSite(), getStats()]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 md:flex-row">
      <aside className="shrink-0 border-b bg-white p-3 md:flex md:w-64 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:p-4">
        <div className="mb-3 flex items-center justify-between md:mb-6 md:block">
          <div>
            <div className="text-lg font-bold text-brand">{site.name}</div>
            <div className="text-xs text-gray-500">Trang quản trị</div>
          </div>
          <Link href="/" target="_blank" className="text-xs text-gray-500 hover:underline md:mt-1 md:inline-block">Xem website ↗</Link>
        </div>
        <AdminNav newOrders={stats.ordersNew} crmFollowupsDue={stats.crmFollowupsDue} role={admin.role} />
        <form action={logoutAction} className="mt-3 md:mt-auto md:pt-6">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold text-gray-700">{admin.name || admin.email}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_META[admin.role].badge}`}>
              {ROLE_META[admin.role].shortLabel}
            </span>
          </div>
          {admin.name && <div className="mb-2 truncate text-[11px] text-gray-400">{admin.email}</div>}
          <button className="w-full rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Đăng xuất</button>
        </form>
      </aside>
      <div className="min-w-0 flex-1 overflow-auto p-4 md:p-8">{children}</div>
      <AdminHandbookDrawer />
    </div>
  );
}
