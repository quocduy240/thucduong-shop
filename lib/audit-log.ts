import "server-only";
import { all, one, run } from "./db";
import type { AdminRole } from "./rbac";
import { vnd } from "./site";

export type AuditSeverity = "info" | "warning" | "critical";

export type AuditModule =
  | "products"
  | "inventory"
  | "cashbook"
  | "orders"
  | "categories"
  | "posts"
  | "blocks"
  | "settings"
  | "frontend_live_edit"
  | "system";

export type AuditLogRow = {
  id: number;
  actor_id: number;
  actor_email: string;
  actor_name: string;
  actor_role: string;
  module: AuditModule;
  action: string;
  severity: AuditSeverity;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  diff_summary: string;
  before_json: string;
  after_json: string;
  rolled_back: number;
  created_at: string;
};

export type ActionableNotification = {
  id: string;
  priority: "P1" | "P2" | "P3";
  priorityLabel: string;
  category: "orders" | "customers" | "inventory" | "finance" | "content" | "audit";
  categoryLabel: string;
  targetRoles: AdminRole[];
  targetDeptLabel: string;
  title: string;
  detail: string;
  count: number;
  actionLabel: string;
  actionHref: string;
  isForCurrentRole: boolean;
};

const FIELD_LABELS: Record<string, string> = {
  name: "Tên",
  title: "Tiêu đề",
  price: "Giá bán",
  sale_price: "Giá KM",
  cost_price: "Giá vốn",
  stock: "Tồn kho",
  min_stock: "Tồn tối thiểu",
  category_id: "Mã danh mục",
  is_published: "Công khai",
  contact_only: "Giá Liên hệ",
  featured: "Nổi bật",
  sku: "Mã SKU",
  kv_code: "Mã KiotViet",
  barcode: "Mã vạch",
  status: "Trạng thái",
  sort: "Thứ tự vị trí",
  show_in_menu: "Hiện Menu",
  show_in_home: "Hiện Trang chủ",
  show_in_footer: "Hiện Footer",
  is_active: "Kích hoạt",
  supplier: "Nhà cung cấp",
  location: "Vị trí kệ",
};

const MONEY_FIELDS = new Set(["price", "sale_price", "cost_price", "amount", "total", "debt_balance"]);

let auditSchemaPromise: Promise<void> | null = null;

