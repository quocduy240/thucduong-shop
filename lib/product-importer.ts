import "server-only";
import { all, one, run } from "./db";
import { callGeminiGenerateContent, resolveGeminiApiKey } from "./gemini-key";
import { saveMediaAsset } from "./media-assets";
import { assertSafePublicHttpUrl } from "./security";
import { getSite } from "./settings";

export type ImportJobStatus =
  | "fetch_queued"
  | "fetched"
  | "imported"
  | "cleaning_queued"
  | "cleaning_running"
  | "cleaned"
  | "failed";

export type ParsedProductDraft = {
  name: string;
  price: number;
  sale_price: number | null;
  summary: string;
  description_html: string;
  brand: string;
  origin: string;
  unit: string;
  sku: string;
  images: string[];
};

export type LegacyTraceWarning = {
  type: "phone" | "email" | "external_link" | "domain_mention" | "images";
  label: string;
  detail: string;
};

export type ProductImportJobRow = {
  id: number;
  source_url: string;
  canonical_url: string;
  source_domain: string;
  product_id: number | null;
  target_category_id: number | null;
  status: ImportJobStatus;
  mode: string;
  raw_payload: string;
  normalized_payload: string;
  audit_notes: string;
  working_images: string;
  step_cursor: number;
  progress_pct: number;
  current_step: string;
  estimated_seconds: number;
  locked_until: string | null;
  images_total: number;
  images_cleaned: number;
  images_recreated: number;
  error_message: string;
  source_cleared: number;
  created_at: string;
  updated_at: string;
  product_name?: string | null;
  product_slug?: string | null;
  category_slug?: string | null;
};

export type DuplicateCheckResult = {
  canonicalUrl: string;
  duplicateProduct: {
    id: number;
    name: string;
    category_id: number;
    category_name: string;
    source_url: string;
    traces: LegacyTraceWarning[];
    hasLegacyTraces: boolean;
  } | null;
  queuedJob: {
    id: number;
    status: ImportJobStatus;
    progress_pct: number;
    current_step: string;
  } | null;
};

export type IdleWorkerSummary = {
  state: "idle" | "busy";
  activeJob: {
    id: number;
    name: string;
    status: ImportJobStatus;
    progress_pct: number;
    current_step: string;
    estimated_seconds: number;
  } | null;
  queuedCount: number;
  totalEtaSeconds: number;
  suggestions: {
    uncleanedImportedCount: number;
    failedCount: number;
    productsWithSourceCount: number;
  };
};

let ensuredImporterSchema: Promise<void> | null = null;

