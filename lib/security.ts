import crypto from "node:crypto";

export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strips dangerous executable tags, inline event handlers, and javascript: URIs from AI-generated HTML.
 */
export function sanitizeAiHtml(html: string): string {
  return String(html ?? "")
    .replace(/<\s*(script|iframe|object|embed|form|meta|base|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|form|meta|base|link)[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*(?:javascript:|data:text\/html)[^"']*\2/gi, '$1=$2#$2');
}

/**
 * Prevents SSRF by ensuring user/admin-provided URLs only target public HTTP(S) hosts
 * and never loopback, link-local (cloud metadata 169.254.169.254), or private RFC1918 networks.
 */
export function assertSafePublicHttpUrl(rawUrl: string): URL {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error("Đường dẫn URL không hợp lệ.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Chỉ hỗ trợ giao thức http:// hoặc https://.");
  }

  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "::1" ||
    host.startsWith("fe80:") ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) {
    throw new Error("Không được phép truy cập địa chỉ nội bộ (SSRF protection).");
  }

  // Block IPv4 private/loopback/link-local ranges
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      throw new Error("Không được phép truy cập dải IP nội bộ (SSRF protection).");
    }
  }
  return u;
}

/** Constant-time secret comparison to prevent timing side-channel attacks. */
export function safeEqualSecret(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
