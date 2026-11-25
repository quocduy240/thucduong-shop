import { currentAdmin } from "@/lib/auth";
import { all } from "@/lib/db";

const BACKUP_TABLES = [
  "settings",
  "product_categories",
  "products",
  "post_categories",
  "posts",
  "pages",
  "orders",
  "order_items",
  "comments",
  "members",
  "member_profiles",
  "point_transactions",
  "coupons",
  "inventory_movements",
  "cashbook_entries",
  "suppliers",
  "delivery_partners",
  "qr_blocks",
  "consultation_requests",
] as const;

const REDACTED_SETTING_KEYS = new Set([
  "gemini_api_key",
  "smtp_pass",
  "kiotviet_client_secret",
  "kiotviet_webhook_secret",
  "telegram_bot_token",
]);

export async function GET() {
  const admin = await currentAdmin();
  if (!admin || (admin.role !== "super_admin" && admin.role !== "admin")) {
    return Response.json({ error: "Không có quyền truy cập bản sao lưu hệ thống." }, { status: 403 });
  }

  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const tbl of BACKUP_TABLES) {
    try {
      const rows = await all<Record<string, unknown>>(`SELECT * FROM ${tbl}`);
      if (tbl === "settings") {
        tables[tbl] = rows.map((r) =>
          REDACTED_SETTING_KEYS.has(String(r.key ?? ""))
            ? { ...r, value: "[REDACTED_SECRET]" }
            : r,
        );
      } else if (tbl === "members") {
        tables[tbl] = rows.map((r) => ({ ...r, password_hash: "[REDACTED]", salt: "[REDACTED]" }));
      } else {
        tables[tbl] = rows;
      }
      counts[tbl] = rows.length;
    } catch {
      tables[tbl] = [];
      counts[tbl] = 0;
    }
  }

  const vnDate = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const payload = {
    schema_version: "2026.11-full-d1-backup",
    exported_at: new Date().toISOString(),
    exported_by: admin.email,
    table_counts: counts,
    tables,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="thucduong-d1-backup-${vnDate}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
