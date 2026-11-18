import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type D1RunResult = {
  lastInsertRowid: number;
  changes: number;
};

type D1Binding = {
  prepare: (sql: string) => {
    bind: (...params: unknown[]) => {
      all: <T>() => Promise<{ results: T[] }>;
      first: <T>() => Promise<T | null>;
      run: () => Promise<{ meta?: { last_row_id?: number; changes?: number } }>;
    };
    all: <T>() => Promise<{ results: T[] }>;
    first: <T>() => Promise<T | null>;
    run: () => Promise<{ meta?: { last_row_id?: number; changes?: number } }>;
  };
  batch: (stmts: unknown[]) => Promise<unknown[]>;
};

export async function getDb(): Promise<D1Binding> {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as { DB?: D1Binding };
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` chưa được cấu hình trong wrangler.jsonc.");
  }
  return env.DB;
}

function normalizeParams(params: unknown[]): unknown[] {
  return params.map((p) => (p === undefined ? null : p));
}

export async function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...normalizeParams(params)) : stmt;
  const res = await bound.all<T>();
  return (res.results ?? []).map((r) => ({ ...(r as Record<string, unknown>) }) as T);
}

export async function one<T = Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
): Promise<T | undefined> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...normalizeParams(params)) : stmt;
  const row = await bound.first<T>();
  return row ? ({ ...(row as Record<string, unknown>) } as T) : undefined;
}

export async function run(sql: string, ...params: unknown[]): Promise<D1RunResult> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...normalizeParams(params)) : stmt;
  const res = await bound.run();
  return {
    lastInsertRowid: Number(res.meta?.last_row_id ?? 0),
    changes: Number(res.meta?.changes ?? 0),
  };
}

export async function batch(statements: { sql: string; params?: unknown[] }[]): Promise<void> {
  if (!statements.length) return;
  const db = await getDb();
  const prepared = statements.map((s) => {
    const stmt = db.prepare(s.sql);
    return s.params?.length ? stmt.bind(...normalizeParams(s.params)) : stmt;
  });
  await db.batch(prepared);
}
