import { getCloudflareContext } from "@opennextjs/cloudflare";
import "server-only";
import { one, run } from "./db";

type R2BucketLike = {
  put: (key: string, value: ArrayBuffer | Uint8Array, opts?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
  get: (key: string) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
};

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

async function getOptionalR2Bucket(): Promise<R2BucketLike | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx.env as unknown as { MEDIA_BUCKET?: R2BucketLike };
    return env?.MEDIA_BUCKET ?? null;
  } catch {
    return null;
  }
}

export async function saveMediaAsset(slug: string, mimeType: string, base64: string): Promise<string> {
  const bucket = await getOptionalR2Bucket();
  if (bucket) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    await bucket.put(`media/${slug}`, bytes, { httpMetadata: { contentType: mimeType } });
    return `/api/media/${encodeURIComponent(slug)}`;
  }

  await ensureMediaAssetsTable();
  await run(
    `INSERT OR REPLACE INTO media_assets (slug, mime_type, data_base64) VALUES (?, ?, ?)`,
    slug,
    mimeType,
    base64,
  );
  return `/api/media/${encodeURIComponent(slug)}`;
}

export async function getMediaAsset(
  slug: string,
): Promise<{ mime_type: string; data_base64?: string; bytes?: Uint8Array } | undefined> {
  const bucket = await getOptionalR2Bucket();
  if (bucket) {
    const obj = await bucket.get(`media/${slug}`);
    if (obj) {
      const buf = await obj.arrayBuffer();
      return {
        mime_type: obj.httpMetadata?.contentType || "image/png",
        bytes: new Uint8Array(buf),
      };
    }
  }

  await ensureMediaAssetsTable();
  return one<{ mime_type: string; data_base64: string }>(
    `SELECT mime_type, data_base64 FROM media_assets WHERE slug = ?`,
    slug,
  );
}
