#!/usr/bin/env node
// Import products (and their categories) from the current LoveItop site into the local SQLite DB.
//
//   npm run import:products                  # all products found in the sitemap
//   npm run import:products -- --limit 5     # first 5 only (try it out)
//   npm run import:products -- <product-url> # a single product
//   npm run import:products -- --replace     # also delete the placeholder sample products first
//
// For each /san-pham/<category>/<slug>.html it reads: name, price / sale price, short summary,
// description (.detail-descript), main image. Images are downloaded to public/uploads/products/.
// Re-running updates existing products (matched by slug) instead of duplicating them.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const ORIGIN = "https://thucduongthienan.com";
const SOURCE_HOSTS = new Set(["thucduongthienan.com", "www.thucduongthienan.com"]);
const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "data", "shop.db");
const UA = "Mozilla/5.0 (X11; Linux x86_64) thucduong-shop-import";
const CONCURRENCY = 3;
const SAMPLE_MARK = "Đây là nội dung mẫu"; // text of the placeholder products created by lib/seed.ts

// ---- args ----
const args = process.argv.slice(2);
const replace = args.includes("--replace");
const li = args.indexOf("--limit");
const limit = li >= 0 ? Number(args[li + 1]) : Infinity;
const single = args.find((a) => /^https?:\/\//.test(a));

if (!fs.existsSync(DB_PATH)) {
  console.error(`Không thấy ${DB_PATH}. Chạy "npm run dev" và mở trang chủ một lần để tạo database.`);
  process.exit(1);
}

const clean = (s) => s.replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slugify = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function get(url, binary = false) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
      return binary ? Buffer.from(await r.arrayBuffer()) : await r.text();
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(800 * attempt);
    }
  }
}

// ---- DB ----
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
const pcols = db.prepare("PRAGMA table_info(products)").all().map((c) => c.name);
if (!pcols.includes("image")) db.exec("ALTER TABLE products ADD COLUMN image TEXT");
if (!pcols.includes("source_url")) db.exec("ALTER TABLE products ADD COLUMN source_url TEXT");
if (!pcols.includes("stock")) db.exec("ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 100");
if (!pcols.includes("sku")) db.exec("ALTER TABLE products ADD COLUMN sku TEXT NOT NULL DEFAULT ''");
if (!pcols.includes("brand")) db.exec("ALTER TABLE products ADD COLUMN brand TEXT NOT NULL DEFAULT ''");
if (!pcols.includes("origin")) db.exec("ALTER TABLE products ADD COLUMN origin TEXT NOT NULL DEFAULT ''");
if (!pcols.includes("unit")) db.exec("ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT ''");
if (!pcols.includes("gallery")) db.exec("ALTER TABLE products ADD COLUMN gallery TEXT NOT NULL DEFAULT ''");
if (!pcols.includes("video_url")) db.exec("ALTER TABLE products ADD COLUMN video_url TEXT NOT NULL DEFAULT ''");

// ---- which products ----
let urls;
const catOrder = []; // category slugs in the order the site lists them
if (single) {
  urls = [single];
} else {
  const isProduct = (u) => /\/san-pham\/[^/]+\/[^/]+\.html$/.test(u);
  const norm = (u) => u.trim().replace(/^http:/, "https:").replace(/#.*$/, "");
  const found = new Set();

  // 1) sitemap
  const xml = await get(`${ORIGIN}/sitemap.xml`);
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) if (isProduct(norm(m[1]))) found.add(norm(m[1]));

  // 2) the sitemap is incomplete, so also read the homepage and every product category page
  const links = (html) => {
    const $ = cheerio.load(html);
    return $("a[href]").map((_, a) => norm(new URL($(a).attr("href"), ORIGIN).href)).get();
  };
  const home = links(await get(`${ORIGIN}/`));
  const catUrls = new Set(home.filter((u) => /\/san-pham\/[^/]+\/$/.test(u)));
  for (const u of home) if (isProduct(u)) found.add(u);
  for (const c of catUrls) {
    for (const u of links(await get(c))) if (isProduct(u)) found.add(u);
    await sleep(200);
  }
  console.log(`Quét ${catUrls.size} danh mục.`);
  for (const c of catUrls) catOrder.push(new URL(c).pathname.split("/").filter(Boolean)[1]);
  urls = [...found].slice(0, limit);
}
console.log(`Sẽ import ${urls.length} sản phẩm.`);

// ---- optional: remove placeholder sample products ----
if (replace) {
  const sample = db.prepare("SELECT id FROM products WHERE description LIKE ?").all(`%${SAMPLE_MARK}%`);
  db.exec("BEGIN");
  for (const { id } of sample) {
    db.prepare("DELETE FROM comments WHERE product_id = ?").run(id);
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
  }
  db.exec("COMMIT");
  console.log(`Đã xoá ${sample.length} sản phẩm mẫu.`);
}

// ---- images ----
const prodDir = path.join(ROOT, "public", "uploads", "products");
fs.mkdirSync(prodDir, { recursive: true });

