#!/usr/bin/env node
// Import one article from the current (LoveItop) site into the local SQLite DB.
//
//   npm run import:post -- https://thucduongphuctho.net/thuc-duong/thuc-duong-can-ban/<slug>.html
//
// - Reads title, date, description and the article body (.article-detail .decription)
// - Downloads every image (lazy-loaded via data-isrc) to public/uploads/posts/<slug>/
// - Rewrites links to the old domain into relative paths
// - Upserts the post under /<section>/<category>/<slug>.html
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const SOURCE_HOSTS = new Set(["thucduongphuctho.net", "www.thucduongphuctho.net"]);
const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "data", "shop.db");
const UA = "Mozilla/5.0 (X11; Linux x86_64) thucduong-shop-import";

const pageUrl = process.argv[2];
if (!pageUrl) {
  console.error("Usage: npm run import:post -- <article-url>");
  process.exit(1);
}
if (!fs.existsSync(DB_PATH)) {
  console.error(`Không thấy ${DB_PATH}. Chạy "npm run dev" và mở trang chủ một lần để tạo database.`);
  process.exit(1);
}

const u = new URL(pageUrl);
const segs = u.pathname.split("/").filter(Boolean);
if (segs.length !== 3 || !segs[2].endsWith(".html")) {
  console.error("URL phải có dạng /<section>/<category>/<slug>.html");
  process.exit(1);
}
const [sectionSlug, categorySlug, file] = segs;
const slug = file.slice(0, -5);

const res = await fetch(pageUrl, { headers: { "User-Agent": UA } });
if (!res.ok) throw new Error(`GET ${pageUrl} → ${res.status}`);
const $ = cheerio.load(await res.text());

const article = $("article.article-detail").first();
if (!article.length) throw new Error("Không tìm thấy article.article-detail trên trang");

const clean = (s) => s.replace(/\s+/g, " ").trim();
const title = clean(article.find("h1.post-detail-title").text()) || clean($("meta[property='og:title']").attr("content") ?? slug);
const excerpt = clean($("meta[name='description']").attr("content") ?? "");
const dateText = clean(article.find(".post-detail-date").text()).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
const createdAt = dateText
  ? `${dateText[3]}-${dateText[2].padStart(2, "0")}-${dateText[1].padStart(2, "0")} 00:00:00`
  : new Date().toISOString().slice(0, 19).replace("T", " ");

// Breadcrumb names (fall back to slugs) for creating a missing section/category.
const crumbs = $(".breadcrumb a, .breadcrumbs a").map((_, a) => ({ href: $(a).attr("href") ?? "", name: clean($(a).text()) })).get();
const nameFor = (s) => crumbs.find((c) => c.href.replace(/\/$/, "").endsWith("/" + s))?.name || s.replace(/-/g, " ");

const body = article.find(".decription").first();
if (!body.length) throw new Error("Không tìm thấy phần nội dung (.decription)");
body.find("script, style, iframe[src*='facebook']").remove();

// ---- images ----
const uploadDir = path.join(ROOT, "public", "uploads", "posts", slug);
fs.mkdirSync(uploadDir, { recursive: true });
const used = new Set();

async function download(src) {
  const abs = new URL(src, pageUrl);
  let name = decodeURIComponent(path.basename(abs.pathname)).replace(/[^\w.\-]+/g, "-").toLowerCase() || "image";
  while (used.has(name)) name = name.replace(/(\.\w+)?$/, (ext) => `-1${ext}`);
  used.add(name);
  const r = await fetch(abs, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`GET ${abs} → ${r.status}`);
  fs.writeFileSync(path.join(uploadDir, name), Buffer.from(await r.arrayBuffer()));
  return `/uploads/posts/${slug}/${name}`;
}

let images = 0;
for (const el of body.find("img").toArray()) {
  const img = $(el);
  const src = img.attr("data-isrc") || img.attr("data-src") || img.attr("src") || "";
  if (!src || src.startsWith("data:")) {
    img.remove();
    continue;
  }
  img.attr("src", await download(src));
  img.removeAttr("data-isrc").removeAttr("data-src");
  if (!img.attr("alt")) img.attr("alt", title);
  img.attr("loading", "lazy");
  images++;
}

const ogImage = $("meta[property='og:image']").attr("content");
const cover = ogImage ? await download(ogImage) : null;

// ---- links: old domain → relative ----
body.find("a[href]").each((_, el) => {
  const a = $(el);
  try {
    const href = new URL(a.attr("href"), pageUrl);
    if (SOURCE_HOSTS.has(href.hostname)) {
      a.attr("href", href.pathname + href.search + href.hash);
      a.removeAttr("target");
    }
  } catch {
    /* keep as is */
  }
});

const content = (body.html() ?? "").trim();

// ---- upsert ----
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");
const cols = db.prepare("PRAGMA table_info(posts)").all().map((c) => c.name);
if (!cols.includes("cover")) db.exec("ALTER TABLE posts ADD COLUMN cover TEXT");
if (!cols.includes("source_url")) db.exec("ALTER TABLE posts ADD COLUMN source_url TEXT");

db.prepare("INSERT OR IGNORE INTO post_sections (slug, name, sort) VALUES (?, ?, 99)").run(sectionSlug, nameFor(sectionSlug));
db.prepare("INSERT OR IGNORE INTO post_categories (slug, section_slug, name) VALUES (?, ?, ?)").run(categorySlug, sectionSlug, nameFor(categorySlug));
const cat = db.prepare("SELECT id FROM post_categories WHERE slug = ?").get(categorySlug);

db.prepare(
  `INSERT INTO posts (slug, category_id, title, excerpt, content, created_at, cover, source_url)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(slug) DO UPDATE SET category_id = excluded.category_id, title = excluded.title,
     excerpt = excluded.excerpt, content = excluded.content, created_at = excluded.created_at,
     cover = excluded.cover, source_url = excluded.source_url`,
).run(slug, cat.id, title, excerpt, content, createdAt, cover, pageUrl);

console.log(JSON.stringify({ ok: true, title, createdAt, images, cover, local: `/${sectionSlug}/${categorySlug}/${slug}.html` }, null, 2));
