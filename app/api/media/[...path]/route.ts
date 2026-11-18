import { one } from "@/lib/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segs } = await context.params;
  const mediaPath = (segs || []).join("/");
  if (!mediaPath) return new Response("Not found", { status: 404 });

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
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
