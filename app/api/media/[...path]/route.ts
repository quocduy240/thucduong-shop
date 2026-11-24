import { one } from "@/lib/db";
import { getMediaObject } from "@/lib/r2-storage";

export async function GET(
  _req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segs } = await context.params;
  const mediaPath = (segs || []).join("/");
  if (!mediaPath) return new Response("Not found", { status: 404 });

  // Prefer Cloudflare R2 (`MEDIA_BUCKET`) when bound so uploads work even without NEXT_PUBLIC_MEDIA_CDN_URL
  const r2Obj = await getMediaObject(mediaPath);
  if (r2Obj) {
    return new Response(r2Obj.bytes, {
      status: 200,
      headers: {
        "Content-Type": r2Obj.contentType,
        "Cache-Control": r2Obj.cacheControl,
        "X-Media-Storage": "r2",
      },
    });
  }

  const row = await one<{ mime: string; data_base64: string }>(
    "SELECT mime, data_base64 FROM media_files WHERE path = ?",
    mediaPath,
  );
  if (row) {
    const bytes = Buffer.from(row.data_base64, "base64");
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": row.mime || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Media-Storage": "d1-files",
      },
    });
  }

  if (!mediaPath.includes("/")) {
    const assetRow = await one<{ mime_type: string; data_base64: string }>(
      "SELECT mime_type, data_base64 FROM media_assets WHERE slug = ?",
      decodeURIComponent(mediaPath),
    ).catch(() => undefined);
    if (assetRow) {
      const bytes = Buffer.from(assetRow.data_base64, "base64");
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": assetRow.mime_type || "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Media-Storage": "d1-assets",
        },
      });
    }
  }

  return new Response("Not found", { status: 404 });
}
