import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { CACHE_TAGS } from "./cache-tags";
import { all, one, run } from "./db";

export type ProductCategory = {
  id: number;
  slug: string;
  name: string;
  show_in_menu?: number;
  show_in_home?: number;
  show_in_footer?: number;
  is_active?: number;
  seo_title?: string;
  description?: string;
};
export type Product = {
  id: number;
  slug: string;
  name: string;
  price: number;
  sale_price: number | null;
  stock: number;
  summary: string;
  description: string;
  featured: number;
  image: string | null;
  sku: string;
  brand: string;
  origin: string;
  unit: string;
  gallery: string;
  video_url: string;
  rating_avg: number;
  rating_count: number;
  category_id: number;
  category_slug: string;
  category_name: string;
};
export type PostSection = { slug: string; name: string };
export type PostCategory = { id: number; slug: string; name: string; section_slug: string };
export type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  created_at: string;
  cover: string | null;
  related_product_ids: string;
  combo_title: string;
  category_slug: string;
  category_name: string;
  section_slug: string;
};
export type Page = { grp: string; slug: string; title: string; content: string };

const PRODUCT_CARD_COLS = `p.id, p.slug, p.name, p.price, p.sale_price, p.stock, p.summary, '' AS description, p.featured, p.image,
  p.sku, p.brand, p.origin, p.unit, '' AS gallery, '' AS video_url,
  COALESCE((SELECT ROUND(AVG(rating), 1) FROM comments WHERE product_id = p.id), 0) AS rating_avg,
  (SELECT COUNT(*) FROM comments WHERE product_id = p.id) AS rating_count,
  p.category_id, c.slug AS category_slug, c.name AS category_name`;
const PRODUCT_DETAIL_COLS = `p.id, p.slug, p.name, p.price, p.sale_price, p.stock, p.summary, p.description, p.featured, p.image,
  p.sku, p.brand, p.origin, p.unit, p.gallery, p.video_url,
  COALESCE((SELECT ROUND(AVG(rating), 1) FROM comments WHERE product_id = p.id), 0) AS rating_avg,
  (SELECT COUNT(*) FROM comments WHERE product_id = p.id) AS rating_count,
  p.category_id, c.slug AS category_slug, c.name AS category_name`;
const PRODUCT_COLS = PRODUCT_CARD_COLS;
const POST_COLS = `po.id, po.slug, po.title, po.excerpt, po.content, po.created_at, po.cover,
  po.related_product_ids, po.combo_title,
  pc.slug AS category_slug, pc.name AS category_name, pc.section_slug`;

// ---- URLs (single source of truth for the site's URL scheme) ----
export const url = {
  productCategory: (c: { slug: string }) => `/san-pham/${c.slug}/`,
  product: (p: { slug: string; category_slug: string }) => `/san-pham/${p.category_slug}/${p.slug}.html`,
  postSection: (slug: string) => `/${slug}/`,
  postCategory: (c: { slug: string; section_slug: string }) => `/${c.section_slug}/${c.slug}/`,
  // Canonical post URL on the reference site: /<section>/<category>/<slug>.html
  // (the shorter /<category>/<slug>.html form is still accepted by app/[section]/[slug]).
  post: (p: { slug: string; category_slug: string; section_slug: string }) =>
    `/${p.section_slug}/${p.category_slug}/${p.slug}.html`,
  page: (p: { grp: string; slug: string }) => (p.grp ? `/${p.grp}/${p.slug}.html` : `/${p.slug}.html`),
};

export async function ensureProductCategoryMenuColumn() {
  // Columns (show_in_menu, show_in_home, show_in_footer, is_active, seo_title, description)
  // are applied via D1 migrations (migrations/0001_schema_sync.sql) to avoid runtime PRAGMA overhead.
  return;
}

const cachedProductCategories = unstable_cache(
  async () =>
    all<ProductCategory>(
      "SELECT id, slug, name, COALESCE(show_in_menu,1) AS show_in_menu, COALESCE(show_in_home,1) AS show_in_home, COALESCE(show_in_footer,1) AS show_in_footer, COALESCE(is_active,1) AS is_active, COALESCE(seo_title,'') AS seo_title, COALESCE(description,'') AS description FROM product_categories WHERE COALESCE(is_active, 1) = 1 ORDER BY sort, id",
    ),
  ["storefront-product-categories"],
  { revalidate: 60, tags: [CACHE_TAGS.categories] },
);

