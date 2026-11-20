import "server-only";
import path from "node:path";
import { buildContentAddressedFilename, sanitizeSvgContent, verifyFileMagicBytes } from "./media-security";
import { putMediaObject } from "./r2-storage";

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

/**
 * Save an uploaded image into Cloudflare R2 (when bound) or fallback D1 `media_files` table,
 * enforcing magic-byte validation, SVG XSS sanitization, and content-addressed naming.
 */
export async function saveImage(file: File, folder: "products" | "posts" | "documents"): Promise<string> {
  const ext = EXT[file.type];
  if (!ext) throw new Error("Chỉ nhận ảnh JPG, PNG, WEBP, SVG hoặc GIF.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Ảnh quá lớn (tối đa 1.5MB trên gói Cloudflare miễn phí).");

  let bytes = Buffer.from(await file.arrayBuffer());
  if (!verifyFileMagicBytes(bytes, file.type)) {
    throw new Error("Nội dung file ảnh không khớp định dạng khai báo (có thể bị hỏng hoặc giả mạo).");
  }
  if (file.type === "image/svg+xml") {
    bytes = Buffer.from(sanitizeSvgContent(bytes.toString("utf8")), "utf8");
  }

  const name = buildContentAddressedFilename(ext, bytes);
  const mediaPath = `${folder}/${name}`;
  const stored = await putMediaObject(mediaPath, bytes, file.type);
  return stored.url;
}

export async function saveGeneratedMedia(
  folder: "products" | "posts" | "documents",
  filename: string,
  mime: string,
  content: Buffer | string,
): Promise<string> {
  const mediaPath = `${folder}/${filename}`;
  let bytes = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  if (mime === "image/svg+xml") {
    bytes = Buffer.from(sanitizeSvgContent(bytes.toString("utf8")), "utf8");
  }
  const stored = await putMediaObject(mediaPath, bytes, mime);
  return stored.url;
}

const DOC_EXT: Record<string, { ext: string; type: "pdf" | "doc" | "ppt"; mime: string }> = {
  "application/pdf": { ext: ".pdf", type: "pdf", mime: "application/pdf" },
  "application/msword": { ext: ".doc", type: "doc", mime: "application/msword" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: ".docx",
    type: "doc",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  "application/vnd.ms-powerpoint": { ext: ".ppt", type: "ppt", mime: "application/vnd.ms-powerpoint" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    ext: ".pptx",
    type: "ppt",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
};

export async function saveDocumentFile(file: File): Promise<{ url: string; fileSize: string; docType: "pdf" | "doc" | "ppt" }> {
  const rawExt = path.extname(file.name || "").toLowerCase();
  const byMime = DOC_EXT[file.type];
  let ext = byMime?.ext ?? "";
  let docType: "pdf" | "doc" | "ppt" = byMime?.type ?? "pdf";
  let effectiveMime = byMime?.mime ?? file.type;
  if (!ext) {
    if (rawExt === ".pdf") {
      ext = ".pdf";
      docType = "pdf";
      effectiveMime = "application/pdf";
    } else if (rawExt === ".doc") {
      ext = ".doc";
      docType = "doc";
      effectiveMime = "application/msword";
    } else if (rawExt === ".docx") {
      ext = ".docx";
      docType = "doc";
      effectiveMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (rawExt === ".ppt") {
      ext = ".ppt";
      docType = "ppt";
      effectiveMime = "application/vnd.ms-powerpoint";
    } else if (rawExt === ".pptx") {
      ext = ".pptx";
      docType = "ppt";
      effectiveMime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    } else {
      throw new Error("Chỉ hỗ trợ tải lên file PDF, DOC, DOCX, PPT hoặc PPTX.");
    }
  }
  if (file.size > 1.5 * 1024 * 1024) {
    throw new Error("Tài liệu quá lớn để lưu trực tiếp (tối đa 1.5MB; file lớn hơn nên gắn link Google Drive).");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!verifyFileMagicBytes(bytes, effectiveMime)) {
    throw new Error("Nội dung file tài liệu không khớp định dạng PDF/Office hợp lệ.");
  }

  const safeBase = slugify(path.basename(file.name, path.extname(file.name))).slice(0, 32) || "tai-lieu";
  const name = buildContentAddressedFilename(ext, bytes, safeBase);
  const mediaPath = `documents/${name}`;
  const stored = await putMediaObject(mediaPath, bytes, effectiveMime || "application/octet-stream");
  const mb = file.size / (1024 * 1024);
  const fileSize = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  return { url: stored.url, fileSize, docType };
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