export async function ensureAuditLogSchema(): Promise<void> {
  if (!auditSchemaPromise) {
    auditSchemaPromise = (async () => {
      await run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          actor_id INTEGER NOT NULL DEFAULT 0,
          actor_email TEXT NOT NULL DEFAULT '',
          actor_name TEXT NOT NULL DEFAULT '',
          actor_role TEXT NOT NULL DEFAULT 'admin',
          module TEXT NOT NULL DEFAULT 'system',
          action TEXT NOT NULL DEFAULT 'update',
          severity TEXT NOT NULL DEFAULT 'info',
          entity_type TEXT NOT NULL DEFAULT '',
          entity_id TEXT NOT NULL DEFAULT '',
          entity_label TEXT NOT NULL DEFAULT '',
          diff_summary TEXT NOT NULL DEFAULT '',
          before_json TEXT NOT NULL DEFAULT '',
          after_json TEXT NOT NULL DEFAULT '',
          rolled_back INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
        )
      `);
      await run("CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(id DESC)");
      await run("CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module, id DESC)");

      await run(`
        CREATE TABLE IF NOT EXISTS handbook_custom_notes (
          section_id TEXT PRIMARY KEY,
          note_text TEXT NOT NULL DEFAULT '',
          updated_by TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
        )
      `);
    })().catch((err) => {
      auditSchemaPromise = null;
      throw err;
    });
  }
  await auditSchemaPromise;
}

function formatFieldVal(key: string, val: unknown): string {
  if (val === null || val === undefined || val === "") return "Trống";
  if (MONEY_FIELDS.has(key) && typeof val === "number") return vnd(val);
  if (typeof val === "boolean") return val ? "Bật" : "Tắt";
  return String(val);
}

export function buildDiffSummary(
  beforeObj?: Record<string, unknown> | null,
  afterObj?: Record<string, unknown> | null,
): string {
  if (!beforeObj || !afterObj) return "";
  const diffs: string[] = [];
  const keys = Object.keys(afterObj);
  for (const k of keys) {
    if (k === "description" || k === "content" || k === "html" || k === "gallery") {
      if (String(beforeObj[k] ?? "") !== String(afterObj[k] ?? "")) {
        diffs.push(`Nội dung (${k}): Đã cập nhật`);
      }
      continue;
    }
    const bVal = beforeObj[k];
    const aVal = afterObj[k];
    if (String(bVal ?? "") !== String(aVal ?? "")) {
      const label = FIELD_LABELS[k] || k;
      diffs.push(`${label}: ${formatFieldVal(k, bVal)} → ${formatFieldVal(k, aVal)}`);
    }
  }
  return diffs.join(" · ");
}

export async function recordAuditLog(opts: {
  actor?: { id?: number; email?: string; name?: string; role?: string } | null;
  module: AuditModule;
  action: string;
  severity?: AuditSeverity;
  entityType: string;
  entityId: string | number;
  entityLabel: string;
  diffSummary?: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await ensureAuditLogSchema();
    const computedDiff =
      opts.diffSummary || buildDiffSummary(opts.beforeData, opts.afterData) || opts.action;
    const beforeJson = opts.beforeData ? JSON.stringify(opts.beforeData) : "";
    const afterJson = opts.afterData ? JSON.stringify(opts.afterData) : "";

    await run(
      `INSERT INTO audit_logs (
        actor_id, actor_email, actor_name, actor_role,
        module, action, severity, entity_type, entity_id, entity_label,
        diff_summary, before_json, after_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      opts.actor?.id ?? 0,
      opts.actor?.email ?? "system",
      opts.actor?.name || opts.actor?.email || "Hệ thống",
      opts.actor?.role ?? "admin",
      opts.module,
      opts.action,
      opts.severity ?? "info",
      opts.entityType,
      String(opts.entityId),
      opts.entityLabel,
      computedDiff.slice(0, 1000),
      beforeJson.slice(0, 15000),
      afterJson.slice(0, 15000),
    );
  } catch (err) {
    console.warn("[audit_log] Failed to record audit entry:", (err as Error).message);
  }
}

export async function listAuditLogs(opts: {
  module?: string;
  severity?: string;
  actor?: string;
  q?: string;
  limit?: number;
} = {}): Promise<{
  rows: AuditLogRow[];
  stats: { total: number; criticalCount: number; warningCount: number; todayCount: number };
  actors: string[];
}> {
  await ensureAuditLogSchema();
  const where: string[] = [];
  const params: unknown[] = [];

  if (opts.module && opts.module !== "all") {
    where.push("module = ?");
    params.push(opts.module);
  }
  if (opts.severity && opts.severity !== "all") {
    where.push("severity = ?");
    params.push(opts.severity);
  }
  if (opts.actor && opts.actor !== "all") {
    where.push("actor_email = ?");
    params.push(opts.actor);
  }
  if (opts.q?.trim()) {
    const kw = `%${opts.q.trim()}%`;
    where.push("(entity_label LIKE ? OR diff_summary LIKE ? OR entity_id LIKE ? OR actor_email LIKE ?)");
    params.push(kw, kw, kw, kw);
  }

  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const vnToday = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

  const [rows, statsRow, actorRows] = await Promise.all([
    all<AuditLogRow>(
      `SELECT id, actor_id, actor_email, actor_name, actor_role, module, action, severity,
              entity_type, entity_id, entity_label, diff_summary, before_json, after_json,
              rolled_back, created_at
       FROM audit_logs ${w}
       ORDER BY id DESC LIMIT ?`,
      ...params,
      opts.limit ?? 100,
    ),
    one<{ total: number; criticalCount: number; warningCount: number; todayCount: number }>(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END), 0) AS criticalCount,
              COALESCE(SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END), 0) AS warningCount,
              COALESCE(SUM(CASE WHEN substr(created_at, 1, 10) = ? THEN 1 ELSE 0 END), 0) AS todayCount
       FROM audit_logs`,
      vnToday,
    ),
    all<{ actor_email: string }>(
      "SELECT DISTINCT actor_email FROM audit_logs WHERE actor_email <> '' ORDER BY actor_email ASC LIMIT 30",
    ),
  ]);

  return {
    rows,
    stats: {
      total: statsRow?.total ?? 0,
      criticalCount: statsRow?.criticalCount ?? 0,
      warningCount: statsRow?.warningCount ?? 0,
      todayCount: statsRow?.todayCount ?? 0,
    },
    actors: actorRows.map((a) => a.actor_email),
  };
}

export async function rollbackAuditLog(
  logId: number,
  actor: { id: number; email: string; name: string; role: AdminRole },
): Promise<{ ok: boolean; message: string }> {
  await ensureAuditLogSchema();
  const row = await one<AuditLogRow>("SELECT * FROM audit_logs WHERE id = ?", logId);
  if (!row) return { ok: false, message: "Không tìm thấy bản ghi nhật ký cần hoàn tác." };
  if (row.rolled_back === 1) return { ok: false, message: "Bản ghi này đã được hoàn tác trước đó." };
  if (!row.before_json) return { ok: false, message: "Bản ghi này không có bản chụp dữ liệu trước khi sửa để hoàn tác." };

  let before: Record<string, unknown>;
  try {
    before = JSON.parse(row.before_json);
  } catch {
    return { ok: false, message: "Dữ liệu bản chụp không hợp lệ." };
  }

  const entityId = Number(row.entity_id);
  if (row.entity_type === "product" && entityId > 0) {
    const cur = await one<Record<string, unknown>>(
      "SELECT id, name, category_id, price, sale_price, cost_price, stock, is_published, contact_only, featured, summary FROM products WHERE id = ?",
      entityId,
    );
    if (!cur) return { ok: false, message: "Sản phẩm không còn tồn tại trong kho." };

    await run(
      `UPDATE products
       SET name = COALESCE(?, name),
           category_id = COALESCE(?, category_id),
           price = COALESCE(?, price),
           sale_price = ?,
           cost_price = COALESCE(?, cost_price),
           stock = COALESCE(?, stock),
           is_published = COALESCE(?, is_published),
           contact_only = COALESCE(?, contact_only),
           featured = COALESCE(?, featured),
           summary = COALESCE(?, summary)
       WHERE id = ?`,
      before.name ?? cur.name,
      before.category_id ?? cur.category_id,
      before.price ?? cur.price,
      before.sale_price !== undefined ? before.sale_price : cur.sale_price,
      before.cost_price ?? cur.cost_price,
      before.stock ?? cur.stock,
      before.is_published ?? cur.is_published,
      before.contact_only ?? cur.contact_only,
      before.featured ?? cur.featured,
      before.summary ?? cur.summary,
      entityId,
    );

    await run("UPDATE audit_logs SET rolled_back = 1 WHERE id = ?", logId);
    await recordAuditLog({
      actor,
      module: "products",
      action: "rollback",
      severity: "warning",
      entityType: "product",
      entityId,
      entityLabel: row.entity_label,
      diffSummary: `⏪ Hoàn tác từ Nhật ký #${logId}: ${buildDiffSummary(cur, before)}`,
      beforeData: cur,
      afterData: before,
    });
    return { ok: true, message: `Đã hoàn tác thành công sản phẩm "${row.entity_label}" về trạng thái trước!` };
  }

  if (row.entity_type === "product_category" && entityId > 0) {
    const cur = await one<Record<string, unknown>>("SELECT * FROM product_categories WHERE id = ?", entityId);
    if (!cur) return { ok: false, message: "Danh mục không còn tồn tại." };
    await run(
      `UPDATE product_categories
       SET name = COALESCE(?, name),
           sort = COALESCE(?, sort),
           show_in_menu = COALESCE(?, show_in_menu),
           show_in_home = COALESCE(?, show_in_home),
           show_in_footer = COALESCE(?, show_in_footer),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      before.name ?? cur.name,
      before.sort ?? cur.sort,
      before.show_in_menu ?? cur.show_in_menu,
      before.show_in_home ?? cur.show_in_home,
      before.show_in_footer ?? cur.show_in_footer,
      before.is_active ?? cur.is_active,
      entityId,
    );
    await run("UPDATE audit_logs SET rolled_back = 1 WHERE id = ?", logId);
    await recordAuditLog({
      actor,
      module: "categories",
      action: "rollback",
      severity: "info",
      entityType: "product_category",
      entityId,
      entityLabel: row.entity_label,
      diffSummary: `⏪ Hoàn tác danh mục từ Nhật ký #${logId}`,
      beforeData: cur,
      afterData: before,
    });
    return { ok: true, message: `Đã hoàn tác danh mục "${row.entity_label}" thành công!` };
  }

  if (row.entity_type === "post" && entityId > 0) {
    const cur = await one<Record<string, unknown>>("SELECT id, title, excerpt, category_id FROM posts WHERE id = ?", entityId);
    if (!cur) return { ok: false, message: "Bài viết không còn tồn tại." };
    await run(
      `UPDATE posts SET title = COALESCE(?, title), excerpt = COALESCE(?, excerpt), category_id = COALESCE(?, category_id) WHERE id = ?`,
      before.title ?? cur.title,
      before.excerpt ?? cur.excerpt,
      before.category_id ?? cur.category_id,
      entityId,
    );
    await run("UPDATE audit_logs SET rolled_back = 1 WHERE id = ?", logId);
    await recordAuditLog({
      actor,
      module: "posts",
      action: "rollback",
      severity: "info",
      entityType: "post",
      entityId,
      entityLabel: row.entity_label,
      diffSummary: `⏪ Hoàn tác bài viết từ Nhật ký #${logId}`,
      beforeData: cur,
      afterData: before,
    });
    return { ok: true, message: `Đã hoàn tác bài viết "${row.entity_label}" thành công!` };
  }

  return { ok: false, message: "Loại thao tác này chỉ hỗ trợ xem đối soát, không tự động hoàn tác." };
}

