import { requireAdmin } from "@/lib/auth";
import { getCrmCustomers } from "@/lib/crm";
import CrmDashboardClient from "@/components/admin/CrmDashboardClient";

export default async function AdminCrmPage() {
  await requireAdmin();
  const customers = await getCrmCustomers();
  return <CrmDashboardClient initialCustomers={customers} />;
}