async function download(src, base, folder = "") {
  const abs = new URL(src, ORIGIN);
  const ext = (path.extname(abs.pathname) || ".jpg").toLowerCase().split("?")[0];
  const stem = slugify(path.basename(abs.pathname, path.extname(abs.pathname))) || "image";
  const dir = path.join(prodDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${base ? base + "-" : ""}${stem}${ext}`;
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, await get(abs.href, true));
  return `/uploads/products/${folder ? folder + "/" : ""}${name}`;
}

const catSort = new Map(catOrder.map((s, i) => [s, 100 + i]));
const upsertCat = (slug, name) => {
  if (!catSort.has(slug)) catSort.set(slug, 100 + catSort.size);
  const row = db.prepare("SELECT id FROM product_categories WHERE slug = ?").get(slug);
  if (row) {
    db.prepare("UPDATE product_categories SET name = ?, sort = ? WHERE id = ?").run(name, catSort.get(slug), row.id);
    return row.id;
  }
  return Number(db.prepare("INSERT INTO product_categories (slug, name, sort) VALUES (?, ?, ?)").run(slug, name, catSort.get(slug)).lastInsertRowid);
};

// ---- one product ----
async function importOne(pageUrl) {
  const u = new URL(pageUrl);
  const [, catSlug, file] = u.pathname.split("/").filter(Boolean); // san-pham / <category> / <slug>.html
  if (!catSlug || !file?.endsWith(".html")) throw new Error("URL phải có dạng /san-pham/<danh-muc>/<slug>.html");
  const slug = file.slice(0, -5);
  const $ = cheerio.load(await get(pageUrl));

  const name = clean($("h1.product-detail-title").first().text());
  if (!name) throw new Error("không thấy h1.product-detail-title");

  const price = Number($("input[name='product_price']").first().attr("value")) || 0;
  const salePrice = Number($("input[name='product_sale_price']").first().attr("value")) || 0;
  const finalPrice = price || salePrice; // 0 = "Liên hệ" (site shows no price)
  const sale = price && salePrice && salePrice < price ? salePrice : null;

  const catName = clean($(".breadcrumbs li a").eq(2).text()) || catSlug.replace(/-/g, " ");
  const summary = clean($(".product-content-des").first().text()).slice(0, 600);

  // main image: full-size link, fall back to og:image
  const mainSrc = $("a.img-main-href").first().attr("href") || $("meta[property='og:image']").attr("content");
  const image = mainSrc ? await download(mainSrc, slug).catch(() => null) : null;

  // description
  const body = $(".detail-descript").first();
  body.find("#toc, script, style, iframe[src*='facebook']").remove();
  body.find("hr").first().remove();
  for (const el of body.find("img").toArray()) {
    const img = $(el);
    const src = img.attr("data-isrc") || img.attr("data-src") || img.attr("src") || "";
    if (!src || src.startsWith("data:")) {
      img.remove();
      continue;
    }
    try {
      img.attr("src", await download(src, "", slug));
      img.removeAttr("data-isrc").removeAttr("data-src").removeAttr("class");
      img.attr("loading", "lazy");
      if (!img.attr("alt")) img.attr("alt", name);
    } catch {
      img.remove();
    }
  }
  body.find("a[href]").each((_, el) => {
    const a = $(el);
    try {
      const href = new URL(a.attr("href"), pageUrl);
      if (SOURCE_HOSTS.has(href.hostname)) {
        a.attr("href", href.pathname + href.search + href.hash);
        a.removeAttr("target");
      }
    } catch {
      /* keep */
    }
  });
  const description = (body.html() ?? "").trim();

  const catId = upsertCat(catSlug, catName);
  db.prepare(
    `INSERT INTO products (slug, category_id, name, price, sale_price, summary, description, image, source_url, featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(slug) DO UPDATE SET category_id = excluded.category_id, name = excluded.name, price = excluded.price,
       sale_price = excluded.sale_price, summary = excluded.summary, description = excluded.description,
       image = excluded.image, source_url = excluded.source_url`,
  ).run(slug, catId, name, finalPrice, sale, summary, description, image, pageUrl);
  return { name, price: finalPrice, sale, image: !!image };
}

// ---- run with small concurrency ----
let done = 0;
const failed = [];
const queue = [...urls];
async function worker() {
  while (queue.length) {
    const url = queue.shift();
    try {
      const r = await importOne(url);
      console.log(`[${++done}/${urls.length}] ${r.name} - ${r.price}${r.sale ? ` (KM ${r.sale})` : ""}${r.image ? "" : " (không có ảnh)"}`);
    } catch (e) {
      failed.push(url);
      console.error(`[lỗi] ${url}: ${e.message}`);
    }
    await sleep(250);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

if (replace) {
  // drop the placeholder categories that ended up empty
  const gone = db.prepare("DELETE FROM product_categories WHERE id NOT IN (SELECT DISTINCT category_id FROM products)").run();
  console.log(`Đã xoá ${gone.changes} danh mục mẫu rỗng.`);
}

const total = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
console.log(`\nXong: ${done} thành công, ${failed.length} lỗi. Tổng sản phẩm trong DB: ${total}.`);
if (failed.length) console.log("URL lỗi:\n" + failed.join("\n"));
