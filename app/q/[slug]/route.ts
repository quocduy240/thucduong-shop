import { run } from "@/lib/db";
import { getQrCodeBySlug } from "@/lib/qr";

// GET /q/[slug] — Dynamic QR redirect: increments scan count and redirects to latest target_url
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const qr = await getQrCodeBySlug(slug);
  if (!qr || !qr.active) {
    return new Response("Mã QR không tồn tại hoặc đã tạm tắt.", { status: 404 });
  }

  await run("UPDATE qr_codes SET scans = scans + 1 WHERE id = ?", qr.id);

  let dest = qr.target_url.trim() || "/";
  if (!/^https?:\/\//i.test(dest)) {
    const origin = new URL(req.url).origin;
    dest = dest.startsWith("/") ? `${origin}${dest}` : `${origin}/${dest}`;
  }

  return Response.redirect(dest, 302);
}
