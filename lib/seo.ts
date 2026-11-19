import "server-only";
import { all, one, run } from "./db";

let seoColsPromise: Promise<void> | null = null;

export async function ensureSeoColumns(): Promise<void> {
  if (!seoColsPromise) {
    seoColsPromise = (async () => {
      for (const table of ["products", "posts"] as const) {
        const cols = await all<{ name: string }>(`PRAGMA table_info(${table})`);
        const names = new Set(cols.map((c) => c.name));
        for (const col of ["seo_title", "seo_description", "seo_keywords"]) {
          if (!names.has(col)) {
            await run(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
          }
        }
      }
    })().catch((err) => {
      seoColsPromise = null;
      throw err;
    });
  }
  await seoColsPromise;
}

export type SeoFields = {
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
};

export async function getSeoFields(table: "products" | "posts", id: number): Promise<SeoFields> {
  if (!id) return { seo_title: "", seo_description: "", seo_keywords: "" };
  try {
    await ensureSeoColumns();
    const row = await one<SeoFields>(
      `SELECT COALESCE(seo_title, '') AS seo_title, COALESCE(seo_description, '') AS seo_description, COALESCE(seo_keywords, '') AS seo_keywords FROM ${table} WHERE id = ?`,
      id,
    );
    return row ?? { seo_title: "", seo_description: "", seo_keywords: "" };
  } catch {
    return { seo_title: "", seo_description: "", seo_keywords: "" };
  }
}
