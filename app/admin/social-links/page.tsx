import SocialLinksAdminClient from "@/components/admin/SocialLinksAdminClient";
import { PageHeader } from "@/components/admin/ui";
import { requireRole } from "@/lib/auth";
import { getSocialLinksConfig } from "@/lib/social-links";

export const metadata = { title: "Liên kết Mạng xã hội & Sàn TMĐT | Quản trị" };

export default async function SocialLinksAdminPage() {
  await requireRole(["super_admin", "admin", "editor"]);
  const config = await getSocialLinksConfig();

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader title="Liên kết Mạng xã hội & Sàn TMĐT" />
      <SocialLinksAdminClient initialConfig={config} />
    </div>
  );
}
