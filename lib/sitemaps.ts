import "server-only";
import { cache } from "react";
import { all, one, run } from "./db";
import {
  getPages,
  getPostCategories,
  getPostSections,
  getProductCategories,
  url,
} from "./data";

export type ChangeFreq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export type SitemapGroupKey =
  | "home"
  | "special"
  | "product_categories"
  | "products"
  | "post_categories"
  | "posts"
  | "pages";

export type SitemapGroupConfig = {
  enabled: boolean;
  priority: number;
  changefreq: ChangeFreq;
};

export type SitemapCustomEntry = {
  path: string;
  priority: number;
  changefreq: ChangeFreq;
};

export type SitemapConfig = {
  enabled: boolean;
  baseUrl: string;
  groups: Record<SitemapGroupKey, SitemapGroupConfig>;
  customUrls: SitemapCustomEntry[];
  excludedPaths: string[];
  updatedAt?: string;
};

export type SitemapEntry = {
  loc: string;
  path: string;
  group: SitemapGroupKey | "custom";
  lastmod?: string;
  changefreq: ChangeFreq;
  priority: number;
};

const SETTINGS_KEY = "sitemap_config";

export const DEFAULT_SITEMAP_CONFIG: SitemapConfig = {
  enabled: true,
  baseUrl: "https://thucduongshop.duyvo.win",
  groups: {
    home: { enabled: true, priority: 1.0, changefreq: "daily" },
    special: { enabled: true, priority: 0.9, changefreq: "daily" },
    product_categories: { enabled: true, priority: 0.8, changefreq: "weekly" },
    products: { enabled: true, priority: 0.8, changefreq: "weekly" },
    post_categories: { enabled: true, priority: 0.7, changefreq: "weekly" },
    posts: { enabled: true, priority: 0.7, changefreq: "monthly" },
    pages: { enabled: true, priority: 0.5, changefreq: "monthly" },
  },
  customUrls: [],
  excludedPaths: [],
};

export const getSitemapConfig = cache(async (): Promise<SitemapConfig> => {
  try {
    const row = await one<{ value: string }>("SELECT value FROM settings WHERE key = ?", SETTINGS_KEY);
    if (!row?.value) return DEFAULT_SITEMAP_CONFIG;
    const parsed = JSON.parse(row.value) as Partial<SitemapConfig>;
    return {
      enabled: parsed.enabled ?? DEFAULT_SITEMAP_CONFIG.enabled,
      baseUrl: (parsed.baseUrl || DEFAULT_SITEMAP_CONFIG.baseUrl).replace(/\/+$/, ""),
      groups: {
        ...DEFAULT_SITEMAP_CONFIG.groups,
        ...(parsed.groups ?? {}),
      },
      customUrls: Array.isArray(parsed.customUrls) ? parsed.customUrls : [],
      excludedPaths: Array.isArray(parsed.excludedPaths) ? parsed.excludedPaths : [],
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return DEFAULT_SITEMAP_CONFIG;
  }
});

export async function saveSitemapConfig(input: Partial<SitemapConfig>): Promise<SitemapConfig> {
  const current = await getSitemapConfig();
  const nextGroups = { ...current.groups };
  if (input.groups) {
    for (const k of Object.keys(DEFAULT_SITEMAP_CONFIG.groups) as SitemapGroupKey[]) {
      const g = input.groups[k];
      if (g) {
        nextGroups[k] = {
          enabled: Boolean(g.enabled),
          priority: Math.min(1, Math.max(0.1, Number(g.priority) || 0.5)),
          changefreq: g.changefreq || "weekly",
        };
      }
    }
  }

  const next: SitemapConfig = {
    enabled: input.enabled ?? current.enabled,
    baseUrl: (input.baseUrl ?? current.baseUrl).trim().replace(/\/+$/, "") || DEFAULT_SITEMAP_CONFIG.baseUrl,
    groups: nextGroups,
    customUrls: Array.isArray(input.customUrls)
      ? input.customUrls
          .map((c) => ({
            path: String(c.path || "").trim(),
            priority: Math.min(1, Math.max(0.1, Number(c.priority) || 0.6)),
            changefreq: (c.changefreq || "weekly") as ChangeFreq,
          }))
          .filter((c) => c.path.startsWith("/"))
      : current.customUrls,
    excludedPaths: Array.isArray(input.excludedPaths)
      ? input.excludedPaths.map((p) => String(p).trim()).filter(Boolean)
      : current.excludedPaths,
    updatedAt: new Date().toISOString(),
  };

  await run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    SETTINGS_KEY,
    JSON.stringify(next),
  );
  return next;
}

