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
export async function getStats() {
  const n = async (sql: string) => (await one<{ n: number }>(sql))?.n ?? 0;
  const [
    products, outOfStock, lowStock, posts, blocks, videos, documents,
    members, subscribers, comments, ordersNew, ordersTotal, revenue, revenue30, crmFollowupsDue,
  ] = await Promise.all([
    n("SELECT COUNT(*) AS n FROM products"),
    n("SELECT COUNT(*) AS n FROM products WHERE stock <= 0"),
    n("SELECT COUNT(*) AS n FROM products WHERE stock > 0 AND stock <= 5"),
    n("SELECT COUNT(*) AS n FROM posts"),
    n("SELECT COUNT(*) AS n FROM content_blocks"),
    n("SELECT COUNT(*) AS n FROM videos"),
    n("SELECT COUNT(*) AS n FROM documents"),
    n("SELECT COUNT(*) AS n FROM members"),
    n("SELECT COUNT(*) AS n FROM newsletter_subscribers"),
    n("SELECT COUNT(*) AS n FROM comments"),
    n("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'"),
    n("SELECT COUNT(*) AS n FROM orders"),
    n("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status <> 'cancelled'"),
    n("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status <> 'cancelled' AND created_at >= datetime('now', '-30 days')"),
    n("SELECT COUNT(DISTINCT customer_key) AS n FROM crm_notes WHERE followup_done = 0 AND next_followup_date IS NOT NULL AND next_followup_date <> '' AND next_followup_date <= date('now', '+7 hours')"),
  ]);
  return {
    products, outOfStock, lowStock, posts, blocks, videos, documents,
    members, subscribers, comments, ordersNew, ordersTotal, revenue, revenue30, crmFollowupsDue,
  };
}

// ---- products ----
export type AdminProductRow = {
  id: number; name: string; slug: string; price: number; sale_price: number | null;
  stock: number; image: string | null; featured: number;
  sku: string; brand: string; origin: string; unit: string;
  category_name: string; category_slug: string;
};
export async function listProducts(opts: { q?: string; category?: number; stock?: string; page: number }) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.q) {
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)");
    const l = like(opts.q);
    params.push(l, l, l);
  }
  if (opts.category) (where.push("p.category_id = ?"), params.push(opts.category));
  if (opts.stock === "out") where.push("p.stock <= 0");
  else if (opts.stock === "low") where.push("p.stock > 0 AND p.stock <= 5");
  else if (opts.stock === "in") where.push("p.stock > 0");
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const [totalRow, rows] = await Promise.all([
    one<{ n: number }>(`SELECT COUNT(*) AS n FROM products p ${w}`, ...params),
    all<AdminProductRow>(
      `SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.stock, p.image, p.featured,
              p.sku, p.brand, p.origin, p.unit, c.name AS category_name, c.slug AS category_slug
       FROM products p JOIN product_categories c ON c.id = p.category_id ${w}
       ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      ...params, PAGE_SIZE, offset(opts.page),
    ),
  ]);
  return { rows, total: totalRow?.n ?? 0 };
}

// ---- posts ----
export type AdminPostRow = {
  id: number; title: string; slug: string; cover: string | null; created_at: string;
  category_name: string; category_slug: string; section_slug: string;
};
export async function listPosts(opts: { q?: string; category?: number; page: number }) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.q) (where.push("po.title LIKE ?"), params.push(like(opts.q)));
  if (opts.category) (where.push("po.category_id = ?"), params.push(opts.category));
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const [totalRow, rows] = await Promise.all([
    one<{ n: number }>(`SELECT COUNT(*) AS n FROM posts po ${w}`, ...params),
    all<AdminPostRow>(
      `SELECT po.id, po.title, po.slug, po.cover, po.created_at, pc.name AS category_name, pc.slug AS category_slug, pc.section_slug
       FROM posts po JOIN post_categories pc ON pc.id = po.category_id ${w}
       ORDER BY po.created_at DESC, po.id DESC LIMIT ? OFFSET ?`,
      ...params, PAGE_SIZE, offset(opts.page),
    ),
  ]);
  return { rows, total: totalRow?.n ?? 0 };
}

// ---- orders ----
export type OrderRow = {
  id: number; code: string; name: string; phone: string; email: string; address: string;
  province_code: string; ward_code: string; note: string; payment: string; total: number;
  status: string; created_at: string;
};
export type OrderSort = "newest" | "oldest" | "total_desc" | "total_asc";

export type OrderFilterOptions = {
  status?: string;
  q?: string;
  payment?: string;
  date?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
  sort?: OrderSort;
  page?: number;
};

const ORDER_SORT_SQL: Record<OrderSort, (p: string) => string> = {
  newest: (p) => `${p}created_at DESC, ${p}id DESC`,
  oldest: (p) => `${p}created_at ASC, ${p}id ASC`,
  total_desc: (p) => `${p}total DESC, ${p}id DESC`,
  total_asc: (p) => `${p}total ASC, ${p}id ASC`,
};

function buildOrderQueryParts(opts: Omit<OrderFilterOptions, "page">, alias = "") {
  const p = alias ? `${alias}.` : "";
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (opts.status && isOrderStatus(opts.status)) {
    where.push(`${p}status = ?`);
    params.push(opts.status);
  }
  if (opts.q?.trim()) {
    const q = like(opts.q.trim());
    where.push(`(${p}code LIKE ? OR ${p}name LIKE ? OR ${p}phone LIKE ?)`);
    params.push(q, q, q);
  }
  if (opts.payment === "cod" || opts.payment === "bank") {
    where.push(`${p}payment = ?`);
    params.push(opts.payment);
  }
  if (opts.date && /^\d{4}-\d{2}-\d{2}$/.test(opts.date)) {
    where.push(`substr(${p}created_at, 1, 10) = ?`);
    params.push(opts.date);
  } else {
    if (opts.year && /^\d{4}$/.test(opts.year)) {
      where.push(`substr(${p}created_at, 1, 4) = ?`);
      params.push(opts.year);
    }
    if (opts.month && /^(?:[1-9]|1[0-2]|0[1-9])$/.test(opts.month)) {
      where.push(`substr(${p}created_at, 6, 2) = ?`);
      params.push(opts.month.padStart(2, "0"));
    }
    if (opts.from && /^\d{4}-\d{2}-\d{2}$/.test(opts.from)) {
      where.push(`substr(${p}created_at, 1, 10) >= ?`);
      params.push(opts.from);
    }
    if (opts.to && /^\d{4}-\d{2}-\d{2}$/.test(opts.to)) {
      where.push(`substr(${p}created_at, 1, 10) <= ?`);
      params.push(opts.to);
    }
  }

  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const sortKey: OrderSort = opts.sort && opts.sort in ORDER_SORT_SQL ? opts.sort : "newest";
  const orderBy = ORDER_SORT_SQL[sortKey](p);
  return { w, params, orderBy };
}

export async function listOrders(opts: OrderFilterOptions & { page: number }) {
  const { w, params, orderBy } = buildOrderQueryParts(opts);
  const [aggRow, rows] = await Promise.all([
    one<{ n: number; rev: number }>(
      `SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END), 0) AS rev FROM orders ${w}`,
      ...params,
    ),
    all<OrderRow>(
      `SELECT * FROM orders ${w} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      ...params, PAGE_SIZE, offset(opts.page),
    ),
  ]);
  return { rows, total: aggRow?.n ?? 0, revenueTotal: aggRow?.rev ?? 0 };
}

