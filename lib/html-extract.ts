/**
 * Pure TypeScript HTML & XML extraction helpers (Cloudflare Workers / workerd safe).
 * Replaces `cheerio` in runtime API routes to avoid Node-only module bloat and crashes.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "'",
  rsquo: "'",
  ldquo: '"',
  rdquo: '"',
  copy: "©",
  reg: "®",
};

export function decodeHtmlEntities(input: string): string {
  return String(input || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    const lower = code.toLowerCase();
    if (lower.startsWith("#x")) {
      const cp = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
    }
    if (lower.startsWith("#")) {
      const cp = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
    }
    return NAMED_ENTITIES[lower] ?? match;
  });
}

export function stripHtmlTags(html: string): string {
  return decodeHtmlEntities(String(html || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getAttr(tag: string, attrName: string): string {
  const re = new RegExp(
    `\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + "`" + `]+))`,
    "i",
  );
  const m = tag.match(re);
  return decodeHtmlEntities((m?.[1] ?? m?.[2] ?? m?.[3] ?? "").trim());
}

export function extractMetaContent(html: string, attrName: "name" | "property", targetValue: string): string {
  const metaRe = /<meta\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  const expected = targetValue.toLowerCase();
  while ((m = metaRe.exec(html)) !== null) {
    const tag = m[0];
    if (getAttr(tag, attrName).toLowerCase() === expected) {
      const content = getAttr(tag, "content");
      if (content) return content;
    }
  }
  return "";
}

/**
 * Extract readable chunks from YouTube timedtext XML (`<text ...>...</text>`).
 */
export function extractYoutubeCaptionChunks(capXml: string, maxChunks = 18): string[] {
  const chunks: string[] = [];
  let buffer = "";
  const re = /<text\b[^>]*>([\s\S]*?)<\/text>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(capXml)) !== null) {
    const t = stripHtmlTags(m[1]);
    if (!t) continue;
    buffer += (buffer ? " " : "") + t;
    if (buffer.length >= 220) {
      chunks.push(buffer);
      buffer = "";
      if (chunks.length >= maxChunks) break;
    }
  }
  if (buffer.length >= 40 && chunks.length < maxChunks) {
    chunks.push(buffer);
  }
  return chunks;
}

export type ExtractedWebArticle = {
  rawTitle: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  images: string[];
};

/**
 * Pure TypeScript web article extractor for Cloudflare Workers (`workerd`).
 */
export function extractWebArticleFromHtml(html: string, baseUrl: string): ExtractedWebArticle {
  const ogTitle = extractMetaContent(html, "property", "og:title");
  const description =
    extractMetaContent(html, "property", "og:description") ||
    extractMetaContent(html, "name", "description");
  const ogImg = extractMetaContent(html, "property", "og:image");
  const titleTag = stripHtmlTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");

  // Strip noisy structural & executable blocks before content parsing
  const cleaned = html.replace(
    /<(script|style|noscript|nav|footer|header|iframe|form|aside|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,
    " ",
  );

  const postDetailH1 = stripHtmlTags(
    cleaned.match(/<h1\b[^>]*class=["'][^"']*post-detail-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "",
  );
  const firstH1 = stripHtmlTags(cleaned.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const rawTitle = postDetailH1 || firstH1 || ogTitle || titleTag || "Bài viết Thực dưỡng & Sức khỏe";

  // Prefer <article> or <main> scope when available
  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const scope = articleMatch?.[1] || mainMatch?.[1] || bodyMatch?.[1] || cleaned;

  const headings: string[] = [];
  const hRe = /<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi;
  let m: RegExpExecArray | null;
  while ((m = hRe.exec(scope)) !== null) {
    const t = stripHtmlTags(m[1]);
    if (t.length >= 6 && t.length <= 160 && !headings.includes(t)) {
      headings.push(t);
      if (headings.length >= 10) break;
    }
  }

  const paragraphs: string[] = [];
  const pRe = /<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  while ((m = pRe.exec(scope)) !== null) {
    const t = stripHtmlTags(m[2]);
    if (t.length >= 45 && !paragraphs.includes(t)) {
      paragraphs.push(t);
      if (paragraphs.length >= 35) break;
    }
  }

  const images: string[] = [];
  if (ogImg && /^https?:\/\//i.test(ogImg)) images.push(ogImg);
  const imgRe = /<img\b[^>]*>/gi;
  while ((m = imgRe.exec(scope)) !== null) {
    const tag = m[0];
    const src = getAttr(tag, "data-isrc") || getAttr(tag, "data-src") || getAttr(tag, "src");
    if (!src) continue;
    try {
      const abs = new URL(src, baseUrl).toString();
      if (
        /^https?:\/\//i.test(abs) &&
        !abs.toLowerCase().includes("logo") &&
        !abs.toLowerCase().includes("icon") &&
        !images.includes(abs)
      ) {
        images.push(abs);
        if (images.length >= 6) break;
      }
    } catch {
      /* ignore invalid URL */
    }
  }

  return {
    rawTitle,
    description,
    headings,
    paragraphs,
    images,
  };
}