export async function ensureProductImportSchema(): Promise<void> {
  if (!ensuredImporterSchema) {
    ensuredImporterSchema = (async () => {
      await run(`
        CREATE TABLE IF NOT EXISTS product_import_jobs (
          id INTEGER PRIMARY KEY,
          source_url TEXT NOT NULL,
          canonical_url TEXT NOT NULL DEFAULT '',
          source_domain TEXT NOT NULL DEFAULT '',
          product_id INTEGER,
          target_category_id INTEGER,
          status TEXT NOT NULL DEFAULT 'fetched',
          mode TEXT NOT NULL DEFAULT 'pending',
          raw_payload TEXT NOT NULL DEFAULT '{}',
          normalized_payload TEXT NOT NULL DEFAULT '{}',
          audit_notes TEXT NOT NULL DEFAULT '[]',
          working_images TEXT NOT NULL DEFAULT '[]',
          step_cursor INTEGER NOT NULL DEFAULT 0,
          progress_pct INTEGER NOT NULL DEFAULT 0,
          current_step TEXT NOT NULL DEFAULT '',
          estimated_seconds INTEGER NOT NULL DEFAULT 0,
          locked_until TEXT,
          images_total INTEGER NOT NULL DEFAULT 0,
          images_cleaned INTEGER NOT NULL DEFAULT 0,
          images_recreated INTEGER NOT NULL DEFAULT 0,
          error_message TEXT NOT NULL DEFAULT '',
          source_cleared INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      const jCols = await all<{ name: string }>("PRAGMA table_info(product_import_jobs)");
      const jNames = new Set(jCols.map((c) => c.name));
      const addJobCols: [string, string][] = [
        ["canonical_url", "TEXT NOT NULL DEFAULT ''"],
        ["target_category_id", "INTEGER"],
        ["working_images", "TEXT NOT NULL DEFAULT '[]'"],
        ["step_cursor", "INTEGER NOT NULL DEFAULT 0"],
        ["progress_pct", "INTEGER NOT NULL DEFAULT 0"],
        ["current_step", "TEXT NOT NULL DEFAULT ''"],
        ["estimated_seconds", "INTEGER NOT NULL DEFAULT 0"],
        ["locked_until", "TEXT"],
      ];
      for (const [col, def] of addJobCols) {
        if (!jNames.has(col)) {
          await run(`ALTER TABLE product_import_jobs ADD COLUMN ${col} ${def}`);
        }
      }

      const pCols = await all<{ name: string }>("PRAGMA table_info(products)");
      const colNames = new Set(pCols.map((c) => c.name));
      if (!colNames.has("source_url")) {
        await run("ALTER TABLE products ADD COLUMN source_url TEXT");
      }
      if (!colNames.has("source_note")) {
        await run("ALTER TABLE products ADD COLUMN source_note TEXT NOT NULL DEFAULT ''");
      }
    })().catch((err) => {
      ensuredImporterSchema = null;
      throw err;
    });
  }
  await ensuredImporterSchema;
}

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "source",
  "spm",
  "zarsrc",
]);

export function canonicalizeProductUrl(rawUrl: string): string {
  const safe = assertSafePublicHttpUrl(rawUrl);
  safe.hash = "";
  for (const key of [...safe.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase())) {
      safe.searchParams.delete(key);
    }
  }
  if (safe.pathname.length > 1 && safe.pathname.endsWith("/")) {
    safe.pathname = safe.pathname.slice(0, -1);
  }
  return safe.toString();
}

function slugifyVi(raw: string): string {
  return (
    raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || `san-pham-${Date.now().toString(36)}`
  );
}

function parsePriceNumber(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.round(raw));
  const s = String(raw ?? "").replace(/[^\d]/g, "");
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function absolutizeUrl(candidate: string, baseUrl: string): string {
  const s = (candidate || "").trim();
  if (!s || s.startsWith("data:") || s.startsWith("javascript:")) return "";
  try {
    const u = new URL(s, baseUrl);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    return "";
  } catch {
    return "";
  }
}

export function scanLegacyTraces(
  textAndHtml: string,
  sourceDomain: string,
  images: string[],
): LegacyTraceWarning[] {
  const warnings: LegacyTraceWarning[] = [];
  const phones = [...new Set(textAndHtml.match(/(?:\+84|0)\d[\d.\s-]{7,12}\d/g) || [])].slice(0, 5);
  if (phones.length > 0) {
    warnings.push({
      type: "phone",
      label: "Phát hiện Số điện thoại nguồn cũ",
      detail: phones.join(", "),
    });
  }
  const emails = [...new Set(textAndHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])].slice(0, 5);
  if (emails.length > 0) {
    warnings.push({
      type: "email",
      label: "Phát hiện Email nguồn cũ",
      detail: emails.join(", "),
    });
  }
  const linkMatches = [...textAndHtml.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((href) => !href.includes("thucduong"));
  if (linkMatches.length > 0) {
    warnings.push({
      type: "external_link",
      label: `Có ${linkMatches.length} liên kết trỏ ra ngoài`,
      detail: [...new Set(linkMatches)].slice(0, 3).join(" | "),
    });
  }
  if (sourceDomain && textAndHtml.toLowerCase().includes(sourceDomain.toLowerCase())) {
    warnings.push({
      type: "domain_mention",
      label: "Nhắc tên miền trang cũ trong nội dung",
      detail: sourceDomain,
    });
  }
  const externalImgs = images.filter(
    (u) => u && !u.startsWith("/api/media/") && !u.startsWith("/uploads/"),
  );
  if (externalImgs.length > 0) {
    warnings.push({
      type: "images",
      label: `${externalImgs.length} ảnh vẫn trỏ từ nguồn ngoài`,
      detail: "Cần tải về nội bộ & kiểm tra/xoá watermark, SĐT, email trên ảnh",
    });
  }
  return warnings;
}

export async function checkDuplicateProductUrl(rawUrl: string): Promise<DuplicateCheckResult> {
  await ensureProductImportSchema();
  const safe = assertSafePublicHttpUrl(rawUrl);
  const exactUrl = safe.toString();
  const canonicalUrl = canonicalizeProductUrl(rawUrl);
  const domain = safe.hostname.replace(/^www\./, "");

  type ProdRow = {
    id: number;
    name: string;
    category_id: number;
    category_name?: string;
    source_url: string;
    description: string;
    image: string | null;
    gallery: string;
  };

  let prod = await one<ProdRow>(
    `SELECT p.id, p.name, p.category_id, c.name AS category_name, p.source_url, p.description, p.image, p.gallery
     FROM products p
     LEFT JOIN product_categories c ON c.id = p.category_id
     WHERE p.source_url = ? OR p.source_url = ? OR p.source_url = ?
     ORDER BY p.id DESC LIMIT 1`,
    exactUrl,
    canonicalUrl,
    `${canonicalUrl}/`,
  );

  if (!prod) {
    const candidates = await all<ProdRow>(
      `SELECT p.id, p.name, p.category_id, c.name AS category_name, p.source_url, p.description, p.image, p.gallery
       FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
       WHERE p.source_url IS NOT NULL AND p.source_url <> '' AND INSTR(p.source_url, ?) > 0
       ORDER BY p.id DESC LIMIT 200`,
      domain,
    );
    prod = candidates.find((row) => {
      try {
        return canonicalizeProductUrl(row.source_url) === canonicalUrl;
      } catch {
        return false;
      }
    });
  }

  const queued = await one<{
    id: number;
    status: ImportJobStatus;
    progress_pct: number;
    current_step: string;
  }>(
    `SELECT id, status, progress_pct, current_step
     FROM product_import_jobs
     WHERE (canonical_url = ? OR source_url = ?)
       AND status IN ('fetch_queued', 'cleaning_queued', 'cleaning_running')
     ORDER BY id DESC LIMIT 1`,
    canonicalUrl,
    exactUrl,
  );

  let duplicateProduct: DuplicateCheckResult["duplicateProduct"] = null;
  if (prod) {
    const imgs = [
      ...(prod.image ? [prod.image] : []),
      ...(prod.gallery || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    ];
    const traces = scanLegacyTraces(prod.description || "", domain, imgs);
    duplicateProduct = {
      id: prod.id,
      name: prod.name,
      category_id: prod.category_id,
      category_name: prod.category_name ?? "Chưa phân loại",
      source_url: prod.source_url,
      traces,
      hasLegacyTraces: traces.length > 0,
    };
  }

  return {
    canonicalUrl,
    duplicateProduct,
    queuedJob: queued ?? null,
  };
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getAttr(tag: string, attr: string): string {
  const re = new RegExp(`\\b${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = tag.match(re);
  return (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").trim();
}

function cleanFallbackHtml(rawHtml: string, baseUrl: string): string {
  let out = (rawHtml || "")
    .replace(/<(script|style|iframe|noscript|form|button)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");
  out = out.replace(/<img\b[^>]*>/gi, (tag) => {
    const src =
      getAttr(tag, "data-src") ||
      getAttr(tag, "data-isrc") ||
      getAttr(tag, "data-lazy-src") ||
      getAttr(tag, "src");
    const abs = absolutizeUrl(src, baseUrl);
    if (!abs) return "";
    const alt = getAttr(tag, "alt").replace(/"/g, "&quot;");
    return `<img src="${abs}" alt="${alt}" />`;
  });
  return out.trim();
}

function extractRawFromHtml(html: string, targetUrl: string): ParsedProductDraft & { raw_text: string } {
  let ldName = "";
  let ldPrice = 0;
  const ldSalePrice: number | null = null;
  let ldDesc = "";
  let ldBrand = "";
  let ldSku = "";
  const ldImages: string[] = [];

  const ldRegex = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(ldRegex)) {
    try {
      const json = JSON.parse((m[1] || "{}").trim()) as Record<string, unknown> | Record<string, unknown>[];
      const list = Array.isArray(json)
        ? json
        : Array.isArray((json as { "@graph"?: unknown[] })["@graph"])
          ? ((json as { "@graph": Record<string, unknown>[] })["@graph"])
          : [json];
      for (const item of list) {
        const t = String(item["@type"] ?? "").toLowerCase();
        if (t.includes("product")) {
          if (!ldName && item.name) ldName = String(item.name).trim();
          if (!ldDesc && item.description) ldDesc = String(item.description).trim();
          if (!ldSku && item.sku) ldSku = String(item.sku).trim();
          if (!ldBrand && item.brand) {
            const b = item.brand as { name?: string } | string;
            ldBrand = typeof b === "string" ? b : String(b.name ?? "");
          }
          const imgs = Array.isArray(item.image) ? item.image : item.image ? [item.image] : [];
          for (const im of imgs) {
            const u = typeof im === "string" ? im : String((im as { url?: string })?.url ?? "");
            const abs = absolutizeUrl(u, targetUrl);
            if (abs && !ldImages.includes(abs)) ldImages.push(abs);
          }
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offers && typeof offers === "object") {
            const o = offers as Record<string, unknown>;
            const p = parsePriceNumber(o.price ?? o.lowPrice);
            if (p > 0) ldPrice = p;
          }
        }
      }
    } catch {
      /* ignore bad json-ld */
    }
  }

  const getMeta = (propOrName: string): string => {
    const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
    for (const tag of metaTags) {
      const prop = getAttr(tag, "property").toLowerCase();
      const name = getAttr(tag, "name").toLowerCase();
      if (prop === propOrName.toLowerCase() || name === propOrName.toLowerCase()) {
        const c = getAttr(tag, "content");
        if (c) return c;
      }
    }
    return "";
  };

  const ogTitle = getMeta("og:title");
  const h1Match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? stripTags(h1Match[1]) : "";
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const titleTag = titleMatch ? stripTags(titleMatch[1]) : "";
  const name = ldName || h1 || ogTitle || titleTag || "Sản phẩm mới";

  const ogDesc = getMeta("og:description") || getMeta("description");

  let domPrice = ldPrice;
  if (!domPrice) {
    const metaPrice = parsePriceNumber(getMeta("product:price:amount"));
    if (metaPrice >= 1000) {
      domPrice = metaPrice;
    } else {
      const vndMatches = [...html.matchAll(/(\d{1,3}(?:[.,]\d{3})+)\s*(?:₫|đ|vnđ|vnd)/gi)];
      for (const pm of vndMatches) {
        const n = parsePriceNumber(pm[1]);
        if (n >= 1000) {
          domPrice = n;
          break;
        }
      }
    }
  }

  const images: string[] = [...ldImages];
  const ogImg = absolutizeUrl(getMeta("og:image"), targetUrl);
  if (ogImg && !images.includes(ogImg)) images.push(ogImg);

  for (const imgTag of html.match(/<img\b[^>]*>/gi) || []) {
    const src =
      getAttr(imgTag, "data-src") ||
      getAttr(imgTag, "data-isrc") ||
      getAttr(imgTag, "data-lazy-src") ||
      getAttr(imgTag, "src");
    const abs = absolutizeUrl(src, targetUrl);
    if (
      abs &&
      !images.includes(abs) &&
      !/logo|icon|avatar|badge|banner-ads|bct|bo-cong-thuong/i.test(abs) &&
      images.length < 10
    ) {
      images.push(abs);
    }
  }

  const mainMatch =
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) ||
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) ||
    html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const rawDescHtml = mainMatch ? mainMatch[1].slice(0, 30000) : html.slice(0, 30000);
  const rawText = (stripTags(rawDescHtml) || ldDesc || ogDesc).slice(0, 6000);

  return {
    name: name.slice(0, 200),
    price: domPrice,
    sale_price: ldSalePrice,
    summary: (ogDesc || ldDesc || rawText.slice(0, 220)).slice(0, 300),
    description_html: cleanFallbackHtml(rawDescHtml || `<p>${ldDesc || ogDesc}</p>`, targetUrl),
    brand: ldBrand.slice(0, 80),
    origin: "",
    unit: "",
    sku: ldSku.slice(0, 60),
    images: images.slice(0, 8),
    raw_text: rawText,
  };
}

async function normalizeDraftWithMotif(
  raw: ParsedProductDraft & { raw_text: string },
  sourceDomain: string,
  shopName: string,
): Promise<ParsedProductDraft> {
  const apiKey = await resolveGeminiApiKey();
  if (!apiKey) {
    return {
      name: raw.name,
      price: raw.price,
      sale_price: raw.sale_price,
      summary: raw.summary,
      description_html: raw.description_html,
      brand: raw.brand,
      origin: raw.origin,
      unit: raw.unit,
      sku: raw.sku,
      images: raw.images,
    };
  }

  const prompt = `Bạn là biên tập viên sản phẩm cho cửa hàng "${shopName}".
Hãy chuẩn hoá dữ liệu sản phẩm lấy từ trang nguồn (${sourceDomain}) thành JSON chuẩn của cửa hàng chúng ta.
QUY TẮC BẮT BUỘC:
1. XOÁ SẠCH mọi số điện thoại, email, địa chỉ, tên miền, tên shop cũ (${sourceDomain}) hoặc lời kêu gọi liên hệ shop cũ.
2. Viết lại tự nhiên, uy tín, chuẩn mực ngành thực phẩm sạch / thực dưỡng.
3. Định dạng description_html theo motif chuẩn gồm các thẻ <h2> và <p>/<ul><li> rõ ràng:
   - <h2>🌿 Giới thiệu sản phẩm</h2>
   - <h2>✨ Công dụng &amp; Lợi ích nổi bật</h2>
   - <h2>🥣 Thành phần &amp; Quy cách</h2>
   - <h2>📖 Hướng dẫn sử dụng &amp; Bảo quản</h2>
4. Trả về DUY NHẤT 1 JSON object hợp lệ (không bọc markdown \`\`\`) với các field:
{
  "name": string,
  "price": number,
  "sale_price": number | null,
  "summary": string (2 câu ngắn <= 240 ký tự),
  "description_html": string (HTML sạch),
  "brand": string,
  "origin": string,
  "unit": string,
  "sku": string
}

DỮ LIỆU NGUỒN:
- Tên: ${raw.name}
- Giá gốc phát hiện: ${raw.price}
- Thương hiệu: ${raw.brand}
- SKU: ${raw.sku}
- Tóm tắt: ${raw.summary}
- Nội dung thô: ${raw.raw_text.slice(0, 4500)}`;

  try {
    const res = await callGeminiGenerateContent(apiKey, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
    });
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<ParsedProductDraft>;
    return {
      name: String(parsed.name || raw.name).trim().slice(0, 200),
      price: parsePriceNumber(parsed.price ?? raw.price) || raw.price,
      sale_price:
        parsed.sale_price &&
        Number(parsed.sale_price) > 0 &&
        Number(parsed.sale_price) < (Number(parsed.price) || raw.price)
          ? Math.round(Number(parsed.sale_price))
          : null,
      summary: String(parsed.summary || raw.summary).trim().slice(0, 300),
      description_html: String(parsed.description_html || raw.description_html).trim(),
      brand: String(parsed.brand || raw.brand).trim().slice(0, 80),
      origin: String(parsed.origin || raw.origin).trim().slice(0, 80),
      unit: String(parsed.unit || raw.unit).trim().slice(0, 40),
      sku: String(parsed.sku || raw.sku).trim().slice(0, 60),
      images: raw.images,
    };
  } catch {
    return {
      name: raw.name,
      price: raw.price,
      sale_price: raw.sale_price,
      summary: raw.summary,
      description_html: raw.description_html,
      brand: raw.brand,
      origin: raw.origin,
      unit: raw.unit,
      sku: raw.sku,
      images: raw.images,
    };
  }
}

export async function fetchAndCreateImportJob(opts: {
  url: string;
  rawHtmlOverride?: string;
}): Promise<{
  job: ProductImportJobRow;
  duplicate: DuplicateCheckResult;
}> {
  await ensureProductImportSchema();
  const safeUrl = assertSafePublicHttpUrl(opts.url);
  const sourceUrl = safeUrl.toString();
  const canonicalUrl = canonicalizeProductUrl(opts.url);
  const sourceDomain = safeUrl.hostname.replace(/^www\./, "");

  const duplicate = await checkDuplicateProductUrl(opts.url);

  let html = (opts.rawHtmlOverride ?? "").trim();
  if (!html) {
    const res = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(
        `Không thể tải trang nguồn (HTTP ${res.status}). Nếu trang nguồn chặn bot, hãy mở trang đó trên trình duyệt → Ctrl+U → Copy HTML dán vào ô "HTML dự phòng".`,
      );
    }
    html = await res.text();
  }

  const raw = extractRawFromHtml(html, sourceUrl);
  const site = await getSite();
  const normalized = await normalizeDraftWithMotif(raw, sourceDomain, site.name);
  const traces = scanLegacyTraces(`${raw.raw_text}\n${raw.description_html}`, sourceDomain, raw.images);

  const r = await run(
    `INSERT INTO product_import_jobs
     (source_url, canonical_url, source_domain, status, mode, raw_payload, normalized_payload, audit_notes, images_total, progress_pct, current_step)
     VALUES (?, ?, ?, 'fetched', 'pending', ?, ?, ?, ?, 100, 'Đã lấy & chuẩn hoá theo motif shop')`,
    sourceUrl,
    canonicalUrl,
    sourceDomain,
    JSON.stringify({
      name: raw.name,
      price: raw.price,
      summary: raw.summary,
      brand: raw.brand,
      sku: raw.sku,
      images: raw.images,
    }),
    JSON.stringify(normalized),
    JSON.stringify(traces),
    raw.images.length,
  );

  const job = await getImportJobById(Number(r.lastInsertRowid));
  return { job: job!, duplicate };
}

export async function getImportJobById(id: number): Promise<ProductImportJobRow | undefined> {
  await ensureProductImportSchema();
  return one<ProductImportJobRow>(
    `SELECT j.*, p.name AS product_name, p.slug AS product_slug, c.slug AS category_slug
     FROM product_import_jobs j
     LEFT JOIN products p ON p.id = j.product_id
     LEFT JOIN product_categories c ON c.id = p.category_id
     WHERE j.id = ?`,
    id,
  );
}

export async function listImportJobs(limit = 50): Promise<ProductImportJobRow[]> {
  await ensureProductImportSchema();
  return all<ProductImportJobRow>(
    `SELECT j.*, p.name AS product_name, p.slug AS product_slug, c.slug AS category_slug
     FROM product_import_jobs j
     LEFT JOIN products p ON p.id = j.product_id
     LEFT JOIN product_categories c ON c.id = p.category_id
     ORDER BY j.id DESC
     LIMIT ?`,
    limit,
  );
}

export async function getIdleWorkerSummary(): Promise<IdleWorkerSummary> {
  await ensureProductImportSchema();
  const [active, queuedRows, uncleanedRow, failedRow, sourceRow] = await Promise.all([
    one<ProductImportJobRow>(
      `SELECT j.*, p.name AS product_name
       FROM product_import_jobs j
       LEFT JOIN products p ON p.id = j.product_id
       WHERE j.status IN ('cleaning_running', 'cleaning_queued', 'fetch_queued')
       ORDER BY CASE j.status
         WHEN 'cleaning_running' THEN 0
         WHEN 'cleaning_queued' THEN 1
         ELSE 2
       END ASC, j.id ASC
       LIMIT 1`,
    ),
    all<{ id: number; estimated_seconds: number; status: string }>(
      `SELECT id, estimated_seconds, status FROM product_import_jobs
       WHERE status IN ('cleaning_running', 'cleaning_queued', 'fetch_queued')`,
    ),
    one<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM product_import_jobs WHERE status = 'imported' AND product_id IS NOT NULL",
    ),
    one<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM product_import_jobs WHERE status = 'failed'",
    ),
    one<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM products WHERE source_url IS NOT NULL AND source_url <> ''",
    ),
  ]);

  const totalEta = queuedRows.reduce(
    (s, r) => s + (r.estimated_seconds > 0 ? r.estimated_seconds : r.status === "fetch_queued" ? 20 : 18),
    0,
  );

  return {
    state: active ? "busy" : "idle",
    activeJob: active
      ? {
          id: active.id,
          name: active.product_name || active.source_domain || `Job #${active.id}`,
          status: active.status,
          progress_pct: active.progress_pct,
          current_step: active.current_step || "Đang chờ xử lý...",
          estimated_seconds: active.estimated_seconds,
        }
      : null,
    queuedCount: queuedRows.length,
    totalEtaSeconds: totalEta,
    suggestions: {
      uncleanedImportedCount: uncleanedRow?.cnt ?? 0,
      failedCount: failedRow?.cnt ?? 0,
      productsWithSourceCount: sourceRow?.cnt ?? 0,
    },
  };
}

