import QRCode from "qrcode";
import { getQrCodeBySlug } from "@/lib/qr";

// GET /api/qr/[slug] — Renders crisp vector SVG for the dynamic QR code (/q/[slug])
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const qr = await getQrCodeBySlug(slug);
  if (!qr) {
    return new Response("Not found", { status: 404 });
  }

  const urlObj = new URL(req.url);
  const origin = urlObj.origin;
  const scanUrl = `${origin}/q/${encodeURIComponent(qr.slug)}`;
  const download = urlObj.searchParams.get("download") === "1";

  const svg = await QRCode.toString(scanUrl, {
    type: "svg",
    margin: 2,
    width: 360,
    errorCorrectionLevel: "M",
    color: {
      dark: qr.fg_color || "#14532d",
      light: qr.bg_color || "#ffffff",
    },
  });

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      ...(download
        ? { "Content-Disposition": `attachment; filename="qr-${qr.slug}.svg"` }
        : {}),
    },
  });
}
