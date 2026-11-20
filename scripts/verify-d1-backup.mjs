#!/usr/bin/env node
/**
 * Standalone CLI to verify an exported Cloudflare D1 `.sql` backup file.
 * Usage: node scripts/verify-d1-backup.mjs path/to/backup.sql
 */

import fs from "node:fs";
import path from "node:path";

const REQUIRED_TABLES = [
  "products",
  "product_categories",
  "orders",
  "order_items",
  "posts",
  "member_profiles",
  "point_transactions",
  "settings",
  "admins",
];

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/verify-d1-backup.mjs <backup.sql>");
  process.exit(1);
}

const fullPath = path.resolve(target);
if (!fs.existsSync(fullPath)) {
  console.error(`❌ Không tìm thấy file backup: ${fullPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(fullPath, "utf8");
const bytes = Buffer.byteLength(sql, "utf8");
const createMatches = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([a-zA-Z0-9_]+)["'`]?/gi) ?? [];
const insertMatches = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+["'`]?([a-zA-Z0-9_]+)["'`]?/gi) ?? [];

const foundTables = new Set();
for (const m of createMatches) {
  const match = m.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([a-zA-Z0-9_]+)["'`]?/i);
  if (match?.[1]) foundTables.add(match[1].toLowerCase());
}

const missing = REQUIRED_TABLES.filter((t) => !foundTables.has(t));
const errors = [];
if (bytes < 512) errors.push(`File quá nhỏ (${bytes} bytes)`);
if (missing.length > 0) errors.push(`Thiếu bảng: ${missing.join(", ")}`);
if (insertMatches.length === 0) errors.push("Không có câu lệnh INSERT INTO");

if (errors.length > 0) {
  console.error(`❌ Kiểm tra backup D1 thất bại:\n - ${errors.join("\n - ")}`);
  process.exit(1);
}

console.log(
  `✅ Backup D1 hợp lệ: ${(bytes / 1024).toFixed(1)} KB | ${foundTables.size} bảng | ${insertMatches.length} dòng INSERT`,
);
