import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { seed } from "./seed";

const DB_PATH = path.join(process.cwd(), "data", "shop.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS product_categories (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES product_categories(id),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  sale_price INTEGER,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS post_sections (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS post_categories (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  section_slug TEXT NOT NULL REFERENCES post_sections(slug),
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES post_categories(id),
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS pages (
  slug TEXT NOT NULL,
  grp TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (grp, slug)
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS provinces (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS wards (
  code TEXT PRIMARY KEY,
  province_code TEXT NOT NULL REFERENCES provinces(code),
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  province_code TEXT NOT NULL,
  ward_code TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  payment TEXT NOT NULL DEFAULT 'cod',
  total INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/** Additive migrations for databases created by an earlier version of the schema. */
export function migrate(db: DatabaseSync) {
  const cols = (db.prepare("PRAGMA table_info(posts)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("cover")) db.exec("ALTER TABLE posts ADD COLUMN cover TEXT");
  if (!cols.includes("source_url")) db.exec("ALTER TABLE posts ADD COLUMN source_url TEXT");
  const pcols = (db.prepare("PRAGMA table_info(products)").all() as { name: string }[]).map((c) => c.name);
  if (!pcols.includes("image")) db.exec("ALTER TABLE products ADD COLUMN image TEXT");
  if (!pcols.includes("source_url")) db.exec("ALTER TABLE products ADD COLUMN source_url TEXT");
  const ocols = (db.prepare("PRAGMA table_info(orders)").all() as { name: string }[]).map((c) => c.name);
  if (!ocols.includes("status")) db.exec("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'new'");
}

const g = globalThis as unknown as { __shopDb?: DatabaseSync };

function open(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  migrate(db);
  const row = db.prepare("SELECT COUNT(*) AS n FROM product_categories").get() as { n: number };
  if (row.n === 0) seed(db);
  return db;
}

export function db(): DatabaseSync {
  if (!g.__shopDb) g.__shopDb = open();
  return g.__shopDb;
}

type Param = string | number | null;

/** Run a SELECT and return plain objects (safe to pass to Client Components). */
export function all<T>(sql: string, ...params: Param[]): T[] {
  return db()
    .prepare(sql)
    .all(...params)
    .map((r) => ({ ...r }) as T);
}

export function one<T>(sql: string, ...params: Param[]): T | undefined {
  const r = db().prepare(sql).get(...params);
  return r ? ({ ...r } as T) : undefined;
}

export function run(sql: string, ...params: Param[]) {
  return db().prepare(sql).run(...params);
}
