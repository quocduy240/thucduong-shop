/**
 * Lightweight HTML sanitizer to strip executable scripts, inline event handlers,
 * and dangerous URI schemes before rendering or hydrating WYSIWYG previews.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|action)\s*=\s*(["'])\s*(?:javascript|vbscript|data:text\/html):[\s\S]*?\2/gi, '$1=$2#$2');
}