export async function importJobIntoProducts(opts: {
  jobId: number;
  categoryId: number;
  priceAdjustPct?: number;
  holdStockZero?: boolean;
}): Promise<{ productId: number; job: ProductImportJobRow }> {
  await ensureProductImportSchema();
  const job = await getImportJobById(opts.jobId);
  if (!job) throw new Error("Không tìm thấy phiên lấy dữ liệu.");
  if (job.product_id) {
    return { productId: job.product_id, job };
  }

  const draft = JSON.parse(job.normalized_payload || "{}") as ParsedProductDraft;
  const baseSlug = slugifyVi(draft.name || "san-pham");
  let slug = baseSlug;
  if (await one("SELECT 1 FROM products WHERE slug = ?", slug)) {
    slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
  }

  const pct = Number(opts.priceAdjustPct) || 0;
  const price =
    pct !== 0 && draft.price > 0
      ? Math.round((draft.price * (1 + pct / 100)) / 1000) * 1000
      : draft.price;
  const stock = opts.holdStockZero ? 0 : 100;
  const mainImg = draft.images?.[0] ?? null;
  const gallery = (draft.images ?? []).slice(1).join("\n");
  const note = `Nhập từ nguồn: ${job.source_domain} (${job.source_url})`;

  const res = await run(
    `INSERT INTO products
     (slug, category_id, name, price, sale_price, summary, description, featured, image, source_url, source_note, stock, sku, brand, origin, unit, gallery)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    slug,
    opts.categoryId,
    draft.name || "Sản phẩm mới",
    Math.max(0, price),
    draft.sale_price,
    draft.summary || "",
    draft.description_html || "",
    mainImg,
    job.source_url,
    note,
    stock,
    draft.sku || "",
    draft.brand || "",
    draft.origin || "",
    draft.unit || "",
    gallery,
  );

  const productId = Number(res.lastInsertRowid);
  await run(
    `UPDATE product_import_jobs
     SET product_id = ?, target_category_id = ?, status = 'imported', progress_pct = 0, current_step = 'Đã nhập · Chờ chọn làm sạch', updated_at = datetime('now')
     WHERE id = ?`,
    productId,
    opts.categoryId,
    job.id,
  );

  return { productId, job: (await getImportJobById(job.id))! };
}

export async function queueAutoCleanJob(jobId: number): Promise<ProductImportJobRow> {
  await ensureProductImportSchema();
  const job = await getImportJobById(jobId);
  if (!job || !job.product_id) throw new Error("Sản phẩm chưa được nhập vào kho.");
  const prod = await one<{ image: string | null; gallery: string }>(
    "SELECT image, gallery FROM products WHERE id = ?",
    job.product_id,
  );
  const imgs = [
    ...(prod?.image ? [prod.image] : []),
    ...(prod?.gallery || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  ].slice(0, 5);
  const eta = 4 + imgs.length * 6;

  await run(
    `UPDATE product_import_jobs
     SET status = 'cleaning_queued',
         mode = 'auto',
         step_cursor = 0,
         progress_pct = 5,
         current_step = 'Đang xếp hàng làm sạch văn bản & ảnh',
         estimated_seconds = ?,
         working_images = '[]',
         images_total = ?,
         images_cleaned = 0,
         images_recreated = 0,
         locked_until = NULL,
         error_message = '',
         updated_at = datetime('now')
     WHERE id = ?`,
    eta,
    imgs.length,
    jobId,
  );
  return (await getImportJobById(jobId))!;
}

/**
 * When a pasted URL matches an existing product in stock that still has legacy traces:
 * update its category (keep current or move to new category) and either queue auto-clean or open manual edit.
 */
export async function recleanExistingProduct(opts: {
  productId: number;
  categoryId: number;
  mode: "auto" | "manual";
}): Promise<{ productId: number; job?: ProductImportJobRow }> {
  await ensureProductImportSchema();
  const prod = await one<{
    id: number;
    name: string;
    source_url: string | null;
    image: string | null;
    gallery: string;
  }>("SELECT id, name, source_url, image, gallery FROM products WHERE id = ?", opts.productId);
  if (!prod) throw new Error("Không tìm thấy sản phẩm trong kho.");

  await run("UPDATE products SET category_id = ? WHERE id = ?", opts.categoryId, opts.productId);

  if (opts.mode === "manual") {
    return { productId: opts.productId };
  }

  let job = await one<ProductImportJobRow>(
    "SELECT * FROM product_import_jobs WHERE product_id = ? ORDER BY id DESC LIMIT 1",
    opts.productId,
  );

  if (!job) {
    const srcUrl = prod.source_url || "https://unknown-source.local/";
    let domain = "";
    let canonical = "";
    try {
      const u = new URL(srcUrl);
      domain = u.hostname.replace(/^www\./, "");
      canonical = canonicalizeProductUrl(srcUrl);
    } catch {
      canonical = srcUrl;
    }
    const r = await run(
      `INSERT INTO product_import_jobs
       (source_url, canonical_url, source_domain, product_id, target_category_id, status, mode)
       VALUES (?, ?, ?, ?, ?, 'imported', 'auto')`,
      srcUrl,
      canonical,
      domain,
      opts.productId,
      opts.categoryId,
    );
    job = await getImportJobById(Number(r.lastInsertRowid));
  } else {
    await run(
      "UPDATE product_import_jobs SET target_category_id = ? WHERE id = ?",
      opts.categoryId,
      job.id,
    );
  }

  const queued = await queueAutoCleanJob(job!.id);
  return { productId: opts.productId, job: queued };
}

export async function enqueueBulkUrls(opts: {
  urls: string[];
  categoryId: number;
}): Promise<{ queued: number; skippedDuplicates: number; invalid: number }> {
  await ensureProductImportSchema();
  let queued = 0;
  let skippedDuplicates = 0;
  let invalid = 0;
  const seen = new Set<string>();

  for (const raw of opts.urls.slice(0, 20)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      const canonical = canonicalizeProductUrl(trimmed);
      if (seen.has(canonical)) {
        skippedDuplicates++;
        continue;
      }
      seen.add(canonical);
      const dup = await checkDuplicateProductUrl(trimmed);
      if (dup.duplicateProduct || dup.queuedJob) {
        skippedDuplicates++;
        continue;
      }
      const u = new URL(trimmed);
      const domain = u.hostname.replace(/^www\./, "");
      await run(
        `INSERT INTO product_import_jobs
         (source_url, canonical_url, source_domain, target_category_id, status, mode, progress_pct, current_step, estimated_seconds)
         VALUES (?, ?, ?, ?, 'fetch_queued', 'auto', 5, 'Chờ Worker lấy dữ liệu từ link', 22)`,
        u.toString(),
        canonical,
        domain,
        opts.categoryId,
      );
      queued++;
    } catch {
      invalid++;
    }
  }
  return { queued, skippedDuplicates, invalid };
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchImageBytes(urlStr: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const safe = assertSafePublicHttpUrl(urlStr).toString();
    const res = await fetch(safe, {
      headers: { "User-Agent": "Mozilla/5.0 Chrome/126.0.0.0" },
    });
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!mimeType.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 6 * 1024 * 1024) return null;
    return { base64: arrayBufferToBase64(buf), mimeType };
  } catch {
    return null;
  }
}

async function detectWatermarkOrContact(
  apiKey: string,
  base64: string,
  mimeType: string,
): Promise<boolean> {
  try {
    const res = await callGeminiGenerateContent(apiKey, {
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64 } },
            {
              text: "Kiểm tra ảnh sản phẩm này: ảnh có chứa watermark, logo shop bán hàng đè lên, số điện thoại, email, địa chỉ website/fanpage của người bán cũ hay không? Chỉ trả lời đúng 1 từ: HAS_WATERMARK hoặc CLEAN.",
            },
          ],
        },
      ],
      generationConfig: { temperature: 0 },
    });
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const txt = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").toUpperCase();
    return txt.includes("HAS_WATERMARK");
  } catch {
    return false;
  }
}

async function recreateCleanImageWithGemini(
  apiKey: string,
  base64: string,
  mimeType: string,
  productName: string,
): Promise<{ base64: string; mimeType: string } | null> {
  const models = ["gemini-2.5-flash-image", "gemini-2.0-flash-exp-image-generation"];
  const prompt = `Đây là ảnh sản phẩm "${productName}". Hãy tạo lại bức ảnh sạch đẹp, giữ nguyên hình dáng và nhãn mác chính của sản phẩm gốc, nhưng XOÁ SẠCH toàn bộ watermark, logo chìm, số điện thoại, email, tên miền website hoặc dòng chữ quảng cáo của cửa hàng cũ đè trên ảnh. Đặt trên nền sáng sạch tự nhiên, chuyên nghiệp, không thêm bất kỳ số điện thoại hay logo mới nào.`;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType, data: base64 } },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        },
      );
      if (!res.ok) continue;
      const json = (await res.json()) as {
        candidates?: {
          content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] };
        }[];
      };
      for (const part of json.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          return {
            base64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || "image/png",
          };
        }
      }
    } catch {
      /* try fallback model */
    }
  }
  return null;
}

/**
 * Step-by-step idle worker: processes ONE small unit of work per invocation
 * (either fetching a queued URL, cleaning text, or cleaning 1 image)
 * with a D1 lease lock so concurrent admin tabs never collide or hit Worker timeouts.
 */
export async function processNextIdleProductImportJob(targetJobId?: number): Promise<{
  processed: boolean;
  jobId?: number;
  status?: string;
}> {
  await ensureProductImportSchema();
  const candidate = targetJobId
    ? await one<ProductImportJobRow>("SELECT * FROM product_import_jobs WHERE id = ?", targetJobId)
    : await one<ProductImportJobRow>(
        `SELECT * FROM product_import_jobs
         WHERE status IN ('cleaning_running', 'cleaning_queued', 'fetch_queued')
           AND (locked_until IS NULL OR locked_until < datetime('now'))
         ORDER BY CASE status
           WHEN 'cleaning_running' THEN 0
           WHEN 'cleaning_queued' THEN 1
           ELSE 2
         END ASC, id ASC
         LIMIT 1`,
      );

  if (!candidate) return { processed: false };

  // Acquire 35s lease lock
  const lock = await run(
    `UPDATE product_import_jobs
     SET locked_until = datetime('now', '+35 seconds'), updated_at = datetime('now')
     WHERE id = ? AND (locked_until IS NULL OR locked_until < datetime('now'))`,
    candidate.id,
  );
  if (lock.changes === 0) return { processed: false };

  try {
    // Case A: Bulk fetch_queued job -> fetch, normalize, import, then queue auto-clean
    if (candidate.status === "fetch_queued") {
      await run(
        "UPDATE product_import_jobs SET current_step = 'Đang tải & chuẩn hoá từ link nguồn...', progress_pct = 15 WHERE id = ?",
        candidate.id,
      );
      const safeUrl = assertSafePublicHttpUrl(candidate.source_url);
      const res = await fetch(safeUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 Chrome/126.0.0.0",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} khi tải trang nguồn`);
      const html = await res.text();
      const raw = extractRawFromHtml(html, safeUrl.toString());
      const site = await getSite();
      const normalized = await normalizeDraftWithMotif(raw, candidate.source_domain, site.name);
      const traces = scanLegacyTraces(`${raw.raw_text}\n${raw.description_html}`, candidate.source_domain, raw.images);

      await run(
        `UPDATE product_import_jobs
         SET raw_payload = ?, normalized_payload = ?, audit_notes = ?, images_total = ?
         WHERE id = ?`,
        JSON.stringify({ name: raw.name, price: raw.price, images: raw.images }),
        JSON.stringify(normalized),
        JSON.stringify(traces),
        raw.images.length,
        candidate.id,
      );

      let catId = candidate.target_category_id;
      if (!catId) {
        const firstCat = await one<{ id: number }>("SELECT id FROM product_categories ORDER BY id ASC LIMIT 1");
        catId = firstCat?.id ?? 1;
      }
      await importJobIntoProducts({ jobId: candidate.id, categoryId: catId });
      await queueAutoCleanJob(candidate.id);
      return { processed: true, jobId: candidate.id, status: "cleaning_queued" };
    }

    if (!candidate.product_id) {
      await run("UPDATE product_import_jobs SET locked_until = NULL WHERE id = ?", candidate.id);
      return { processed: false };
    }

    const product = await one<{
      id: number;
      name: string;
      description: string;
      image: string | null;
      gallery: string;
    }>("SELECT id, name, description, image, gallery FROM products WHERE id = ?", candidate.product_id);

    if (!product) throw new Error("Sản phẩm đã bị xoá.");

    const site = await getSite();
    const apiKey = await resolveGeminiApiKey();

    // Step 0: Clean text & prepare image list
    if (candidate.step_cursor === 0) {
      let cleanedDesc = cleanFallbackHtml(product.description, candidate.source_url);
      cleanedDesc = cleanedDesc
        .replace(/(?:\+84|0)\d[\d.\s-]{7,12}\d/g, site.hotline)
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "");
      if (candidate.source_domain) {
        cleanedDesc = cleanedDesc.replace(
          new RegExp(candidate.source_domain.replace(/\./g, "\\."), "gi"),
          site.name,
        );
      }

      await run("UPDATE products SET description = ? WHERE id = ?", cleanedDesc, product.id);

      const candidateImgs = [
        ...(product.image ? [product.image] : []),
        ...(product.gallery || "")
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean),
      ].slice(0, 5);

      if (candidateImgs.length === 0) {
        await run(
          `UPDATE product_import_jobs
           SET status = 'cleaned', progress_pct = 100, current_step = 'Hoàn tất sạch 100%',
               estimated_seconds = 0, audit_notes = '[]', locked_until = NULL, updated_at = datetime('now')
           WHERE id = ?`,
          candidate.id,
        );
        return { processed: true, jobId: candidate.id, status: "cleaned" };
      }

      await run(
        `UPDATE product_import_jobs
         SET status = 'cleaning_running',
             step_cursor = 1,
             progress_pct = 20,
             current_step = ?,
             estimated_seconds = ?,
             working_images = '[]',
             images_total = ?,
             locked_until = NULL,
             updated_at = datetime('now')
         WHERE id = ?`,
        `Đã làm sạch văn bản · Chuẩn bị kiểm tra ảnh 1/${candidateImgs.length}`,
        candidateImgs.length * 6,
        candidateImgs.length,
        candidate.id,
      );
      return { processed: true, jobId: candidate.id, status: "cleaning_running" };
    }

    // Step >= 1: Process 1 image at index (step_cursor - 1)
    const candidateImgs = [
      ...(product.image ? [product.image] : []),
      ...(product.gallery || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    ].slice(0, 5);

    const imgIdx = candidate.step_cursor - 1;
    let workingImgs: string[] = [];
    try {
      workingImgs = JSON.parse(candidate.working_images || "[]") as string[];
    } catch {
      workingImgs = [];
    }

    let cleanedCount = candidate.images_cleaned || 0;
    let recreatedCount = candidate.images_recreated || 0;

    if (imgIdx < candidateImgs.length) {
      const imgUrl = candidateImgs[imgIdx];
      if (imgUrl.startsWith("/api/media/") || imgUrl.startsWith("/uploads/")) {
        workingImgs.push(imgUrl);
        cleanedCount++;
      } else {
        const fetched = await fetchImageBytes(imgUrl);
        if (fetched) {
          let outBase64 = fetched.base64;
          let outMime = fetched.mimeType;
          if (apiKey) {
            const hasWatermark = await detectWatermarkOrContact(apiKey, fetched.base64, fetched.mimeType);
            if (hasWatermark) {
              const recreated = await recreateCleanImageWithGemini(
                apiKey,
                fetched.base64,
                fetched.mimeType,
                product.name,
              );
              if (recreated) {
                outBase64 = recreated.base64;
                outMime = recreated.mimeType;
                recreatedCount++;
              }
            }
          }
          const extSlug = `sp-${product.id}-${imgIdx + 1}-${Date.now().toString(36)}`;
          const localUrl = await saveMediaAsset(extSlug, outMime, outBase64);
          workingImgs.push(localUrl);
          cleanedCount++;
        }
      }
    }

    const nextCursor = candidate.step_cursor + 1;
    const doneAll = imgIdx + 1 >= candidateImgs.length;

    if (doneAll) {
      const nextMainImg = workingImgs[0] ?? product.image;
      const nextGallery = workingImgs.slice(1).join("\n");
      await run(
        `UPDATE products
         SET image = ?, gallery = ?, stock = CASE WHEN stock = 0 THEN 100 ELSE stock END
         WHERE id = ?`,
        nextMainImg,
        nextGallery,
        product.id,
      );
      await run(
        `UPDATE product_import_jobs
         SET status = 'cleaned',
             step_cursor = ?,
             working_images = ?,
             images_cleaned = ?,
             images_recreated = ?,
             progress_pct = 100,
             current_step = 'Hoàn tất sạch 100%',
             estimated_seconds = 0,
             audit_notes = '[]',
             locked_until = NULL,
             updated_at = datetime('now')
         WHERE id = ?`,
        nextCursor,
        JSON.stringify(workingImgs),
        cleanedCount,
        recreatedCount,
        candidate.id,
      );
      return { processed: true, jobId: candidate.id, status: "cleaned" };
    }

    const remaining = Math.max(1, candidateImgs.length - (imgIdx + 1));
    const pct = Math.min(95, Math.round(20 + ((imgIdx + 1) / candidateImgs.length) * 75));
    await run(
      `UPDATE product_import_jobs
       SET status = 'cleaning_running',
           step_cursor = ?,
           working_images = ?,
           images_cleaned = ?,
           images_recreated = ?,
           progress_pct = ?,
           current_step = ?,
           estimated_seconds = ?,
           locked_until = NULL,
           updated_at = datetime('now')
       WHERE id = ?`,
      nextCursor,
      JSON.stringify(workingImgs),
      cleanedCount,
      recreatedCount,
      pct,
      `Đang kiểm tra & làm sạch ảnh ${imgIdx + 2}/${candidateImgs.length}...`,
      remaining * 6,
      candidate.id,
    );
    return { processed: true, jobId: candidate.id, status: "cleaning_running" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi xử lý tự động.";
    await run(
      `UPDATE product_import_jobs
       SET status = 'failed', error_message = ?, locked_until = NULL, current_step = 'Lỗi xử lý', estimated_seconds = 0, updated_at = datetime('now')
       WHERE id = ?`,
      msg.slice(0, 300),
      candidate.id,
    );
    return { processed: true, jobId: candidate.id, status: "failed" };
  }
}

export async function clearProductSourceTrace(productId: number): Promise<void> {
  await ensureProductImportSchema();
  await run("UPDATE products SET source_url = NULL, source_note = '' WHERE id = ?", productId);
  await run(
    "UPDATE product_import_jobs SET source_cleared = 1, updated_at = datetime('now') WHERE product_id = ?",
    productId,
  );
}
