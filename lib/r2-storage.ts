import "server-only";
import { run } from "./db";
import { logInfo, logWarn } from "./logger";

interface R2PutOptions {
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
}

interface R2ObjectLike {
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
}

interface R2BucketLike {
  put(key: string, value: ArrayBuffer | Uint8Array | string, options?: R2PutOptions): Promise<unknown>;
  get?(key: string): Promise<R2ObjectLike | null>;
  delete?(key: string): Promise<void>;
}

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

async function resolveR2Bucket(): Promise<R2BucketLike | null> {
  const globalBucket = (globalThis as { __MEDIA_BUCKET__?: R2BucketLike }).__MEDIA_BUCKET__;
  if (globalBucket && typeof globalBucket.put === "function") {
    return globalBucket;
  }

  // Dynamically probe OpenNext Cloudflare context without bundling it into local Node builds
  try {
    const modName = "@opennextjs/cloudflare";
    const mod = (await import(/* webpackIgnore: true */ modName)) as {
      getCloudflareContext?: (opts?: { async?: boolean }) => Promise<{ env?: Record<string, unknown> }>;
    };
    if (typeof mod?.getCloudflareContext === "function") {
      const ctx = await mod.getCloudflareContext({ async: true });
      const bucket = ctx?.env?.MEDIA_BUCKET as R2BucketLike | undefined;
      if (bucket && typeof bucket.put === "function") {
        return bucket;
      }
    }
  } catch {
    // Running on local Node.js / AI Studio without Cloudflare Workers runtime
  }
  return null;
}

export function resolvePublicMediaUrl(mediaPath: string, storage: "r2" | "d1"): string {
  const cleanKey = mediaPath.replace(/^\/+/, "");
  const cdnBase = (process.env.NEXT_PUBLIC_MEDIA_CDN_URL ?? "").trim().replace(/\/+$/, "");
  if (storage === "r2" && cdnBase) {
    return `${cdnBase}/${cleanKey}`;
  }
  return `/api/media/${cleanKey}`;
}

/**
 * Dual-mode media storage adapter:
 * - Writes binary directly to Cloudflare R2 (`MEDIA_BUCKET`) when bound in production.
 * - Transparently falls back to `media_files` table in D1/SQLite when R2 is not configured.
 */
export async function putMediaObject(
  mediaPath: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ storage: "r2" | "d1"; url: string }> {
  const cleanKey = mediaPath.replace(/^\/+/, "");
  const bucket = await resolveR2Bucket();

  if (bucket) {
    try {
      await bucket.put(cleanKey, bytes, {
        httpMetadata: {
          contentType,
          cacheControl: IMMUTABLE_CACHE_CONTROL,
        },
      });
      const url = resolvePublicMediaUrl(cleanKey, "r2");
      logInfo("media.r2_uploaded", { key: cleanKey, bytes: bytes.length, contentType });
      return { storage: "r2", url };
    } catch (err) {
      logWarn("media.r2_fallback_to_d1", {
        key: cleanKey,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await run(
    "INSERT OR REPLACE INTO media_files (path, mime, data_base64) VALUES (?, ?, ?)",
    cleanKey,
    contentType,
    bytes.toString("base64"),
  );
  return { storage: "d1", url: resolvePublicMediaUrl(cleanKey, "d1") };
}

/**
 * Read binary media object from Cloudflare R2 (`MEDIA_BUCKET`) when bound.
 * Tries the exact path first, then `media/<slug>` for single-segment assets saved via `media-assets.ts`.
 */
export async function getMediaObject(
  mediaPath: string,
): Promise<{ bytes: ArrayBuffer; contentType: string; cacheControl: string } | null> {
  const cleanKey = mediaPath.replace(/^\/+/, "");
  if (!cleanKey) return null;

  const bucket = await resolveR2Bucket();
  if (!bucket || typeof bucket.get !== "function") {
    return null;
  }

  try {
    let obj = await bucket.get(cleanKey);
    if (!obj && !cleanKey.includes("/")) {
      obj = await bucket.get(`media/${cleanKey}`);
    }
    if (!obj) return null;

    return {
      bytes: await obj.arrayBuffer(),
      contentType: obj.httpMetadata?.contentType || "application/octet-stream",
      cacheControl: obj.httpMetadata?.cacheControl || IMMUTABLE_CACHE_CONTROL,
    };
  } catch (err) {
    logWarn("media.r2_read_failed", {
      key: cleanKey,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
