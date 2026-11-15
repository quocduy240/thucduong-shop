import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Save an uploaded image to public/uploads/<folder>/ and return its public URL. Throws a Vietnamese message on bad input. */
export async function saveImage(file: File, folder: "products" | "posts"): Promise<string> {
  const ext = EXT[file.type];
  if (!ext) throw new Error("Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Ảnh quá lớn (tối đa 10MB).");
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${name}`;
}

/** Vietnamese-aware slug: "Trà gạo lứt" -> "tra-gao-lut". */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

