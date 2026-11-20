import crypto from "node:crypto";

/**
 * Pure media upload security & content-addressed naming helpers.
 * Validates real file magic bytes to prevent MIME spoofing and strips executable
 * vectors from SVG files before storing in Cloudflare R2 or D1.
 */

function startsWithBytes(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}

export function verifyFileMagicBytes(bytes: Uint8Array, mime: string): boolean {
  if (!bytes || bytes.length < 4) return false;
  const normalized = (mime || "").toLowerCase().trim();

  if (normalized === "image/jpeg" || normalized === "image/jpg") {
    return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
  }
  if (normalized === "image/png") {
    return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (normalized === "image/gif") {
    const head = Buffer.from(bytes.subarray(0, 6)).toString("ascii");
    return head === "GIF87a" || head === "GIF89a";
  }
  if (normalized === "image/webp") {
    if (bytes.length < 12) return false;
    const riff = Buffer.from(bytes.subarray(0, 4)).toString("ascii");
    const webp = Buffer.from(bytes.subarray(8, 12)).toString("ascii");
    return riff === "RIFF" && webp === "WEBP";
  }
  if (normalized === "image/svg+xml") {
    const snippet = Buffer.from(bytes.subarray(0, 512)).toString("utf8").trimStart().toLowerCase();
    return snippet.startsWith("<svg") || (snippet.startsWith("<?xml") && snippet.includes("<svg"));
  }
  if (normalized === "application/pdf") {
    const head = Buffer.from(bytes.subarray(0, 5)).toString("ascii");
    return head === "%PDF-";
  }
  if (
    normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalized === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    // OOXML files are ZIP archives starting with PK\x03\x04
    return startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04]);
  }
  if (normalized === "application/msword" || normalized === "application/vnd.ms-powerpoint") {
    // Legacy OLE2 Compound Document header
    return startsWithBytes(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  }
  return false;
}

export function sanitizeSvgContent(svgText: string): string {
  return String(svgText || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<(iframe|object|embed|foreignObject)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|iframe|object|embed|foreignObject)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|xlink:href)\s*=\s*["']\s*(?:javascript:|data:text\/html)[^"']*["']/gi, '$1="#"');
}

export function buildContentAddressedFilename(
  ext: string,
  bytes: Uint8Array,
  prefix?: string,
): string {
  const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const cleanExt = ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  const safePrefix = (prefix || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return safePrefix ? `${safePrefix}-${hash}${cleanExt}` : `${hash}${cleanExt}`;
}
