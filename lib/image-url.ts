/**
 * Cloudflare R2 CDN & Cloudflare Image Resizing (`/cdn-cgi/image/...`) URL optimizer.
 * Safe in both Server and Client components; degrades cleanly when flags are unset.
 */

export interface ImageOptimizeOptions {
  width?: number;
  quality?: number;
  fit?: "cover" | "contain" | "scale-down";
  format?: "auto" | "webp" | "avif";
  cfResizingEnabled?: boolean;
  cdnBaseUrl?: string;
}

const NON_RESIZABLE_EXT_RE = /\.(svg|ico)(\?.*)?$/i;

function normalizeCdnBase(raw?: string): string {
  return (raw ?? process.env.NEXT_PUBLIC_MEDIA_CDN_URL ?? "").trim().replace(/\/+$/, "");
}

function isCfResizingEnabled(override?: boolean): boolean {
  if (typeof override === "boolean") return override;
  return process.env.NEXT_PUBLIC_CF_IMAGE_RESIZING === "1";
}

/**
 * Resolve the delivery URL for a media asset:
 * 1. Rewrites `/api/media/...` to an R2 public CDN domain when `NEXT_PUBLIC_MEDIA_CDN_URL` is configured.
 * 2. Wraps eligible raster images with Cloudflare `/cdn-cgi/image/...` when `NEXT_PUBLIC_CF_IMAGE_RESIZING=1`.
 */
export function optimizeImageUrl(
  src: string | null | undefined,
  opts: ImageOptimizeOptions = {},
): string {
  const raw = String(src ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("/cdn-cgi/image/")) {
    return raw;
  }

  const cdnBase = normalizeCdnBase(opts.cdnBaseUrl);
  let resolved = raw;
  if (cdnBase && raw.startsWith("/api/media/")) {
    const key = raw.slice("/api/media/".length).replace(/^\/+/, "");
    // Single-segment keys are AI/importer assets stored in R2 under "media/<slug>".
    resolved = `${cdnBase}/${key.includes("/") ? key : `media/${key}`}`;
  }

  if (!isCfResizingEnabled(opts.cfResizingEnabled)) {
    return resolved;
  }
  if (NON_RESIZABLE_EXT_RE.test(resolved)) {
    return resolved;
  }

  // Only transform same-origin relative assets or assets hosted on our configured R2 CDN
  const isLocalPath = resolved.startsWith("/") && !resolved.startsWith("//");
  const isOwnCdn = Boolean(cdnBase && resolved.startsWith(`${cdnBase}/`));
  if (!isLocalPath && !isOwnCdn) {
    return resolved;
  }

  const params: string[] = [];
  if (opts.width && Number.isFinite(opts.width) && opts.width > 0) {
    params.push(`width=${Math.round(opts.width)}`);
  }
  params.push(`quality=${Math.max(40, Math.min(95, Math.round(opts.quality ?? 80)))}`);
  params.push(`fit=${opts.fit ?? "cover"}`);
  params.push(`format=${opts.format ?? "auto"}`);

  const target = isLocalPath ? resolved.replace(/^\/+/, "") : resolved;
  return `/cdn-cgi/image/${params.join(",")}/${target}`;
}

/**
 * Build a responsive `srcSet` string when Cloudflare Image Resizing is enabled.
 * Returns `undefined` when resizing is disabled to avoid redundant duplicate candidates.
 */
export function buildImageSrcSet(
  src: string | null | undefined,
  widths: number[] = [320, 640, 960],
  opts: Omit<ImageOptimizeOptions, "width"> = {},
): string | undefined {
  const raw = String(src ?? "").trim();
  if (!raw || !isCfResizingEnabled(opts.cfResizingEnabled) || NON_RESIZABLE_EXT_RE.test(raw)) {
    return undefined;
  }
  const candidates = widths
    .filter((w) => Number.isFinite(w) && w > 0)
    .map((w) => {
      const transformed = optimizeImageUrl(raw, { ...opts, width: w });
      return transformed.startsWith("/cdn-cgi/image/") ? `${transformed} ${Math.round(w)}w` : "";
    })
    .filter(Boolean);

  return candidates.length > 0 ? candidates.join(", ") : undefined;
}