export async function buildSitemapEntries(): Promise<{
  config: SitemapConfig;
  entries: SitemapEntry[];
  counts: Record<SitemapGroupKey | "custom", number>;
}> {
  const config = await getSitemapConfig();
  const counts: Record<SitemapGroupKey | "custom", number> = {
    home: 0,
    special: 0,
    product_categories: 0,
    products: 0,
    post_categories: 0,
    posts: 0,
    pages: 0,
    custom: 0,
  };

  if (!config.enabled) {
    return { config, entries: [], counts };
  }

  const excluded = new Set(config.excludedPaths.map((p) => p.trim()));
  const entries: SitemapEntry[] = [];
  const seen = new Set<string>();

  const push = (
    pathStr: string,
    group: SitemapGroupKey | "custom",
    cfg: SitemapGroupConfig,
    lastmod?: string,
  ) => {
    if (!pathStr.startsWith("/")) return;
    if (excluded.has(pathStr) || seen.has(pathStr)) return;
    seen.add(pathStr);
    counts[group]++;
    entries.push({
      loc: `${config.baseUrl}${pathStr}`,
      path: pathStr,
      group,
      lastmod,
      changefreq: cfg.changefreq,
      priority: cfg.priority,
    });
  };

  const today = new Date().toISOString().slice(0, 10);

  if (config.groups.home.enabled) {
    push("/", "home", config.groups.home, today);
  }

  if (config.groups.special.enabled) {
    for (const p of [
      "/san-pham/",
      "/canh-duong-sinh/",
      "/tu-van-nhanh/",
      "/thu-vien/bai-giang-thuc-duong/",
      "/thanh-vien/",
      "/so-do-trang.html",
    ]) {
      push(p, "special", config.groups.special, today);
    }
  }

  const [prodCats, products, sections, postCats, posts, rootPages, policyPages] = await Promise.all([
    config.groups.product_categories.enabled ? getProductCategories() : Promise.resolve([]),
    config.groups.products.enabled
      ? all<{ slug: string; category_slug: string }>(
          "SELECT p.slug, c.slug AS category_slug FROM products p JOIN product_categories c ON c.id = p.category_id ORDER BY p.id DESC",
        )
      : Promise.resolve([]),
    config.groups.post_categories.enabled ? getPostSections() : Promise.resolve([]),
    config.groups.post_categories.enabled ? getPostCategories() : Promise.resolve([]),
    config.groups.posts.enabled
      ? all<{ slug: string; category_slug: string; section_slug: string; created_at: string }>(
          `SELECT po.slug, pc.slug AS category_slug, pc.section_slug, po.created_at
           FROM posts po JOIN post_categories pc ON pc.id = po.category_id
           ORDER BY po.created_at DESC`,
        )
      : Promise.resolve([]),
    config.groups.pages.enabled ? getPages("") : Promise.resolve([]),
    config.groups.pages.enabled ? getPages("chinh-sach") : Promise.resolve([]),
  ]);

  for (const c of prodCats) {
    push(url.productCategory(c), "product_categories", config.groups.product_categories);
  }
  for (const p of products) {
    push(url.product(p), "products", config.groups.products);
  }
  for (const s of sections) {
    push(url.postSection(s.slug), "post_categories", config.groups.post_categories);
  }
  for (const c of postCats) {
    push(url.postCategory(c), "post_categories", config.groups.post_categories);
  }
  for (const p of posts) {
    const lm = p.created_at ? p.created_at.slice(0, 10) : undefined;
    push(url.post(p), "posts", config.groups.posts, lm);
  }
  for (const pg of [...rootPages, ...policyPages]) {
    push(url.page(pg), "pages", config.groups.pages);
  }
  for (const cu of config.customUrls) {
    push(cu.path, "custom", { enabled: true, priority: cu.priority, changefreq: cu.changefreq }, today);
  }

  return { config, entries, counts };
}
