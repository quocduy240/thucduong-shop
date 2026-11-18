import { getMediaAsset } from "@/lib/media-assets";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const asset = await getMediaAsset(decodeURIComponent(slug));
  if (!asset) {
    return new Response("Not Found", { status: 404 });
  }

  const binary = atob(asset.data_base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Response(bytes, {
    headers: {
      "Content-Type": asset.mime_type || "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
