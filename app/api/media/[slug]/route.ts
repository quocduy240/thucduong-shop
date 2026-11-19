import { getMediaAsset } from "@/lib/media-assets";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug);
  const etag = `"media-${cleanSlug}"`;

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const asset = await getMediaAsset(cleanSlug);
  if (!asset) {
    return new Response("Not Found", { status: 404 });
  }

  let bytes: Uint8Array;
  if (asset.bytes) {
    bytes = asset.bytes;
  } else {
    const binary = atob(asset.data_base64 || "");
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
  }

  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": asset.mime_type || "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}