export const countOrdersByStatus = (opts: Omit<OrderFilterOptions, "status" | "page"> = {}) => {
  const { w, params } = buildOrderQueryParts({ ...opts, status: undefined });
  return all<{ status: string; n: number }>(`SELECT status, COUNT(*) AS n FROM orders ${w} GROUP BY status`, ...params);
};

export async function getOrder(id: number) {
  const [order, items] = await Promise.all([
    one<OrderRow & { province_name: string | null; ward_name: string | null }>(
      `SELECT o.*, p.name AS province_name, w.name AS ward_name FROM orders o
       LEFT JOIN provinces p ON p.code = o.province_code LEFT JOIN wards w ON w.code = o.ward_code WHERE o.id = ?`,
      id,
    ),
    all<{ product_id: number; name: string; price: number; qty: number }>(
      "SELECT product_id, name, price, qty FROM order_items WHERE order_id = ?",
      id,
    ),
  ]);
  if (!order) return undefined;
  return { order, items };
}
/** Every order with its items, for CSV export. */
export const exportOrders = (opts: Omit<OrderFilterOptions, "page"> = {}) => {
  const { w, params, orderBy } = buildOrderQueryParts(opts, "o");
  return all<OrderRow & { items: string }>(
    `SELECT o.*, (SELECT GROUP_CONCAT(i.name || ' x' || i.qty, '; ') FROM order_items i WHERE i.order_id = o.id) AS items
     FROM orders o ${w} ORDER BY ${orderBy}`,
    ...params,
  );
};

// ---- comments ----
export async function listComments(page: number) {
  const [totalRow, rows] = await Promise.all([
    one<{ n: number }>("SELECT COUNT(*) AS n FROM comments"),
    all<{ id: number; name: string; content: string; rating: number; created_at: string; product_name: string }>(
      `SELECT c.id, c.name, c.content, c.rating, c.created_at, p.name AS product_name
       FROM comments c JOIN products p ON p.id = c.product_id ORDER BY c.id DESC LIMIT ? OFFSET ?`,
      PAGE_SIZE, offset(page),
    ),
  ]);
  return { rows, total: totalRow?.n ?? 0 };
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

// ---- videos ----
export type AdminVideoRow = {
  id: number;
  youtube_url: string;
  video_id: string;
  title: string;
  topic: string;
  description: string;
  sort: number;
  created_at: string;
};

export async function listVideos(opts: { q?: string; topic?: string; page: number }) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.q) {
    where.push("(title LIKE ? OR topic LIKE ? OR video_id LIKE ?)");
    const l = like(opts.q);
    params.push(l, l, l);
  }
  if (opts.topic) {
    where.push("topic = ?");
    params.push(opts.topic);
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const [totalRow, rows, topics] = await Promise.all([
    one<{ n: number }>(`SELECT COUNT(*) AS n FROM videos ${w}`, ...params),
    all<AdminVideoRow>(
      `SELECT id, youtube_url, video_id, title, topic, description, sort, created_at
       FROM videos ${w} ORDER BY sort ASC, id DESC LIMIT ? OFFSET ?`,
      ...params,
      PAGE_SIZE,
      offset(opts.page),
    ),
    all<{ topic: string; n: number }>("SELECT topic, COUNT(*) AS n FROM videos GROUP BY topic ORDER BY MIN(sort) ASC"),
  ]);
  return { rows, total: totalRow?.n ?? 0, topics };
}

