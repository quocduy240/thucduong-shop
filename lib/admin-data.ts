import "server-only";
import { all, one } from "./db";

export const ORDER_STATUS = {
  new: "Mới",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  done: "Hoàn thành",
  cancelled: "Đã huỷ",
} as const;
export type OrderStatus = keyof typeof ORDER_STATUS;
export const isOrderStatus = (s: string): s is OrderStatus => s in ORDER_STATUS;

export const PAGE_SIZE = 20;
const offset = (page: number) => (Math.max(1, page) - 1) * PAGE_SIZE;
const like = (q: string) => `%${q.replace(/[%_]/g, "")}%`;

// ---- dashboard ----
export function getStats() {
  const n = (sql: string) => one<{ n: number }>(sql)?.n ?? 0;
  return {
    products: n("SELECT COUNT(*) AS n FROM products"),
    outOfStock: n("SELECT COUNT(*) AS n FROM products WHERE stock <= 0"),
    lowStock: n("SELECT COUNT(*) AS n FROM products WHERE stock > 0 AND stock <= 5"),
    posts: n("SELECT COUNT(*) AS n FROM posts"),
    comments: n("SELECT COUNT(*) AS n FROM comments"),
    ordersNew: n("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'"),
    ordersTotal: n("SELECT COUNT(*) AS n FROM orders"),
    revenue: n("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status <> 'cancelled'"),
    revenue30: n(
      "SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status <> 'cancelled' AND created_at >= datetime('now', '-30 days')",
    ),
  };
}

// ---- products ----
export type AdminProductRow = {
  id: number; name: string; slug: string; price: number; sale_price: number | null;
  stock: number; image: string | null; featured: number; category_name: string; category_slug: string;
};
export function listProducts(opts: { q?: string; category?: number; stock?: string; page: number }) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.q) (where.push("p.name LIKE ?"), params.push(like(opts.q)));
  if (opts.category) (where.push("p.category_id = ?"), params.push(opts.category));
  if (opts.stock === "out") where.push("p.stock <= 0");
  else if (opts.stock === "low") where.push("p.stock > 0 AND p.stock <= 5");
  else if (opts.stock === "in") where.push("p.stock > 0");
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = one<{ n: number }>(`SELECT COUNT(*) AS n FROM products p ${w}`, ...params)?.n ?? 0;
  const rows = all<AdminProductRow>(
    `SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.stock, p.image, p.featured, c.name AS category_name, c.slug AS category_slug
     FROM products p JOIN product_categories c ON c.id = p.category_id ${w}
     ORDER BY p.id DESC LIMIT ? OFFSET ?`,
    ...params, PAGE_SIZE, offset(opts.page),
  );
  return { rows, total };
}

// ---- posts ----
export type AdminPostRow = {
  id: number; title: string; slug: string; cover: string | null; created_at: string;
  category_name: string; category_slug: string; section_slug: string;
};
export function listPosts(opts: { q?: string; category?: number; page: number }) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.q) (where.push("po.title LIKE ?"), params.push(like(opts.q)));
  if (opts.category) (where.push("po.category_id = ?"), params.push(opts.category));
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = one<{ n: number }>(`SELECT COUNT(*) AS n FROM posts po ${w}`, ...params)?.n ?? 0;
  const rows = all<AdminPostRow>(
    `SELECT po.id, po.title, po.slug, po.cover, po.created_at, pc.name AS category_name, pc.slug AS category_slug, pc.section_slug
     FROM posts po JOIN post_categories pc ON pc.id = po.category_id ${w}
     ORDER BY po.created_at DESC, po.id DESC LIMIT ? OFFSET ?`,
    ...params, PAGE_SIZE, offset(opts.page),
  );
  return { rows, total };
}

// ---- orders ----
export type OrderRow = {
  id: number; code: string; name: string; phone: string; email: string; address: string;
  province_code: string; ward_code: string; note: string; payment: string; total: number;
  status: string; created_at: string;
};
export function listOrders(opts: { status?: string; q?: string; page: number }) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.status && isOrderStatus(opts.status)) (where.push("status = ?"), params.push(opts.status));
  if (opts.q) {
    where.push("(code LIKE ? OR name LIKE ? OR phone LIKE ?)");
    params.push(like(opts.q), like(opts.q), like(opts.q));
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = one<{ n: number }>(`SELECT COUNT(*) AS n FROM orders ${w}`, ...params)?.n ?? 0;
  const rows = all<OrderRow>(
    `SELECT * FROM orders ${w} ORDER BY id DESC LIMIT ? OFFSET ?`,
    ...params, PAGE_SIZE, offset(opts.page),
  );
  return { rows, total };
}
export const countOrdersByStatus = () =>
  all<{ status: string; n: number }>("SELECT status, COUNT(*) AS n FROM orders GROUP BY status");

export function getOrder(id: number) {
  const order = one<OrderRow & { province_name: string | null; ward_name: string | null }>(
    `SELECT o.*, p.name AS province_name, w.name AS ward_name FROM orders o
     LEFT JOIN provinces p ON p.code = o.province_code LEFT JOIN wards w ON w.code = o.ward_code WHERE o.id = ?`,
    id,
  );
  if (!order) return undefined;
  const items = all<{ product_id: number; name: string; price: number; qty: number }>(
    "SELECT product_id, name, price, qty FROM order_items WHERE order_id = ?",
    id,
  );
  return { order, items };
}
/** Every order with its items, for CSV export. */
export const exportOrders = () =>
  all<OrderRow & { items: string }>(
    `SELECT o.*, (SELECT GROUP_CONCAT(i.name || ' x' || i.qty, '; ') FROM order_items i WHERE i.order_id = o.id) AS items
     FROM orders o ORDER BY o.id DESC`,
  );

// ---- comments ----
export function listComments(page: number) {
  const total = one<{ n: number }>("SELECT COUNT(*) AS n FROM comments")?.n ?? 0;
  const rows = all<{ id: number; name: string; content: string; created_at: string; product_name: string }>(
    `SELECT c.id, c.name, c.content, c.created_at, p.name AS product_name
     FROM comments c JOIN products p ON p.id = c.product_id ORDER BY c.id DESC LIMIT ? OFFSET ?`,
    PAGE_SIZE, offset(page),
  );
  return { rows, total };
}

// ---- static pages ----
export const listAllPages = () =>
  all<{ grp: string; slug: string; title: string }>("SELECT grp, slug, title FROM pages ORDER BY grp, rowid");
export const getPageRow = (grp: string, slug: string) =>
  one<{ grp: string; slug: string; title: string; content: string }>(
    "SELECT grp, slug, title, content FROM pages WHERE grp = ? AND slug = ?",
    grp, slug,
  );

// ---- categories ----
export const listProductCategoriesWithCount = () =>
  all<{ id: number; slug: string; name: string; sort: number; n: number }>(
    `SELECT c.id, c.slug, c.name, c.sort, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS n
     FROM product_categories c ORDER BY c.sort, c.id`,
  );
export const listPostCategoriesWithCount = () =>
  all<{ id: number; slug: string; name: string; section_slug: string; n: number }>(
    `SELECT c.id, c.slug, c.name, c.section_slug, (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id) AS n
     FROM post_categories c ORDER BY c.section_slug, c.id`,
  );

// ---- admins ----
export const listAdmins = () => all<{ id: number; email: string; created_at: string }>("SELECT id, email, created_at FROM admins ORDER BY id");
