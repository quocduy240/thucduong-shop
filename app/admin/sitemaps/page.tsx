import { requireAdminPath } from "@/lib/auth";
import { buildSitemapEntries } from "@/lib/sitemaps";
import SitemapManagerClient from "@/components/admin/SitemapManagerClient";

export default async function AdminSitemapsPage() {
  await requireAdminPath("/admin/sitemaps/");
  const data = await buildSitemapEntries();

  return (
    <SitemapManagerClient
      initialConfig={data.config}
      initialCounts={data.counts}
      initialTotal={data.entries.length}
      sampleUrls={data.entries.slice(0, 15)}
    />
  );
}