// ---- documents ----
export type AdminDocumentRow = {
  id: number;
  slug: string;
  title: string;
  folder_path: string;
  doc_type: string;
  access_mode: string;
  price: number;
  drive_url: string;
  affiliate_url: string;
  bundle_product_name: string | null;
  pages: number;
  file_size: string;
  downloads: number;
  leads_count: number;
  sort: number;
  created_at: string;
};

export async function listDocuments(opts: { q?: string; folder?: string; docType?: string; accessMode?: string; page: number }) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.q) {
    where.push("(d.title LIKE ? OR d.folder_path LIKE ? OR d.author LIKE ?)");
    const l = like(opts.q);
    params.push(l, l, l);
  }
  if (opts.folder) {
    where.push("(d.folder_path = ? OR d.folder_path LIKE ?)");
    params.push(opts.folder, `${opts.folder}%`);
  }
  if (opts.docType) {
    where.push("d.doc_type = ?");
    params.push(opts.docType);
  }
  if (opts.accessMode) {
    where.push("d.access_mode = ?");
    params.push(opts.accessMode);
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const [totalRow, rows, folders, recentLeads] = await Promise.all([
    one<{ n: number }>(`SELECT COUNT(*) AS n FROM documents d ${w}`, ...params),
    all<AdminDocumentRow>(
      `SELECT d.id, d.slug, d.title, d.folder_path, d.doc_type, d.access_mode, d.price,
              d.drive_url, d.affiliate_url, p.name AS bundle_product_name, d.pages, d.file_size,
              d.downloads, (SELECT COUNT(*) FROM document_leads l WHERE l.document_id = d.id) AS leads_count,
              d.sort, d.created_at
       FROM documents d
       LEFT JOIN products p ON p.id = d.bundle_product_id
       ${w}
       ORDER BY d.sort ASC, d.id DESC LIMIT ? OFFSET ?`,
      ...params,
      PAGE_SIZE,
      offset(opts.page),
    ),
    all<{ folder_path: string; n: number }>(
      "SELECT folder_path, COUNT(*) AS n FROM documents GROUP BY folder_path ORDER BY folder_path ASC",
    ),
    all<{
      id: number;
      name: string;
      contact: string;
      answer: string;
      created_at: string;
      doc_title: string;
    }>(
      `SELECT l.id, l.name, l.contact, l.answer, l.created_at, d.title AS doc_title
       FROM document_leads l JOIN documents d ON d.id = l.document_id
       ORDER BY l.id DESC LIMIT 10`,
    ),
  ]);
  return { rows, total: totalRow?.n ?? 0, folders, recentLeads };
}

// ---- members, newsletter subscribers & coupons ----
export type AdminMemberRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  tier: string;
  points: number;
  created_at: string;
};

export type AdminSubscriberRow = {
  id: number;
  email: string;
  source: string;
  status: string;
  created_at: string;
};

export type AdminCouponRow = {
  id: number;
  code: string;
  title: string;
  description: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_discount: number;
  member_only: number;
  active: number;
  used_count: number;
  created_at: string;
};

export async function listMembersData(opts: { q?: string } = {}) {
  const q = opts.q?.trim();
  const [members, subscribers, coupons] = await Promise.all([
    q
      ? all<AdminMemberRow>(
          "SELECT id, name, email, phone, tier, points, created_at FROM members WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY id DESC",
          like(q),
          like(q),
          like(q),
        )
      : all<AdminMemberRow>("SELECT id, name, email, phone, tier, points, created_at FROM members ORDER BY id DESC"),
    q
      ? all<AdminSubscriberRow>(
          "SELECT id, email, source, status, created_at FROM newsletter_subscribers WHERE email LIKE ? ORDER BY id DESC",
          like(q),
        )
      : all<AdminSubscriberRow>("SELECT id, email, source, status, created_at FROM newsletter_subscribers ORDER BY id DESC"),
    all<AdminCouponRow>(
      "SELECT id, code, title, description, discount_type, discount_value, min_order, max_discount, member_only, active, used_count, created_at FROM coupons ORDER BY id ASC",
    ),
  ]);

  return { members, subscribers, coupons };
}
