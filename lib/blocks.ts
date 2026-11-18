import "server-only";
import { all, one } from "./db";

export type BlockPosition =
  | "post_top"
  | "post_middle"
  | "post_bottom"
  | "post_sidebar"
  | "product_top"
  | "product_bottom"
  | "product_sidebar"
  | "home_top"
  | "home_bottom"
  | "manual";

export const BLOCK_POSITION_LABELS: Record<BlockPosition, string> = {
  post_top: "📰 Đầu bài viết (Trước nội dung bài viết)",
  post_middle: "📰 Giữa bài viết (Tự động chèn sau mục H2 đầu tiên)",
  post_bottom: "📰 Cuối bài viết (Sau nội dung bài viết)",
  post_sidebar: "📰 Cột bên phải trang bài viết (Sidebar)",
  product_top: "🛍️ Đầu mô tả chi tiết sản phẩm",
  product_bottom: "🛍️ Cuối mô tả chi tiết sản phẩm",
  product_sidebar: "🛍️ Cột phải trang sản phẩm (Dưới thông số)",
  home_top: "🏠 Trang chủ — Dưới Banner chính",
  home_bottom: "🏠 Trang chủ — Trước Footer",
  manual: "✍️ Chỉ chèn thủ công bằng mã [[block:slug]] hoặc lồng trong Block khác",
};

export const BLOCK_STYLE_LABELS: Record<string, { label: string; border: string; bg: string; titleColor: string }> = {
  emerald: {
    label: "🌿 Khung Xanh Thực dưỡng",
    border: "#86efac",
    bg: "#f0fdf4",
    titleColor: "#14532d",
  },
  amber: {
    label: "🍯 Khung Vàng Ấm Áp",
    border: "#fcd34d",
    bg: "#fffbeb",
    titleColor: "#92400e",
  },
  blue: {
    label: "💎 Khung Xanh Dương",
    border: "#93c5fd",
    bg: "#eff6ff",
    titleColor: "#1e3a8a",
  },
  rose: {
    label: "🌸 Khung Hồng Lưu ý",
    border: "#fda4af",
    bg: "#fff1f2",
    titleColor: "#881337",
  },
  neutral: {
    label: "📄 Khung Trắng Viền Xám",
    border: "#e5e7eb",
    bg: "#ffffff",
    titleColor: "#111827",
  },
  raw: {
    label: "⚡ Không khung (Chỉ hiển thị nội dung / Tổ hợp Block lồng nhau)",
    border: "transparent",
    bg: "transparent",
    titleColor: "#111827",
  },
};

export type ContentBlock = {
  id: number;
  slug: string;
  title: string;
  style_variant: string;
  positions: string;
  target_post_ids: string;
  target_product_ids: string;
  content_html: string;
  active: number;
  sort: number;
  created_at: string;
};

export const getAllBlocks = () =>
  all<ContentBlock>(
    "SELECT id, slug, title, style_variant, positions, target_post_ids, target_product_ids, content_html, active, sort, created_at FROM content_blocks ORDER BY sort ASC, id ASC",
  );

export const getActiveBlocks = () =>
  all<ContentBlock>(
    "SELECT id, slug, title, style_variant, positions, target_post_ids, target_product_ids, content_html, active, sort, created_at FROM content_blocks WHERE active = 1 ORDER BY sort ASC, id ASC",
  );

export const getBlockById = (id: number) =>
  one<ContentBlock>(
    "SELECT id, slug, title, style_variant, positions, target_post_ids, target_product_ids, content_html, active, sort, created_at FROM content_blocks WHERE id = ?",
    id,
  );

/** Wrap a single block's inner HTML in its visual card style */
export function wrapBlockCard(block: ContentBlock, innerExpandedHtml: string): string {
  if (block.style_variant === "raw") {
    return `<div data-rendered-block="${block.slug}" class="my-4">${innerExpandedHtml}</div>`;
  }
  const st = BLOCK_STYLE_LABELS[block.style_variant] ?? BLOCK_STYLE_LABELS.emerald;
  return `
<section data-rendered-block="${block.slug}" style="border:2px solid ${st.border};background:${st.bg};border-radius:16px;padding:18px 20px;margin:18px 0;">
  ${
    block.title
      ? `<h3 style="margin:0 0 10px;font-size:16px;font-weight:800;color:${st.titleColor};">${block.title}</h3>`
      : ""
  }
  <div class="prose-content" style="font-size:14px;">
    ${innerExpandedHtml}
  </div>
</section>`;
}

