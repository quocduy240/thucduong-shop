import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { currentAdminForPath } from "@/lib/auth";
import { buildSitemapEntries, saveSitemapConfig, type SitemapConfig } from "@/lib/sitemaps";

export async function GET() {
  const admin = await currentAdminForPath("/admin/sitemaps/");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await buildSitemapEntries();
  return NextResponse.json({
    config: data.config,
    counts: data.counts,
    totalUrls: data.entries.length,
    sampleUrls: data.entries.slice(0, 15),
  });
}

export async function PUT(req: Request) {
  const admin = await currentAdminForPath("/admin/sitemaps/");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<SitemapConfig>;
  const saved = await saveSitemapConfig(body);
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
  revalidatePath("/so-do-trang.html");

  const data = await buildSitemapEntries();
  return NextResponse.json({
    ok: true,
    config: saved,
    counts: data.counts,
    totalUrls: data.entries.length,
  });
}
