import { requireAdmin } from "@/lib/auth";
import { getCrmDashboardData } from "@/lib/crm";
import CrmDashboardClient from "@/components/admin/CrmDashboardClient";

export default async function AdminCrmPage() {
  await requireAdmin();
  const data = await getCrmDashboardData();
  return (
    <CrmDashboardClient
      initialCustomers={data.customers}
      initialAnalytics={data.analytics}
      initialQueue={data.automationQueue}
      initialTags={data.allTags}
    />
  );
}