// ---- Products ----
export const getProductCategories = cache(async () => {
  await ensureProductCategoryMenuColumn();
  try {
    return await cachedProductCategories();
  } catch {
    return all<ProductCategory>(
      "SELECT id, slug, name, COALESCE(show_in_menu,1) AS show_in_menu, COALESCE(show_in_home,1) AS show_in_home, COALESCE(show_in_footer,1) AS show_in_footer, COALESCE(is_active,1) AS is_active, COALESCE(seo_title,'') AS seo_title, COALESCE(description,'') AS description FROM product_categories WHERE COALESCE(is_active, 1) = 1 ORDER BY sort, id",
    );
  }
});

export const getMenuProductCategories = cache(async () => {
  const cats = await getProductCategories();
  return cats
    .filter((c) => (c.show_in_menu ?? 1) === 1)
    .map(({ id, slug, name }) => ({ id, slug, name }));
});

export const getHomeProductCategories = cache(async () => {
  const cats = await getProductCategories();
  return cats
    .filter((c) => (c.show_in_home ?? 1) === 1)
    .map(({ id, slug, name }) => ({ id, slug, name }));
});

export const getFooterProductCategories = cache(async () => {
  const cats = await getProductCategories();
  return cats
    .filter((c) => (c.show_in_footer ?? 1) === 1)
    .map(({ id, slug, name }) => ({ id, slug, name }));
});

export const getProductCategory = cache(async (slug: string) => {
  await ensureProductCategoryMenuColumn();
  return one<ProductCategory>(
    "SELECT id, slug, name, COALESCE(seo_title,'') AS seo_title, COALESCE(description,'') AS description, COALESCE(is_active,1) AS is_active FROM product_categories WHERE slug = ?",
    slug,
  );
});

const PUB = "COALESCE(p.is_published, 1) = 1";
const CDS_FIRST = "CASE WHEN LOWER(p.name) LIKE '%canh dưỡng sinh%' OR LOWER(p.name) LIKE '%canh duong sinh%' THEN 0 ELSE 1 END";

export const getProducts = cache((limit = 1000) =>
  all<Product>(
    `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id WHERE ${PUB} ORDER BY ${CDS_FIRST}, p.featured DESC, c.sort, p.id DESC LIMIT ?`,
    limit,
  ),
);

export const getProductsByCategory = cache((categoryId: number, limit = 1000) =>
  all<Product>(
    `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id
     WHERE p.category_id = ? AND ${PUB} ORDER BY ${CDS_FIRST}, p.featured DESC, p.id DESC LIMIT ?`,
    categoryId,
    limit,
  ),
);

/** Fetch top N products for every category in a single D1 query (eliminates N+1 on home page). */
export const getHomeCategoryProducts = cache(async (limitPerCategory = 4): Promise<Map<number, Product[]>> => {
  const rows = await all<Product & { rn: number }>(
    `SELECT * FROM (
       SELECT ${PRODUCT_COLS},
         ROW_NUMBER() OVER (
           PARTITION BY p.category_id
           ORDER BY ${CDS_FIRST}, p.featured DESC, p.id DESC
         ) AS rn
       FROM products p
       JOIN product_categories c ON c.id = p.category_id
        WHERE ${PUB}
     ) WHERE rn <= ?
     ORDER BY category_id, rn`,
    limitPerCategory,
  );
  const map = new Map<number, Product[]>();
  for (const r of rows) {
    const list = map.get(r.category_id) ?? [];
    list.push(r);
    map.set(r.category_id, list);
  }
  return map;
});

export const getProduct = cache((categorySlug: string, slug: string) =>
  one<Product>(
    `SELECT ${PRODUCT_DETAIL_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id
     WHERE c.slug = ? AND p.slug = ? AND ${PUB}`,
    categorySlug,
    slug,
  ),
);

export const getProductsByIds = async (ids: number[]): Promise<Product[]> =>
  ids.length
    ? all<Product>(
        `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id
         WHERE p.id IN (${ids.map(() => "?").join(",")}) AND ${PUB}`,
        ...ids,
      )
    : [];

export const getRelatedProducts = (p: Product, limit = 4) =>
  all<Product>(
    `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id
     WHERE p.category_id = ? AND p.id <> ? AND ${PUB} LIMIT ?`,
    p.category_id,
    p.id,
    limit,
  );

export type ProductFilterOptions = {
  categoryId?: number;
  q?: string;
  brand?: string;
  origin?: string;
  priceRange?: string; // "under-100" | "100-300" | "300-500" | "over-500"
  onSale?: boolean;
  inStock?: boolean;
  sort?: string; // "featured" | "newest" | "price-asc" | "price-desc" | "discount"
  limit?: number;
};

