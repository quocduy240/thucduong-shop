/**
 * Pure SQL dump integrity verifier for automated Cloudflare D1 backups.
 */

export const REQUIRED_BACKUP_TABLES = [
  "products",
  "product_categories",
  "orders",
  "order_items",
  "posts",
  "member_profiles",
  "point_transactions",
  "settings",
  "admins",
] as const;

export interface BackupVerificationResult {
  ok: boolean;
  bytes: number;
  createTableCount: number;
  insertCount: number;
  missingTables: string[];
  errors: string[];
}

export function verifyD1BackupSql(sql: string): BackupVerificationResult {
  const text = String(sql || "");
  const bytes = Buffer.byteLength(text, "utf8");
  const errors: string[] = [];

  if (bytes < 512) {
    errors.push(`Backup SQL quá nhỏ (${bytes} bytes), nghi ngờ xuất lỗi hoặc file rỗng.`);
  }

  const createMatches = text.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([a-zA-Z0-9_]+)["'`]?/gi) ?? [];
  const insertMatches = text.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+["'`]?([a-zA-Z0-9_]+)["'`]?/gi) ?? [];

  const foundTables = new Set<string>();
  for (const m of createMatches) {
    const nameMatch = m.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([a-zA-Z0-9_]+)["'`]?/i);
    if (nameMatch?.[1]) foundTables.add(nameMatch[1].toLowerCase());
  }

  const missingTables = REQUIRED_BACKUP_TABLES.filter((tbl) => !foundTables.has(tbl));
  if (missingTables.length > 0) {
    errors.push(`Thiếu bảng cốt lõi trong bản backup: ${missingTables.join(", ")}`);
  }

  if (insertMatches.length === 0) {
    errors.push("Không tìm thấy câu lệnh INSERT INTO nào trong bản backup.");
  }

  const lowerHead = text.slice(0, 500).toLowerCase();
  if (lowerHead.includes("error:") || lowerHead.includes("authentication error")) {
    errors.push("Nội dung đầu file chứa thông báo lỗi thay vì SQL hợp lệ.");
  }

  return {
    ok: errors.length === 0,
    bytes,
    createTableCount: foundTables.size,
    insertCount: insertMatches.length,
    missingTables,
    errors,
  };
}
