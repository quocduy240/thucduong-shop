import "server-only";
import { one, run } from "./db";

let mediaReady = false;

export async function ensureMediaAssetsTable(): Promise<void> {
  if (mediaReady) return;
  await run(`
    CREATE TABLE IF NOT EXISTS media_assets (
      slug TEXT PRIMARY KEY,
      mime_type TEXT NOT NULL DEFAULT 'image/png',
      data_base64 TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  mediaReady = true;
}

export async function saveMediaAsset(slug: string, mimeType: string, base64: string): Promise<string> {
  await ensureMediaAssetsTable();
  await run(
    `INSERT OR REPLACE INTO media_assets (slug, mime_type, data_base64) VALUES (?, ?, ?)`,
    slug,
    mimeType,
    base64,
  );
  return `/api/media/${encodeURIComponent(slug)}`;
}

export async function getMediaAsset(slug: string): Promise<{ mime_type: string; data_base64: string } | undefined> {
  await ensureMediaAssetsTable();
  return one<{ mime_type: string; data_base64: string }>(
    `SELECT mime_type, data_base64 FROM media_assets WHERE slug = ?`,
    slug,
  );
}