export async function filterProducts(opts: ProductFilterOptions = {}): Promise<Product[]> {
  const where: string[] = [PUB];
  const params: (string | number)[] = [];
  if (opts.categoryId) {
    where.push("p.category_id = ?");
    params.push(opts.categoryId);
  }
  if (opts.q) {
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)");
    const like = `%${opts.q}%`;
    params.push(like, like, like);
  }
  if (opts.brand) {
    where.push("p.brand = ?");
    params.push(opts.brand);
  }
  if (opts.origin) {
    where.push("p.origin = ?");
    params.push(opts.origin);
  }
  if (opts.onSale) {
    where.push("p.sale_price IS NOT NULL AND p.sale_price > 0 AND p.sale_price < p.price");
  }
  if (opts.inStock) {
    where.push("p.stock > 0");
  }
  const effPrice = "COALESCE(p.sale_price, p.price)";
  if (opts.priceRange === "under-100") {
    where.push(`${effPrice} > 0 AND ${effPrice} < 100000`);
  } else if (opts.priceRange === "100-300") {
    where.push(`${effPrice} >= 100000 AND ${effPrice} <= 300000`);
  } else if (opts.priceRange === "300-500") {
    where.push(`${effPrice} > 300000 AND ${effPrice} <= 500000`);
  } else if (opts.priceRange === "over-500") {
    where.push(`${effPrice} > 500000`);
  }

  let orderBy = `${CDS_FIRST}, p.featured DESC, p.id DESC`;
  if (opts.sort === "newest") orderBy = "p.id DESC";
  else if (opts.sort === "price-asc") orderBy = `CASE WHEN ${effPrice} = 0 THEN 1 ELSE 0 END, ${effPrice} ASC, p.id DESC`;
  else if (opts.sort === "price-desc") orderBy = `${effPrice} DESC, p.id DESC`;
  else if (opts.sort === "discount") {
    orderBy =
      "CASE WHEN p.sale_price IS NOT NULL AND p.price > 0 THEN ROUND((p.price - p.sale_price) * 100.0 / p.price) ELSE 0 END DESC, p.featured DESC";
  }

  return all<Product>(
    `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY ${orderBy} LIMIT ?`,
    ...params,
    opts.limit ?? 1000,
  );
}

export async function getProductFilterFacets(categoryId?: number) {
  const cond = categoryId ? "AND category_id = ?" : "";
  const args = categoryId ? [categoryId] : [];
  const [brands, origins] = await Promise.all([
    all<{ brand: string; count: number }>(
      `SELECT brand, COUNT(*) AS count FROM products WHERE COALESCE(is_published, 1) = 1 AND brand <> '' ${cond} GROUP BY brand ORDER BY count DESC, brand ASC`,
      ...args,
    ),
    all<{ origin: string; count: number }>(
      `SELECT origin, COUNT(*) AS count FROM products WHERE COALESCE(is_published, 1) = 1 AND origin <> '' ${cond} GROUP BY origin ORDER BY count DESC, origin ASC`,
      ...args,
    ),
  ]);
  return { brands, origins };
}

const cachedPostSections = unstable_cache(
  async () => all<PostSection>("SELECT slug, name FROM post_sections ORDER BY sort"),
  ["storefront-post-sections"],
  { revalidate: 120, tags: [CACHE_TAGS.posts, CACHE_TAGS.categories] },
);

const cachedAllPostCategories = unstable_cache(
  async () => all<PostCategory>("SELECT id, slug, name, section_slug FROM post_categories ORDER BY id"),
  ["storefront-post-categories"],
  { revalidate: 120, tags: [CACHE_TAGS.posts, CACHE_TAGS.categories] },
);

// ---- Posts ----
export const getPostSections = cache(async () => {
  try {
    return await cachedPostSections();
  } catch {
    return all<PostSection>("SELECT slug, name FROM post_sections ORDER BY sort");
  }
});
export const getPostSection = cache(async (slug: string) => {
  const sections = await getPostSections();
  return sections.find((s) => s.slug === slug);
});
export const getPostCategories = cache(async (section?: string) => {
  let cats: PostCategory[];
  try {
    cats = await cachedAllPostCategories();
  } catch {
    cats = await all<PostCategory>("SELECT id, slug, name, section_slug FROM post_categories ORDER BY id");
  }
  return section ? cats.filter((c) => c.section_slug === section) : cats;
});
export const getPostCategory = cache((section: string, slug: string) =>
  one<PostCategory>(
    "SELECT id, slug, name, section_slug FROM post_categories WHERE section_slug = ? AND slug = ?",
    section,
    slug,
  ),
);

