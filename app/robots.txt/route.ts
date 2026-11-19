import { getSitemapConfig } from "@/lib/sitemaps";

export async function GET() {
  const cfg = await getSitemapConfig();
  const txt = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /api/",
    "Disallow: /cart",
    "Disallow: /checkout",
    "",
    `Sitemap: ${cfg.baseUrl}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
