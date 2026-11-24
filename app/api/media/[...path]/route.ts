import { one } from "@/lib/db";
import { getMediaObject } from "@/lib/r2-storage";

const CACHE = "public, max-age=31536000, immutable";

export async function GET(
  _req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segs } = await context.params;
  const mediaPath = (segs || []).join("/");
  if (!mediaPath) return new Response("Not found", { status: 404 });

  // 1) R2 (when MEDIA_BUCKET is bound), 2) D1 fallback (media_files).
  const r2 = await getMediaObject(mediaPath).catch(() => null);
  if (r2) {
    return new Response(r2.bytes as unknown as BodyInit, {
      status: 200,
      headers: { "Content-Type": r2.contentType, "Cache-Control": CACHE },
    });
  }

  const row = await one<{ mime: string; data_base64: string }>(
    "SELECT mime, data_base64 FROM media_files WHERE path = ?",
    mediaPath,
  );
  if (!row) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(row.data_base64, "base64");
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": row.mime || "application/octet-stream",
      "Cache-Control": CACHE,
    },
  });
}
