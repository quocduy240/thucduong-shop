import "server-only";
import * as cheerio from "cheerio";
import { all, one, run } from "./db";
import { callGeminiGenerateContent, resolveGeminiApiKey } from "./gemini-key";
import { saveMediaAsset } from "./media-assets";
import { assertSafePublicHttpUrl } from "./security";
import { getSite } from "./settings";

export type ImportJobStatus =
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
  source_domain: string;
  product_id: number | null;
  status: ImportJobStatus;
  mode: string;
  raw_payload: string;
  normalized_payload: string;
  audit_notes: string;
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

let ensuredImporterSchema: Promise<void> | null = null;

export async function ensureProductImportSchema(): Promise<void> {
  if (!ensuredImporterSchema) {
    ensuredImporterSchema = (async () => {
      await run(`
        CREATE TABLE IF NOT EXISTS product_import_jobs (
          id INTEGER PRIMARY KEY,
          source_url TEXT NOT NULL,
          source_domain TEXT NOT NULL DEFAULT '',
          product_id INTEGER,
          status TEXT NOT NULL DEFAULT 'fetched',
          mode TEXT NOT NULL DEFAULT 'pending',
          raw_payload TEXT NOT NULL DEFAULT '{}',
          normalized_payload TEXT NOT NULL DEFAULT '{}',
          audit_notes TEXT NOT NULL DEFAULT '[]',
          images_total INTEGER NOT NULL DEFAULT 0,
          images_cleaned INTEGER NOT NULL DEFAULT 0,
          images_recreated INTEGER NOT NULL DEFAULT 0,
          error_message TEXT NOT NULL DEFAULT '',
          source_cleared INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
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
  if (images.length > 0) {
    warnings.push({
      type: "images",
      label: `${images.length} ảnh lấy từ nguồn ngoài`,
      detail: "Cần tải về hệ thống & kiểm tra/xoá watermark, SĐT trên ảnh",
    });
  }
  return warnings;
}

function cleanFallbackHtml(rawHtml: string, baseUrl: string): string {
  const $ = cheerio.load(rawHtml || "");
  $("script, style, iframe, noscript, form, button").remove();
  $("a").each((_, el) => {
    const text = $(el).text();
    $(el).replaceWith(text);
  });
  $("*").each((_, el) => {
    const attribs = (el as unknown as { attribs?: Record<string, string> }).attribs;
    if (!attribs) return;
    for (const k of Object.keys(attribs)) {
      if (k !== "src" && k !== "alt") $(el).removeAttr(k);
    }
  });
  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    const abs = absolutizeUrl(src, baseUrl);
    if (!abs) $(el).remove();
    else $(el).attr("src", abs);
  });
  return ($("body").html() || $.html() || "").trim();
}

function extractRawFromHtml(html: string, targetUrl: string): ParsedProductDraft & { raw_text: string } {
  const $ = cheerio.load(html);

  let ldName = "";
  let ldPrice = 0;
  let ldSalePrice: number | null = null;
  let ldDesc = "";
  let ldBrand = "";
  let ldSku = "";
  const ldImages: string[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text() || "{}") as Record<string, unknown> | Record<string, unknown>[];
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
  });

  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || "";
  const h1 = $("h1").first().text().trim();
  const titleTag = $("title").text().trim();
  const name = ldName || h1 || ogTitle || titleTag || "Sản phẩm mới";

  const ogDesc =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    "";

  let domPrice = ldPrice;
  if (!domPrice) {
    const priceCandidates = [
      $('meta[property="product:price:amount"]').attr("content"),
      $('[itemprop="price"]').attr("content") || $('[itemprop="price"]').first().text(),
      $(".price ins .woocommerce-Price-amount, .product-price, .price-now, .special-price").first().text(),
      $(".price, .woocommerce-Price-amount").first().text(),
    ];
    for (const c of priceCandidates) {
      const n = parsePriceNumber(c);
      if (n >= 1000) {
        domPrice = n;
        break;
      }
    }
  }

  const images: string[] = [...ldImages];
  const ogImg = absolutizeUrl($('meta[property="og:image"]').attr("content") || "", targetUrl);
  if (ogImg && !images.includes(ogImg)) images.push(ogImg);

  $("img").each((_, el) => {
    const src =
      $(el).attr("data-src") ||
      $(el).attr("data-isrc") ||
      $(el).attr("data-lazy-src") ||
      $(el).attr("src") ||
      "";
    const abs = absolutizeUrl(src, targetUrl);
    if (
      abs &&
      !images.includes(abs) &&
      !/logo|icon|avatar|badge|banner-ads|bct|bo-cong-thuong/i.test(abs) &&
      images.length < 10
    ) {
      images.push(abs);
    }
  });

  const descNode =
    $(
      ".decription, .product-description, .woocommerce-Tabs-panel--description, #tab-description, [itemprop='description'], .entry-content, article, main",
    ).first();
  const rawDescHtml = descNode.length ? descNode.html() || "" : "";
  const rawText = (descNode.text() || ldDesc || ogDesc || "").replace(/\s+/g, " ").trim().slice(0, 6000);

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
        parsed.sale_price && Number(parsed.sale_price) > 0 && Number(parsed.sale_price) < (Number(parsed.price) || raw.price)
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
  duplicateProduct?: { id: number; name: string } | null;
}> {
  await ensureProductImportSchema();
  const safeUrl = assertSafePublicHttpUrl(opts.url);
  const sourceUrl = safeUrl.toString();
  const sourceDomain = safeUrl.hostname.replace(/^www\./, "");

  const existingProd = await one<{ id: number; name: string }>(
    "SELECT id, name FROM products WHERE source_url = ? LIMIT 1",
    sourceUrl,
  );

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
     (source_url, source_domain, status, mode, raw_payload, normalized_payload, audit_notes, images_total)
     VALUES (?, ?, 'fetched', 'pending', ?, ?, ?, ?)`,
    sourceUrl,
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
  return { job: job!, duplicateProduct: existingProd ?? null };
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

export async function listImportJobs(limit = 40): Promise<ProductImportJobRow[]> {
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
  const price = pct !== 0 && draft.price > 0 ? Math.round((draft.price * (1 + pct / 100)) / 1000) * 1000 : draft.price;
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
     SET product_id = ?, status = 'imported', updated_at = datetime('now')
     WHERE id = ?`,
    productId,
    job.id,
  );

  return { productId, job: (await getImportJobById(job.id))! };
}

export async function queueAutoCleanJob(jobId: number): Promise<ProductImportJobRow> {
  await ensureProductImportSchema();
  await run(
    `UPDATE product_import_jobs
     SET status = 'cleaning_queued', mode = 'auto', error_message = '', updated_at = datetime('now')
     WHERE id = ?`,
    jobId,
  );
  return (await getImportJobById(jobId))!;
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

export async function processNextIdleProductImportJob(targetJobId?: number): Promise<{
  processed: boolean;
  jobId?: number;
  status?: string;
}> {
  await ensureProductImportSchema();
  const job = targetJobId
    ? await one<ProductImportJobRow>("SELECT * FROM product_import_jobs WHERE id = ?", targetJobId)
    : await one<ProductImportJobRow>(
        "SELECT * FROM product_import_jobs WHERE status = 'cleaning_queued' ORDER BY id ASC LIMIT 1",
      );

  if (!job || !job.product_id) return { processed: false };

  await run(
    "UPDATE product_import_jobs SET status = 'cleaning_running', updated_at = datetime('now') WHERE id = ?",
    job.id,
  );

  try {
    const product = await one<{
      id: number;
      name: string;
      slug: string;
      summary: string;
      description: string;
      image: string | null;
      gallery: string;
    }>("SELECT id, name, slug, summary, description, image, gallery FROM products WHERE id = ?", job.product_id);

    if (!product) {
      throw new Error("Sản phẩm đã bị xoá.");
    }

    const site = await getSite();
    const apiKey = await resolveGeminiApiKey();

    // 1. Clean text completely & replace with shop official CTA
    let cleanedDesc = cleanFallbackHtml(product.description, job.source_url);
    cleanedDesc = cleanedDesc
      .replace(/(?:\+84|0)\d[\d.\s-]{7,12}\d/g, site.hotline)
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "");
    if (job.source_domain) {
      cleanedDesc = cleanedDesc.replace(new RegExp(job.source_domain.replace(/\./g, "\\."), "gi"), site.name);
    }

    // 2. Smart Image Filter + Localize + Recreate watermarked images
    const candidateImgs = [
      ...(product.image ? [product.image] : []),
      ...(product.gallery || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    ].slice(0, 5);

    const finalImgs: string[] = [];
    let cleanedCount = 0;
    let recreatedCount = 0;

    for (let i = 0; i < candidateImgs.length; i++) {
      const imgUrl = candidateImgs[i];
      if (imgUrl.startsWith("/api/media/") || imgUrl.startsWith("/uploads/")) {
        finalImgs.push(imgUrl);
        cleanedCount++;
        continue;
      }
      const fetched = await fetchImageBytes(imgUrl);
      if (!fetched) continue;

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

      const extSlug = `sp-${product.id}-${i + 1}-${Date.now().toString(36)}`;
      const localUrl = await saveMediaAsset(extSlug, outMime, outBase64);
      finalImgs.push(localUrl);
      cleanedCount++;
    }

    const nextMainImg = finalImgs[0] ?? product.image;
    const nextGallery = finalImgs.slice(1).join("\n");

    await run(
      `UPDATE products
       SET description = ?, image = ?, gallery = ?, stock = CASE WHEN stock = 0 THEN 100 ELSE stock END
       WHERE id = ?`,
      cleanedDesc,
      nextMainImg,
      nextGallery,
      product.id,
    );

    await run(
      `UPDATE product_import_jobs
       SET status = 'cleaned', images_cleaned = ?, images_recreated = ?, audit_notes = '[]', updated_at = datetime('now')
       WHERE id = ?`,
      cleanedCount,
      recreatedCount,
      job.id,
    );

    return { processed: true, jobId: job.id, status: "cleaned" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi xử lý tự động.";
    await run(
      `UPDATE product_import_jobs
       SET status = 'failed', error_message = ?, updated_at = datetime('now')
       WHERE id = ?`,
      msg.slice(0, 300),
      job.id,
    );
    return { processed: true, jobId: job.id, status: "failed" };
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