/**
 * Recursively expand [[block:slug]] and <div data-reusable-block="slug">...</div>
 * inside any HTML string (supports Block-in-Block up to depth 4 with cycle protection).
 */
export async function expandNestedBlocks(
  rawHtml: string,
  depth = 0,
  visited: Set<string> = new Set(),
  blocksMap?: Map<string, ContentBlock>,
): Promise<string> {
  if (!rawHtml || depth > 4) return rawHtml;
  const map =
    blocksMap ??
    new Map(
      (await getActiveBlocks()).map((b) => [b.slug, b]),
    );

  const renderSlug = async (slug: string): Promise<string> => {
    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug || visited.has(cleanSlug)) return "";
    const blk = map.get(cleanSlug);
    if (!blk || !blk.active) return "";
    const nextVisited = new Set(visited);
    nextVisited.add(cleanSlug);
    const expandedInner = await expandNestedBlocks(blk.content_html, depth + 1, nextVisited, map);
    return wrapBlockCard(blk, expandedInner);
  };

  // Helper to do async regex replace
  const replaceAsync = async (str: string, regex: RegExp, replacer: (slug: string) => Promise<string>) => {
    const matches = [...str.matchAll(regex)];
    if (!matches.length) return str;
    let res = "";
    let last = 0;
    for (const m of matches) {
      const idx = m.index ?? 0;
      res += str.slice(last, idx);
      res += await replacer(m[1]);
      last = idx + m[0].length;
    }
    return res + str.slice(last);
  };

  let out = await replaceAsync(
    rawHtml,
    /<div[^>]*data-reusable-block="([^"]+)"[^>]*>[\s\S]*?<\/div>/gi,
    renderSlug,
  );
  out = await replaceAsync(out, /\[\[\s*block\s*:\s*([a-zA-Z0-9_-]+)\s*\]\]/gi, renderSlug);
  return out;
}

function parseIds(csv: string): number[] {
  return (csv || "")
    .split(/[\s,]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/**
 * Get all active blocks assigned to a Frontend Block-Position,
 * filtered by optional postId or productId targeting, with nested blocks expanded.
 */
export async function getRenderedBlocksForPosition(
  position: BlockPosition,
  context: { postId?: number; productId?: number } = {},
): Promise<{ id: number; slug: string; html: string }[]> {
  const active = await getActiveBlocks();
  const map = new Map(active.map((b) => [b.slug, b]));

  const matched = active.filter((b) => {
    const posList = b.positions
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!posList.includes(position)) return false;

    const targetPosts = parseIds(b.target_post_ids);
    const targetProducts = parseIds(b.target_product_ids);

    if (context.postId && targetPosts.length > 0 && !targetPosts.includes(context.postId)) {
      return false;
    }
    if (context.productId && targetProducts.length > 0 && !targetProducts.includes(context.productId)) {
      return false;
    }
    if (!context.postId && targetPosts.length > 0 && position.startsWith("post_")) return false;
    if (!context.productId && targetProducts.length > 0 && position.startsWith("product_")) return false;

    return true;
  });

  return Promise.all(
    matched.map(async (b) => {
      const visited = new Set<string>([b.slug]);
      const inner = await expandNestedBlocks(b.content_html, 1, visited, map);
      return {
        id: b.id,
        slug: b.slug,
        html: wrapBlockCard(b, inner),
      };
    }),
  );
}

/**
 * Prepare article HTML by expanding all inline [[block:slug]] tags AND injecting
 * any blocks assigned to "post_middle" after the first </h2> (or second </p>).
 */
export async function preparePostHtmlWithBlocks(rawHtml: string, postId: number): Promise<string> {
  const expanded = await expandNestedBlocks(rawHtml);
  const middleBlocks = await getRenderedBlocksForPosition("post_middle", { postId });
  if (middleBlocks.length === 0) return expanded;

  const middleHtml = middleBlocks.map((b) => b.html).join("\n");
  const h2Matches = [...expanded.matchAll(/<h2[\s>]/gi)];
  if (h2Matches.length >= 2 && h2Matches[1].index !== undefined) {
    const idx = h2Matches[1].index;
    return expanded.slice(0, idx) + middleHtml + "\n" + expanded.slice(idx);
  }
  const pClose = expanded.indexOf("</p>");
  if (pClose !== -1) {
    return expanded.slice(0, pClose + 4) + "\n" + middleHtml + expanded.slice(pClose + 4);
  }
  return expanded + "\n" + middleHtml;
}