/**
 * Hierarchical Actionable Notification & Task Routing Engine.
 * Evaluates live operational bottlenecks and assigns them to the responsible role.
 */
export async function getActionableSystemNotifications(
  currentRole: AdminRole = "admin",
): Promise<ActionableNotification[]> {
  await ensureAuditLogSchema();
  const vnToday = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const vn45Days = new Date(Date.now() + 7 * 3600 * 1000 + 45 * 86400 * 1000).toISOString().slice(0, 10);

  const [
    newOrdersRow,
    consultNewRow,
    crmDueRow,
    outOfStockRow,
    lowStockRow,
    nearExpiryRow,
    supplierDebtRow,
    missingSeoPostsRow,
    criticalAuditTodayRow,
  ] = await Promise.all([
    one<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'").catch(() => ({ n: 0 })),
    one<{ n: number }>("SELECT COUNT(*) AS n FROM consultation_requests WHERE status = 'new'").catch(() => ({ n: 0 })),
    one<{ n: number }>(
      "SELECT COUNT(DISTINCT customer_key) AS n FROM crm_notes WHERE followup_done = 0 AND next_followup_date IS NOT NULL AND next_followup_date <> '' AND next_followup_date <= ?",
      vnToday,
    ).catch(() => ({ n: 0 })),
    one<{ n: number }>("SELECT COUNT(*) AS n FROM products WHERE stock <= 0 AND COALESCE(is_published, 1) = 1").catch(
      () => ({ n: 0 }),
    ),
    one<{ n: number }>(
      "SELECT COUNT(*) AS n FROM products WHERE stock > 0 AND stock <= CASE WHEN COALESCE(min_stock, 0) > 0 THEN min_stock ELSE 5 END AND COALESCE(is_published, 1) = 1",
    ).catch(() => ({ n: 0 })),
    one<{ n: number }>(
      "SELECT COUNT(*) AS n FROM inventory_movements WHERE reason = 'import' AND TRIM(COALESCE(exp_date, '')) <> '' AND exp_date <= ?",
      vn45Days,
    ).catch(() => ({ n: 0 })),
    one<{ n: number; totalDebt: number }>(
      "SELECT COUNT(*) AS n, COALESCE(SUM(debt_balance), 0) AS totalDebt FROM suppliers WHERE COALESCE(debt_balance, 0) > 0",
    ).catch(() => ({ n: 0, totalDebt: 0 })),
    one<{ n: number }>(
      "SELECT COUNT(*) AS n FROM posts WHERE TRIM(COALESCE(cover, '')) = '' OR TRIM(COALESCE(excerpt, '')) = ''",
    ).catch(() => ({ n: 0 })),
    one<{ n: number }>(
      "SELECT COUNT(*) AS n FROM audit_logs WHERE severity IN ('critical', 'warning') AND substr(created_at, 1, 10) = ?",
      vnToday,
    ).catch(() => ({ n: 0 })),
  ]);

  const items: Omit<ActionableNotification, "isForCurrentRole">[] = [];

  if ((newOrdersRow?.n ?? 0) > 0) {
    items.push({
      id: "new-orders",
      priority: "P1",
      priorityLabel: "🔴 P1 · Khẩn cấp",
      category: "orders",
      categoryLabel: "Đơn hàng",
      targetRoles: ["sales", "admin", "super_admin"],
      targetDeptLabel: "Bộ phận Bán hàng & CSKH (Sales)",
      title: `Có ${newOrdersRow!.n} đơn hàng mới đang chờ xác nhận & đóng gói`,
      detail: "Cần gọi xác nhận đơn, chọn đối tác vận chuyển và in phiếu xuất kho Khổ A5.",
      count: newOrdersRow!.n,
      actionLabel: "Xử lý & In đơn A5 ngay →",
      actionHref: "/admin/orders/?status=new",
    });
  }

  if ((consultNewRow?.n ?? 0) > 0) {
    items.push({
      id: "consult-requests",
      priority: "P1",
      priorityLabel: "🔴 P1 · Khẩn cấp",
      category: "customers",
      categoryLabel: "Tư vấn khách hàng",
      targetRoles: ["sales", "admin", "super_admin"],
      targetDeptLabel: "Tư vấn viên Thực dưỡng (Sales)",
      title: `Có ${consultNewRow!.n} khách hàng gửi câu hỏi Tư vấn nhanh chờ gọi lại`,
      detail: "Khách để lại SĐT trên widget Hỏi nhanh, cần tư vấn trong vòng 30 phút để chốt đơn.",
      count: consultNewRow!.n,
      actionLabel: "Xem SĐT & Gọi tư vấn →",
      actionHref: "/admin/settings/",
    });
  }

  if ((crmDueRow?.n ?? 0) > 0) {
    items.push({
      id: "crm-followups",
      priority: "P2",
      priorityLabel: "🟠 P2 · Trong ca trực",
      category: "customers",
      categoryLabel: "CRM Chăm sóc",
      targetRoles: ["sales", "admin", "super_admin"],
      targetDeptLabel: "Chăm sóc khách hàng (Sales / CRM)",
      title: `${crmDueRow!.n} khách hàng có lịch hẹn chăm sóc / nhắc mua lại đến hạn hôm nay`,
      detail: "Hỏi thăm tiến triển dùng sản phẩm thực dưỡng và tư vấn tái đặt hàng định kỳ.",
      count: crmDueRow!.n,
      actionLabel: "Mở danh sách CRM →",
      actionHref: "/admin/crm/",
    });
  }

  if ((outOfStockRow?.n ?? 0) > 0 || (lowStockRow?.n ?? 0) > 0) {
    const outN = outOfStockRow?.n ?? 0;
    const lowN = lowStockRow?.n ?? 0;
    items.push({
      id: "stock-alert",
      priority: outN > 0 ? "P1" : "P2",
      priorityLabel: outN > 0 ? "🔴 P1 · Cảnh báo Kho" : "🟠 P2 · Định mức Kho",
      category: "inventory",
      categoryLabel: "Kho & Hàng hóa",
      targetRoles: ["admin", "super_admin", "sales"],
      targetDeptLabel: "Bộ phận Kho vận & Mua hàng (Admin)",
      title: `${outN} sản phẩm đang Hết hàng (Tồn = 0) · ${lowN} sản phẩm chạm Định mức tồn tối thiểu`,
      detail: "Cần lập phiếu nhập hàng từ Nhà cung cấp hoặc tạm bật chế độ 'Giá Liên hệ' ngoài Web.",
      count: outN + lowN,
      actionLabel: "Kiểm tra & Nhập kho →",
      actionHref: "/admin/inventory/?tab=stock&stock=low",
    });
  }

  if ((nearExpiryRow?.n ?? 0) > 0) {
    items.push({
      id: "fefo-expiry",
      priority: "P2",
      priorityLabel: "🟠 P2 · Quản lý Lô FEFO",
      category: "inventory",
      categoryLabel: "Hạn sử dụng Lô",
      targetRoles: ["admin", "super_admin", "sales"],
      targetDeptLabel: "Quản lý Kho & Marketing (Admin)",
      title: `Có ${nearExpiryRow!.n} lô hàng nhập kho sắp chạm hạn sử dụng (≤ 45 ngày)`,
      detail: "Ưu tiên xuất bán trước theo nguyên tắc FEFO hoặc đưa vào chương trình Giờ vàng Flash Sale.",
      count: nearExpiryRow!.n,
      actionLabel: "Xem Thẻ kho & Lô HSD →",
      actionHref: "/admin/inventory/?tab=import",
    });
  }

  if ((supplierDebtRow?.n ?? 0) > 0) {
    items.push({
      id: "supplier-debt",
      priority: "P2",
      priorityLabel: "🟠 P2 · Tài chính & Công nợ",
      category: "finance",
      categoryLabel: "Công nợ NCC",
      targetRoles: ["admin", "super_admin"],
      targetDeptLabel: "Kế toán & Chủ cửa hàng (Admin)",
      title: `Đang có ${supplierDebtRow!.n} Nhà cung cấp còn dư nợ phải trả (${vnd(supplierDebtRow!.totalDebt)})`,
      detail: "Đối soát phiếu nhập hàng và lập phiếu chi gạch nợ từ 1 trong 3 Quỹ.",
      count: supplierDebtRow!.n,
      actionLabel: "Đối soát & Gạch nợ NCC →",
      actionHref: "/admin/inventory/?tab=partners",
    });
  }

  if ((missingSeoPostsRow?.n ?? 0) > 0) {
    items.push({
      id: "content-seo",
      priority: "P3",
      priorityLabel: "🔵 P3 · Chất lượng Nội dung",
      category: "content",
      categoryLabel: "Biên tập & SEO",
      targetRoles: ["editor", "admin", "super_admin"],
      targetDeptLabel: "Bộ phận Biên tập Nội dung (Editor)",
      title: `${missingSeoPostsRow!.n} bài viết chưa có ảnh bìa hoặc tóm tắt chuẩn SEO`,
      detail: "Bổ sung ảnh đại diện và mô tả ngắn để tăng thứ hạng tìm kiếm Google.",
      count: missingSeoPostsRow!.n,
      actionLabel: "Tối ưu Bài viết ngay →",
      actionHref: "/admin/posts/?filter=no_cover",
    });
  }

  if ((criticalAuditTodayRow?.n ?? 0) > 0) {
    items.push({
      id: "audit-review",
      priority: "P3",
      priorityLabel: "🔵 P3 · Kiểm toán & Đối soát",
      category: "audit",
      categoryLabel: "Log Audit",
      targetRoles: ["super_admin", "admin"],
      targetDeptLabel: "Chủ cửa hàng / Kiểm soát nội bộ",
      title: `Hôm nay có ${criticalAuditTodayRow!.n} thao tác quan trọng (Sửa giá/tồn/quỹ/xóa) trong Nhật ký`,
      detail: "Kiểm tra người thực hiện, đối chiếu biến động Trước/Sau hoặc bấm Hoàn tác nếu có sai sót.",
      count: criticalAuditTodayRow!.n,
      actionLabel: "Mở Nhật ký Kiểm toán →",
      actionHref: "/admin/audit-logs/",
    });
  }

  return items.map((it) => ({
    ...it,
    isForCurrentRole: it.targetRoles.includes(currentRole),
  }));
}

export async function getHandbookCustomNotes(): Promise<Record<string, { note_text: string; updated_by: string; updated_at: string }>> {
  await ensureAuditLogSchema();
  const rows = await all<{ section_id: string; note_text: string; updated_by: string; updated_at: string }>(
    "SELECT section_id, note_text, updated_by, updated_at FROM handbook_custom_notes",
  ).catch(() => []);
  const map: Record<string, { note_text: string; updated_by: string; updated_at: string }> = {};
  for (const r of rows) {
    map[r.section_id] = {
      note_text: r.note_text,
      updated_by: r.updated_by,
      updated_at: r.updated_at,
    };
  }
  return map;
}

export async function saveHandbookCustomNote(sectionId: string, noteText: string, actorEmail: string): Promise<void> {
  await ensureAuditLogSchema();
  await run(
    `INSERT INTO handbook_custom_notes (section_id, note_text, updated_by, updated_at)
     VALUES (?, ?, ?, datetime('now', '+7 hours'))
     ON CONFLICT(section_id) DO UPDATE SET
       note_text = excluded.note_text,
       updated_by = excluded.updated_by,
       updated_at = datetime('now', '+7 hours')`,
    sectionId,
    noteText.trim(),
    actorEmail,
  );
}
