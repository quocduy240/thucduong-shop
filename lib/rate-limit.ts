/**
 * Lightweight, zero-dependency sliding-window rate limiter compatible with
 * both Node.js and Cloudflare Workers isolates.
 *
 * For multi-region enforcement at high traffic, pair with Cloudflare WAF Rate Limiting Rules.
 */

export type RateLimitOptions = {
  /** Namespace key (e.g. "quick-consult", "member-auth") */
  namespace: string;
  /** Maximum requests allowed inside the sliding window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

type BucketEntry = {
  timestamps: number[];
  lastSeen: number;
};

const MAX_TRACKED_KEYS = 5000;
const globalBuckets = globalThis as unknown as { __tdRateLimitBuckets?: Map<string, BucketEntry> };

function getBuckets(): Map<string, BucketEntry> {
  if (!globalBuckets.__tdRateLimitBuckets) {
    globalBuckets.__tdRateLimitBuckets = new Map<string, BucketEntry>();
  }
  return globalBuckets.__tdRateLimitBuckets;
}

/**
 * Extract the client IP safely from Cloudflare / reverse-proxy headers.
 */
export function getClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function pruneIfNeeded(buckets: Map<string, BucketEntry>, now: number, maxWindowMs: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [k, v] of buckets.entries()) {
    if (now - v.lastSeen > maxWindowMs) {
      buckets.delete(k);
    }
  }
  // If still over cap, evict oldest entries
  if (buckets.size >= MAX_TRACKED_KEYS) {
    const overflow = buckets.size - Math.floor(MAX_TRACKED_KEYS * 0.8);
    let removed = 0;
    for (const k of buckets.keys()) {
      buckets.delete(k);
      removed++;
      if (removed >= overflow) break;
    }
  }
}

export function checkRateLimit(
  identifier: string,
  opts: RateLimitOptions,
  now = Date.now(),
  store?: Map<string, BucketEntry>,
): RateLimitResult {
  const buckets = store ?? getBuckets();
  pruneIfNeeded(buckets, now, opts.windowMs);

  const key = `${opts.namespace}:${identifier}`;
  const cutoff = now - opts.windowMs;
  const existing = buckets.get(key);
  const timestamps = existing ? existing.timestamps.filter((t) => t > cutoff) : [];

  if (timestamps.length >= opts.limit) {
    const oldest = timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000));
    buckets.set(key, { timestamps, lastSeen: now });
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  timestamps.push(now);
  buckets.set(key, { timestamps, lastSeen: now });
  return {
    allowed: true,
    remaining: Math.max(0, opts.limit - timestamps.length),
    retryAfterSec: 0,
  };
}

export function rateLimitResponse(retryAfterSec: number, message?: string): Response {
  return Response.json(
    {
      error:
        message ??
        `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${retryAfterSec} giây.`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store",
      },
    },
  );
}
