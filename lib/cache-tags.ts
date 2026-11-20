import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  site: "storefront:site",
  categories: "storefront:categories",
  products: "storefront:products",
  posts: "storefront:posts",
  pages: "storefront:pages",
  videos: "storefront:videos",
  documents: "storefront:documents",
  blocks: "storefront:blocks",
  flashSale: "storefront:flash-sale",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const ALL_STOREFRONT_TAGS: CacheTag[] = Object.values(CACHE_TAGS);

/**
 * Invalidate tagged Next.js Data Cache entries (backed by NEXT_INC_CACHE_KV on Cloudflare)
 * and layout routes safely.
 */
export function invalidateStorefront(...tags: CacheTag[]) {
  const targetTags = tags.length > 0 ? tags : ALL_STOREFRONT_TAGS;
  for (const tag of targetTags) {
    try {
      revalidateTag(tag, "max");
    } catch {
      /* ignore outside Next.js request lifecycle (e.g. unit tests or CLI scripts) */
    }
  }
  try {
    revalidatePath("/", "layout");
  } catch {
    /* ignore outside Next.js request lifecycle */
  }
}
