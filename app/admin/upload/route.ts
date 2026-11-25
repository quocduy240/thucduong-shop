import crypto from "node:crypto";
import { currentAdminForPath } from "@/lib/auth";
import { verifyFileMagicBytes } from "@/lib/media-security";
import { assertSafePublicHttpUrl } from "@/lib/security";
import { MAX_IMAGE_BYTES, saveGeneratedMedia, saveImage } from "@/lib/uploads";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

async function fetchWithSafeRedirects(initialUrl: string, maxRedirects = 3): Promise<Response> {
  let currentUrl = initialUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertSafePublicHttpUrl(currentUrl);
    const res = await fetch(currentUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ThucDuongPhucThoBot/1.0)" },
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Máy chủ trả về chuyển hướng nhưng thiếu địa chỉ đích.");
      currentUrl = new URL(loc, currentUrl).toString();
      continue;
    }
    if (res.url) assertSafePublicHttpUrl(res.url);
    return res;
  }
  throw new Error("URL chuyển hướng quá nhiều lần (tối đa 3 bước).");
}

// POST /admin/upload — accepts multipart FormData { file } OR JSON { imageUrl } and returns { url }.
export async function POST(req: Request) {
  if (!(await currentAdminForPath("/admin/upload", "/admin/posts/", "/admin/products/"))) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { imageUrl?: string };
    const rawUrl = String(body.imageUrl ?? "").trim();
    if (!/^https?:\/\//i.test(rawUrl)) {
      return Response.json({ error: "Đường dẫn ảnh (URL) không hợp lệ." }, { status: 400 });
    }
    try {
      assertSafePublicHttpUrl(rawUrl);
      // Convert Google Drive sharing link to direct download link if applicable
      let fetchUrl = rawUrl;
      const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
      if (driveMatch) {
        fetchUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
      }
      const res = await fetchWithSafeRedirects(fetchUrl);
      if (!res.ok) throw new Error(`Không tải được ảnh từ URL (HTTP ${res.status}).`);
      const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const ext = MIME_EXT[mime] || ".jpg";
      const effectiveMime = MIME_EXT[mime] ? mime : "image/jpeg";
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) {
        throw new Error("Dung lượng ảnh không hợp lệ (tối đa 1.5MB).");
      }
      if (!verifyFileMagicBytes(buf, effectiveMime)) {
        throw new Error("Nội dung tải về từ URL không phải là định dạng ảnh hợp lệ.");
      }
      const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}${ext}`;
      const savedUrl = await saveGeneratedMedia("posts", name, effectiveMime, buf);
      return Response.json({ url: savedUrl });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Không có file." }, { status: 400 });
  try {
    return Response.json({ url: await saveImage(file, "posts") });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
