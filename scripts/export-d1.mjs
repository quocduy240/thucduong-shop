import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(path.join(process.cwd(), "data", "shop.db"));
const outPath = path.join(process.cwd(), "data", "d1-dump.sql");

function sqlLiteral(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return Number.isFinite(val) ? String(val) : "NULL";
  if (typeof val === "bigint") return val.toString();
  if (val instanceof Uint8Array) {
    return `X'${Buffer.from(val).toString("hex")}'`;
  }
  const s = String(val);
  return `'${s.replace(/'/g, "''")}'`;
}

const objects = db
  .prepare(
    "SELECT type, name, sql FROM sqlite_master WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY CASE WHEN type='table' THEN 0 ELSE 1 END, rowid ASC",
  )
  .all();

const lines = [];
lines.push("-- Auto-generated D1 dump from data/shop.db");

for (const obj of objects) {
  if (obj.type === "table") {
    lines.push(`DROP TABLE IF EXISTS "${obj.name}";`);
    // Replace CREATE TABLE with CREATE TABLE IF NOT EXISTS
    const createSql = obj.sql.replace(/^CREATE TABLE\s+/i, "CREATE TABLE IF NOT EXISTS ");
    lines.push(`${createSql};`);
  }
}

lines.push(`CREATE TABLE IF NOT EXISTS media_files (
  path TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  data_base64 TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);`);

for (const obj of objects) {
  if (obj.type === "index") {
    const idxSql = obj.sql.replace(/^CREATE (UNIQUE )?INDEX\s+/i, (_, u) => `CREATE ${u || ""}INDEX IF NOT EXISTS `);
    lines.push(`${idxSql};`);
  }
}

// Export rows for each table
for (const obj of objects) {
  if (obj.type !== "table") continue;
  const rows = db.prepare(`SELECT * FROM "${obj.name}"`).all();
  if (!rows.length) continue;
  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  for (const row of rows) {
    const vals = cols.map((c) => sqlLiteral(row[c])).join(", ");
    lines.push(`INSERT INTO "${obj.name}" (${colList}) VALUES (${vals});`);
  }
}

fs.writeFileSync(outPath, lines.join("\n"), "utf8");
const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
console.log(`Exported ${objects.filter((o) => o.type === "table").length} tables to ${outPath} (${sizeKb} KB, ${lines.length} statements)`);