export const getPosts = (opts: { section?: string; categoryId?: number; limit?: number } = {}) => {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.section) (where.push("pc.section_slug = ?"), params.push(opts.section));
  if (opts.categoryId) (where.push("po.category_id = ?"), params.push(opts.categoryId));
  return all<Post>(
    `SELECT ${POST_COLS} FROM posts po JOIN post_categories pc ON pc.id = po.category_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY po.created_at DESC LIMIT ?`,
    ...params,
    opts.limit ?? 50,
  );
};

export const getPost = cache((categorySlug: string, slug: string) =>
  one<Post>(
    `SELECT ${POST_COLS} FROM posts po JOIN post_categories pc ON pc.id = po.category_id
     WHERE pc.slug = ? AND po.slug = ?`,
    categorySlug,
    slug,
  ),
);

export async function getPostComboProducts(post: Post): Promise<Product[]> {
  const ids = (post.related_product_ids || "")
    .split(/[\s,]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length > 0) {
    const rows = await getProductsByIds(ids);
    if (rows.length > 0) return rows;
  }
  return all<Product>(
    `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id
     WHERE ${PUB} AND p.price > 0 AND p.stock > 0 ORDER BY p.featured DESC, p.id ASC LIMIT 3`,
  );
}

export function getBestSellingProducts(limit = 4): Promise<Product[]> {
  return all<Product>(
    `SELECT ${PRODUCT_COLS},
            COALESCE((SELECT SUM(oi.qty) FROM order_items oi WHERE oi.product_id = p.id), 0) AS sold_qty
     FROM products p JOIN product_categories c ON c.id = p.category_id
     WHERE ${PUB} AND p.price > 0 AND p.stock > 0
     ORDER BY sold_qty DESC, p.featured DESC, rating_count DESC, p.id ASC
     LIMIT ?`,
    limit,
  );
}

export function getCrossSellProducts(excludeIds: number[] = [], limit = 4): Promise<Product[]> {
  const validExclude = excludeIds.filter((n) => Number.isInteger(n) && n > 0);
  const notIn = validExclude.length ? `AND p.id NOT IN (${validExclude.map(() => "?").join(",")})` : "";
  return all<Product>(
    `SELECT ${PRODUCT_COLS}
     FROM products p JOIN product_categories c ON c.id = p.category_id
     WHERE ${PUB} AND p.price > 0 AND p.stock > 0 ${notIn}
     ORDER BY (p.sale_price IS NOT NULL AND p.sale_price < p.price) DESC, p.featured DESC, p.id DESC
     LIMIT ?`,
    ...validExclude,
    limit,
  );
}

const cachedPagesByGroup = unstable_cache(
  async (grp: string) => all<Page>("SELECT grp, slug, title, content FROM pages WHERE grp = ? ORDER BY rowid", grp),
  ["storefront-pages-group"],
  { revalidate: 120, tags: [CACHE_TAGS.pages] },
);

// ---- Static pages ----
export const getPage = cache((grp: string, slug: string) =>
  one<Page>("SELECT grp, slug, title, content FROM pages WHERE grp = ? AND slug = ?", grp, slug),
);
export const getPages = cache(async (grp: string) => {
  try {
    return await cachedPagesByGroup(grp);
  } catch {
    return all<Page>("SELECT grp, slug, title, content FROM pages WHERE grp = ? ORDER BY rowid", grp);
  }
});

// ---- Search ----
export async function search(q: string, limit = 8) {
  const like = `%${q}%`;
  const [products, posts] = await Promise.all([
    all<Product>(
      `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id
       WHERE p.name LIKE ? AND ${PUB} LIMIT ?`,
      like,
      limit,
    ),
    all<Post>(
      `SELECT ${POST_COLS} FROM posts po JOIN post_categories pc ON pc.id = po.category_id
       WHERE po.title LIKE ? LIMIT ?`,
      like,
      limit,
    ),
  ]);
  return { products, posts };
}

// ---- Admin lookups (by id) ----
export const getProductById = (id: number) =>
  one<Product & { featured: number; is_published: number }>(
    `SELECT ${PRODUCT_DETAIL_COLS}, p.featured, COALESCE(p.is_published, 1) AS is_published FROM products p JOIN product_categories c ON c.id = p.category_id WHERE p.id = ?`,
    id,
  );
