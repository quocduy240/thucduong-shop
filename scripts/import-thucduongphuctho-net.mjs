import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.thucduongphuctho.net";
const OUT_IMG_DIR = path.resolve("public/uploads/products/phuctho");
const OUT_SQL = "/tmp/import-phuctho-net.sql";

const META_HANDLES = new Set(["all", "hot-products", "onsale", "frontpage"]);

function sqlStr(v) {
  if (v === null || v === undefined) return "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function stripHtmlSummary(html, maxLen = 220) {
  const txt = String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return txt.length > maxLen ? txt.slice(0, maxLen - 1).trim() + "…" : txt;
}

function extFromUrl(u) {
  try {
    const p = new URL(u.startsWith("//") ? "https:" + u : u).pathname;
    const ext = path.extname(p).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) return ext;
  } catch {
    /* ignore */
  }
  return ".jpg";
}

async function downloadImage(rawUrl, localName) {
  if (!rawUrl) return null;
  const fullUrl = rawUrl.startsWith("//") ? "https:" + rawUrl : rawUrl;
  const ext = extFromUrl(fullUrl);
  const fileName = `${localName}${ext}`;
  const destPath = path.join(OUT_IMG_DIR, fileName);
  const publicPath = `/uploads/products/phuctho/${fileName}`;

  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
    return publicPath;
  }

  try {
    const res = await fetch(fullUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return fullUrl;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return fullUrl;
    fs.writeFileSync(destPath, buf);
    return publicPath;
  } catch {
    return fullUrl;
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  fs.mkdirSync(OUT_IMG_DIR, { recursive: true });

  console.log("1. Fetching collections from", BASE);
  const colData = await fetchJson(`${BASE}/collections.json?limit=250`);
  const collections = (colData?.collections || []).filter((c) => Number(c.products_count) > 0);
  console.log(`   Found ${collections.length} non-empty collections.`);

  // Map handle -> primary category { slug, title }
  const productCategoryMap = new Map();
  const realCategories = new Map();

  // Process specific collections first (non-meta), then meta
  const sortedCollections = [
    ...collections.filter((c) => !META_HANDLES.has(c.handle)),
    ...collections.filter((c) => META_HANDLES.has(c.handle)),
  ];

  for (const col of sortedCollections) {
    let page = 1;
    while (page <= 10) {
      const data = await fetchJson(`${BASE}/collections/${col.handle}/products.json?limit=250&page=${page}`);
      const list = data?.products || [];
      if (list.length === 0) break;

      if (!META_HANDLES.has(col.handle)) {
        realCategories.set(col.handle, { slug: col.handle, name: col.title });
      }

      for (const p of list) {
        if (!productCategoryMap.has(p.handle)) {
          if (!META_HANDLES.has(col.handle)) {
            productCategoryMap.set(p.handle, col.handle);
          }
        }
      }
      if (list.length < 250) break;
      page++;
    }
  }

  // Fetch ALL products across pages from /collections/all/products.json
  console.log("2. Fetching all products from /collections/all/products.json...");
  const allProductsMap = new Map();
  for (let page = 1; page <= 10; page++) {
    const data = await fetchJson(`${BASE}/collections/all/products.json?limit=250&page=${page}`);
    const list = data?.products || [];
    if (list.length === 0) break;
    for (const p of list) {
      allProductsMap.set(p.handle, p);
    }
    if (list.length < 50) break;
  }

  // Cross-check sitemap_products_1.xml to ensure zero missed products
  try {
    const smRes = await fetch(`${BASE}/sitemap_products_1.xml?from=1071825810&to=1073391677`);
    if (smRes.ok) {
      const xml = await smRes.text();
      const handles = [...xml.matchAll(/<loc>https:\/\/www\.thucduongphuctho\.net\/products\/([^<]+)<\/loc>/g)].map(
        (m) => m[1],
      );
      for (const h of handles) {
        if (!allProductsMap.has(h)) {
          const single = await fetchJson(`${BASE}/products/${h}.json`);
          if (single?.product) {
            allProductsMap.set(h, single.product);
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  const allProducts = [...allProductsMap.values()];
  console.log(`   Total unique products fetched: ${allProducts.length}`);

  // Fallback category if a product wasn't in a non-meta collection
  if (!realCategories.has("thuc-pham-thuc-duong")) {
    realCategories.set("thuc-pham-thuc-duong", { slug: "thuc-pham-thuc-duong", name: "Thực Phẩm Thực Dưỡng" });
  }

  const sqlLines = [
    "-- Auto-generated import from https://www.thucduongphuctho.net/",
    "DELETE FROM products WHERE source_url LIKE 'https://www.thucduongphuctho.net/%';",
  ];

  // Upsert categories
  let sortOrder = 20;
  for (const cat of realCategories.values()) {
    sqlLines.push(
      `INSERT INTO product_categories (slug, name, sort) SELECT ${sqlStr(cat.slug)}, ${sqlStr(cat.name)}, ${sortOrder} WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE slug = ${sqlStr(cat.slug)});`,
    );
    sortOrder++;
  }

  // Download images & build product SQL
  let imgCount = 0;
  for (const p of allProducts) {
    const catSlug = productCategoryMap.get(p.handle) || "thuc-pham-thuc-duong";
    const variant = p.variants?.[0] || {};
    const rawPrice = Math.round(Number(variant.price || 0));
    const rawCompare = Math.round(Number(variant.compare_at_price || 0));
    // In Haravan: compare_at_price > price means price is sale_price, compare_at_price is original price
    const price = rawCompare > rawPrice && rawPrice > 0 ? rawCompare : rawPrice;
    const salePrice = rawCompare > rawPrice && rawPrice > 0 ? rawPrice : null;

    const images = Array.isArray(p.images) ? p.images : [];
    const mainImgUrl = images[0]?.src || p.image?.src || "";
    const localMainImg = mainImgUrl ? await downloadImage(mainImgUrl, p.handle) : null;
    if (localMainImg?.startsWith("/uploads/")) imgCount++;

    const galleryLocal = [];
    for (let i = 1; i < Math.min(images.length, 6); i++) {
      const gUrl = await downloadImage(images[i]?.src, `${p.handle}-${i + 1}`);
      if (gUrl) galleryLocal.push(gUrl);
    }

    const summary = stripHtmlSummary(p.body_html);
    const sku = variant.sku || "";
    const brand = p.vendor && p.vendor !== "Khác" ? p.vendor : "Thực Dưỡng Phúc Thọ";
    const sourceUrl = `${BASE}/products/${p.handle}`;

    // Also remove any existing product with same slug so re-import never collides
    sqlLines.push(`DELETE FROM products WHERE slug = ${sqlStr(p.handle)};`);
    sqlLines.push(
      `INSERT INTO products (slug, category_id, name, price, sale_price, summary, description, featured, image, source_url, stock, sku, brand, origin, unit, gallery, video_url)
       VALUES (
         ${sqlStr(p.handle)},
         (SELECT id FROM product_categories WHERE slug = ${sqlStr(catSlug)} LIMIT 1),
         ${sqlStr(p.title)},
         ${price},
         ${salePrice === null ? "NULL" : salePrice},
         ${sqlStr(summary)},
         ${sqlStr(p.body_html || "")},
         0,
         ${sqlStr(localMainImg)},
         ${sqlStr(sourceUrl)},
         100,
         ${sqlStr(sku)},
         ${sqlStr(brand)},
         '',
         '',
         ${sqlStr(galleryLocal.join("\n"))},
         ''
       );`,
    );
  }

  fs.writeFileSync(OUT_SQL, sqlLines.join("\n"), "utf8");
  console.log(`3. Done! Downloaded ${imgCount} main images to ${OUT_IMG_DIR}`);
  console.log(`4. Generated SQL at ${OUT_SQL} (${allProducts.length} products, ${realCategories.size} categories).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
