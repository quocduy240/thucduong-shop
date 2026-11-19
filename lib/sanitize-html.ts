/**
 * HTML sanitizer to strip executable scripts, inline event handlers, dangerous URI schemes,
 * and restrict inline `style` declarations safely (preserving `color` & `background-color`
 * along with safe layout properties used by admin CKEditor/WYSIWYG content).
 */
const SAFE_COLOR_VAL = /^(?:#[0-9a-fA-F]{3,8}|rgba?\([^()]+\)|var\(--[a-zA-Z0-9_-]+\)|inherit|transparent|[a-zA-Z]{3,20})$/;

const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "background-color",
  "text-align",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-decoration",
  "width",
  "height",
  "max-width",
  "margin",
  "margin-top",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "padding",
  "float",
  "border",
  "border-left",
  "border-radius",
  "border-collapse",
]);

function sanitizeStyleAttribute(styleValue: string): string {
  const parts = styleValue.split(";").map((s) => s.trim()).filter(Boolean);
  const safe: string[] = [];
  for (const decl of parts) {
    const idx = decl.indexOf(":");
    if (idx <= 0) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val = decl.slice(idx + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    if (/expression|javascript:|vbscript:|url\s*\(/i.test(val)) continue;
    if ((prop === "color" || prop === "background-color") && !SAFE_COLOR_VAL.test(val)) continue;
    safe.push(`${prop}:${val}`);
  }
  return safe.join(";");
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|action)\s*=\s*(["'])\s*(?:javascript|vbscript|data:text\/html):[\s\S]*?\2/gi, '$1=$2#$2')
    .replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (_m, q: string, val: string) => {
      const cleaned = sanitizeStyleAttribute(val);
      return cleaned ? ` style=${q}${cleaned}${q}` : "";
    });
}