export const getPostById = (id: number) =>
  one<Post>(
    `SELECT ${POST_COLS} FROM posts po JOIN post_categories pc ON pc.id = po.category_id WHERE po.id = ?`,
    id,
  );

// ---- Video Library (Bài giảng Thực dưỡng - YouTube @quocduy2401) ----
export type VideoItem = {
  id: number;
  youtube_url: string;
  video_id: string;
  title: string;
  topic: string;
  description: string;
  sort: number;
  created_at: string;
};

const cachedVideos = unstable_cache(
  async () =>
    all<VideoItem>("SELECT id, youtube_url, video_id, title, topic, description, sort, created_at FROM videos ORDER BY sort ASC, id DESC"),
  ["storefront-videos"],
  { revalidate: 120, tags: [CACHE_TAGS.videos] },
);

const cachedVideoTopics = unstable_cache(
  async () =>
    all<{ topic: string; count: number }>(
      "SELECT topic, COUNT(*) AS count FROM videos WHERE topic <> '' GROUP BY topic ORDER BY MIN(sort) ASC, topic ASC",
    ),
  ["storefront-video-topics"],
  { revalidate: 120, tags: [CACHE_TAGS.videos] },
);

export const getVideos = cache(async () => {
  try {
    return await cachedVideos();
  } catch {
    return all<VideoItem>("SELECT id, youtube_url, video_id, title, topic, description, sort, created_at FROM videos ORDER BY sort ASC, id DESC");
  }
});

export const getVideoTopics = cache(async () => {
  try {
    return await cachedVideoTopics();
  } catch {
    return all<{ topic: string; count: number }>(
      "SELECT topic, COUNT(*) AS count FROM videos WHERE topic <> '' GROUP BY topic ORDER BY MIN(sort) ASC, topic ASC",
    );
  }
});

// ---- Document & Book Library (Tài liệu Thực dưỡng) ----
export type DocumentItem = {
  id: number;
  slug: string;
  title: string;
  folder_path: string;
  doc_type: "pdf" | "doc" | "ppt" | "book";
  access_mode: "free" | "survey" | "bundle" | "paid" | "affiliate";
  price: number;
  drive_url: string;
  drive_folder_url: string;
  affiliate_url: string;
  bundle_product_id: number | null;
  bundle_product_name: string | null;
  bundle_product_slug: string | null;
  bundle_category_slug: string | null;
  bundle_product_price: number | null;
  bundle_product_image: string | null;
  cover: string;
  author: string;
  pages: number;
  file_size: string;
  summary: string;
  highlights: string;
  review_html: string;
  task_prompt: string;
  downloads: number;
  sort: number;
  created_at: string;
};

const DOC_COLS = `d.id, d.slug, d.title, d.folder_path, d.doc_type, d.access_mode, d.price,
  d.drive_url, d.drive_folder_url, d.affiliate_url, d.bundle_product_id,
  p.name AS bundle_product_name, p.slug AS bundle_product_slug, pc.slug AS bundle_category_slug,
  COALESCE(p.sale_price, p.price) AS bundle_product_price, p.image AS bundle_product_image,
  d.cover, d.author, d.pages, d.file_size, d.summary, d.highlights, d.review_html, d.task_prompt,
  d.downloads, d.sort, d.created_at`;

const cachedDocuments = unstable_cache(
  async () =>
    all<DocumentItem>(
      `SELECT ${DOC_COLS}
       FROM documents d
       LEFT JOIN products p ON p.id = d.bundle_product_id
       LEFT JOIN product_categories pc ON pc.id = p.category_id
       ORDER BY d.sort ASC, d.id DESC`,
    ),
  ["storefront-documents"],
  { revalidate: 120, tags: [CACHE_TAGS.documents] },
);

export const getDocuments = cache(async () => {
  try {
    return await cachedDocuments();
  } catch {
    return all<DocumentItem>(
      `SELECT ${DOC_COLS}
       FROM documents d
       LEFT JOIN products p ON p.id = d.bundle_product_id
       LEFT JOIN product_categories pc ON pc.id = p.category_id
       ORDER BY d.sort ASC, d.id DESC`,
    );
  }
});

export const getDocumentById = (id: number) =>
  one<DocumentItem>(
    `SELECT ${DOC_COLS}
     FROM documents d
     LEFT JOIN products p ON p.id = d.bundle_product_id
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     WHERE d.id = ?`,
    id,
  );
