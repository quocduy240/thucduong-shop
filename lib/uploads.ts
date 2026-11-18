import "server-only";
import crypto from "node:crypto";
import path from "node:path";
import { run } from "./db";

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

/** Save an uploaded image into Cloudflare D1 `media_files` table and return its public `/api/media/...` URL. */
export async function saveImage(file: File, folder: "products" | "posts" | "documents"): Promise<string> {
  const ext = EXT[file.type];
  if (!ext) throw new Error("Chỉ nhận ảnh JPG, PNG, WEBP, SVG hoặc GIF.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Ảnh quá lớn (tối đa 1.5MB trên gói Cloudflare miễn phí).");
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  const mediaPath = `${folder}/${name}`;
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  await run(
    "INSERT OR REPLACE INTO media_files (path, mime, data_base64) VALUES (?, ?, ?)",
    mediaPath,
    file.type,
    b64,
  );
  return `/api/media/${mediaPath}`;
}

export async function saveGeneratedMedia(
  folder: "products" | "posts" | "documents",
  filename: string,
  mime: string,
  content: Buffer | string,
): Promise<string> {
  const mediaPath = `${folder}/${filename}`;
  const b64 = typeof content === "string" ? Buffer.from(content, "utf8").toString("base64") : content.toString("base64");
  await run("INSERT OR REPLACE INTO media_files (path, mime, data_base64) VALUES (?, ?, ?)", mediaPath, mime, b64);
  return `/api/media/${mediaPath}`;
}

const DOC_EXT: Record<string, { ext: string; type: "pdf" | "doc" | "ppt" }> = {
  "application/pdf": { ext: ".pdf", type: "pdf" },
  "application/msword": { ext: ".doc", type: "doc" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: ".docx", type: "doc" },
  "application/vnd.ms-powerpoint": { ext: ".ppt", type: "ppt" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { ext: ".pptx", type: "ppt" },
};

export async function saveDocumentFile(file: File): Promise<{ url: string; fileSize: string; docType: "pdf" | "doc" | "ppt" }> {
  const rawExt = path.extname(file.name || "").toLowerCase();
  const byMime = DOC_EXT[file.type];
  let ext = byMime?.ext ?? "";
  let docType: "pdf" | "doc" | "ppt" = byMime?.type ?? "pdf";
  if (!ext) {
    if (rawExt === ".pdf") (ext = ".pdf", docType = "pdf");
    else if (rawExt === ".doc" || rawExt === ".docx") (ext = rawExt, docType = "doc");
    else if (rawExt === ".ppt" || rawExt === ".pptx") (ext = rawExt, docType = "ppt");
    else throw new Error("Chỉ hỗ trợ tải lên file PDF, DOC, DOCX, PPT hoặc PPTX.");
  }
  if (file.size > 1.5 * 1024 * 1024) throw new Error("Tài liệu quá lớn để lưu trực tiếp (tối đa 1.5MB; file lớn hơn nên gắn link Google Drive).");
  const safeBase = slugify(path.basename(file.name, path.extname(file.name))).slice(0, 40) || "tai-lieu";
  const name = `${safeBase}-${Date.now().toString(36)}${ext}`;
  const mediaPath = `documents/${name}`;
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  await run(
    "INSERT OR REPLACE INTO media_files (path, mime, data_base64) VALUES (?, ?, ?)",
    mediaPath,
    file.type || "application/octet-stream",
    b64,
  );
  const mb = file.size / (1024 * 1024);
  const fileSize = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  return { url: `/api/media/${mediaPath}`, fileSize, docType };
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
