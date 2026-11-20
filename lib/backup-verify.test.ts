import assert from "node:assert/strict";
import test from "node:test";
import { REQUIRED_BACKUP_TABLES, verifyD1BackupSql } from "./backup-verify";

test("verifyD1BackupSql passes when all required tables and INSERT statements exist", () => {
  const ddl = REQUIRED_BACKUP_TABLES.map(
    (tbl) => `CREATE TABLE IF NOT EXISTS "${tbl}" (id INTEGER PRIMARY KEY, name TEXT);`,
  ).join("\n");
  const dml = `INSERT INTO products VALUES (1, 'Gạo lứt huyết rồng');\nINSERT INTO settings VALUES (1, 'Thực Dưỡng Phúc Thọ');\n`;
  const sql = `${ddl}\n${dml}${"-- padding comment\n".repeat(20)}`;

  const res = verifyD1BackupSql(sql);
  assert.equal(res.ok, true);
  assert.equal(res.missingTables.length, 0);
  assert.equal(res.createTableCount, REQUIRED_BACKUP_TABLES.length);
  assert.equal(res.insertCount, 2);
});

test("verifyD1BackupSql detects missing tables, empty dumps, and Wrangler error headers", () => {
  const tiny = verifyD1BackupSql("ERROR: Authentication error (10000)");
  assert.equal(tiny.ok, false);
  assert.ok(tiny.errors.length >= 3);
  assert.equal(tiny.missingTables.length, REQUIRED_BACKUP_TABLES.length);

  const partialSql = `CREATE TABLE products (id INTEGER PRIMARY KEY);\nINSERT INTO products VALUES (1);\n${"-- pad\n".repeat(80)}`;
  const partial = verifyD1BackupSql(partialSql);
  assert.equal(partial.ok, false);
  assert.ok(partial.missingTables.includes("orders"));
  assert.ok(partial.missingTables.includes("member_profiles"));
});
