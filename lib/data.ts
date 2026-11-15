import "server-only";
import { all, one } from "./db";

export type ProductCategory = { id: number; slug: string; name: string };
export type Product = {
  id: number;
  slug: string;
  name: string;
  price: number;
  sale_price: number | null;
  stock: number;
  summary: string;
  description: string;
  image: string | null;
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
  category_slug: string;
  category_name: string;
  section_slug: string;
};
export type Page = { grp: string; slug: string; title: string; content: string };

const PRODUCT_COLS = `p.id, p.slug, p.name, p.price, p.sale_price, p.stock, p.summary, p.description, p.image,
  p.category_id, c.slug AS category_slug, c.name AS category_name`;
const POST_COLS = `po.id, po.slug, po.title, po.excerpt, po.content, po.created_at, po.cover,
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

// ---- Products ----
export const getProductCategories = () =>
  all<ProductCategory>("SELECT id, slug, name FROM product_categories ORDER BY sort");

export const getProductCategory = (slug: string) =>
  one<ProductCategory>("SELECT id, slug, name FROM product_categories WHERE slug = ?", slug);

export const getProducts = (limit = 1000) =>
  all<Product>(
    `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id ORDER BY c.sort, p.id LIMIT ?`,
    limit,
  );

export const getProductsByCategory = (categoryId: number, limit = 1000) =>
  all<Product>(
    `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id
     WHERE p.category_id = ? ORDER BY p.featured DESC, p.id LIMIT ?`,
    categoryId,
    limit,
  );

export const getProduct = (categorySlug: string, slug: string) =>
  one<Product>(
    `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id
     WHERE c.slug = ? AND p.slug = ?`,
    categorySlug,
    slug,
  );

export const getProductsByIds = (ids: number[]) =>
  ids.length
    ? all<Product>(
        `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id
         WHERE p.id IN (${ids.map(() => "?").join(",")})`,
        ...ids,
      )
    : [];

export const getRelatedProducts = (p: Product, limit = 4) =>
  all<Product>(
    `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id
     WHERE p.category_id = ? AND p.id <> ? LIMIT ?`,
    p.category_id,
    p.id,
    limit,
  );

// ---- Posts ----
export const getPostSections = () => all<PostSection>("SELECT slug, name FROM post_sections ORDER BY sort");
export const getPostSection = (slug: string) =>
  one<PostSection>("SELECT slug, name FROM post_sections WHERE slug = ?", slug);
export const getPostCategories = (section?: string) =>
  section
    ? all<PostCategory>("SELECT id, slug, name, section_slug FROM post_categories WHERE section_slug = ? ORDER BY id", section)
    : all<PostCategory>("SELECT id, slug, name, section_slug FROM post_categories ORDER BY id");
export const getPostCategory = (section: string, slug: string) =>
  one<PostCategory>(
    "SELECT id, slug, name, section_slug FROM post_categories WHERE section_slug = ? AND slug = ?",
    section,
    slug,
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

export const getPost = (categorySlug: string, slug: string) =>
  one<Post>(
    `SELECT ${POST_COLS} FROM posts po JOIN post_categories pc ON pc.id = po.category_id
     WHERE pc.slug = ? AND po.slug = ?`,
    categorySlug,
    slug,
  );

// ---- Static pages ----
export const getPage = (grp: string, slug: string) =>
  one<Page>("SELECT grp, slug, title, content FROM pages WHERE grp = ? AND slug = ?", grp, slug);
export const getPages = (grp: string) =>
  all<Page>("SELECT grp, slug, title, content FROM pages WHERE grp = ? ORDER BY rowid", grp);

// ---- Search ----
export function search(q: string, limit = 8) {
  const like = `%${q}%`;
  return {
    products: all<Product>(
      `SELECT ${PRODUCT_COLS} FROM products p JOIN product_categories c ON c.id = p.category_id
       WHERE p.name LIKE ? LIMIT ?`,
      like,
      limit,
    ),
    posts: all<Post>(
      `SELECT ${POST_COLS} FROM posts po JOIN post_categories pc ON pc.id = po.category_id
       WHERE po.title LIKE ? LIMIT ?`,
      like,
      limit,
    ),
  };
}

// ---- Admin lookups (by id) ----
export const getProductById = (id: number) =>
  one<Product & { featured: number }>(
    `SELECT ${PRODUCT_COLS}, p.featured FROM products p JOIN product_categories c ON c.id = p.category_id WHERE p.id = ?`,
    id,
  );
export const getPostById = (id: number) =>
  one<Post>(
    `SELECT ${POST_COLS} FROM posts po JOIN post_categories pc ON pc.id = po.category_id WHERE po.id = ?`,
    id,
  );
