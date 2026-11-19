import "server-only";
import { cache } from "react";
import { one, run } from "./db";
import {
  buildChannelOutboundUrl,
  DEFAULT_SOCIAL_CONFIG,
  PLATFORM_META,
  safeSocialUrl,
  type SocialChannel,
  type SocialLinksConfig,
  type SocialPlatform,
  type SocialStyle,
} from "./social-links-shared";

const SETTINGS_KEY = "social_links_config";

function sanitizeChannel(raw: Partial<SocialChannel>, idx: number): SocialChannel {
  const platform: SocialPlatform =
    raw.platform && raw.platform in PLATFORM_META ? (raw.platform as SocialPlatform) : "website";
  const meta = PLATFORM_META[platform];
  const group = raw.group === "marketplace" || raw.group === "social" ? raw.group : meta.defaultGroup;
  const id = String(raw.id || `${platform}-${idx + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .slice(0, 48);
  return {
    id: id || `channel-${idx + 1}`,
    platform,
    group,
    name: String(raw.name ?? meta.label).trim().slice(0, 120),
    handle: String(raw.handle ?? "").trim().slice(0, 160),
    url: safeSocialUrl(String(raw.url ?? "")),
    badge: String(raw.badge ?? "").trim().slice(0, 40),
    ctaLabel: String(raw.ctaLabel ?? meta.defaultCta).trim().slice(0, 40),
    enabled: Boolean(raw.enabled),
    sort: Number.isFinite(Number(raw.sort)) ? Number(raw.sort) : idx + 1,
    clicks: Math.max(0, Math.floor(Number(raw.clicks ?? 0) || 0)),
  };
}

export function normalizeSocialConfig(raw: Partial<SocialLinksConfig> | null | undefined): SocialLinksConfig {
  const src = raw ?? {};
  const style: SocialStyle =
    src.defaultStyle === "cards" ||
    src.defaultStyle === "pills" ||
    src.defaultStyle === "sidebar" ||
    src.defaultStyle === "icons"
      ? src.defaultStyle
      : DEFAULT_SOCIAL_CONFIG.defaultStyle;

  const channels = Array.isArray(src.channels)
    ? src.channels.map((c, idx) => sanitizeChannel(c, idx))
    : DEFAULT_SOCIAL_CONFIG.channels;

  return {
    enabled: src.enabled !== undefined ? Boolean(src.enabled) : DEFAULT_SOCIAL_CONFIG.enabled,
    title: String(src.title ?? DEFAULT_SOCIAL_CONFIG.title).trim().slice(0, 160),
    subtitle: String(src.subtitle ?? DEFAULT_SOCIAL_CONFIG.subtitle).trim().slice(0, 300),
    showDirectBuyNotice:
      src.showDirectBuyNotice !== undefined
        ? Boolean(src.showDirectBuyNotice)
        : DEFAULT_SOCIAL_CONFIG.showDirectBuyNotice,
    directBuyNotice: String(src.directBuyNotice ?? DEFAULT_SOCIAL_CONFIG.directBuyNotice)
      .trim()
      .slice(0, 320),
    autoUtm: src.autoUtm !== undefined ? Boolean(src.autoUtm) : DEFAULT_SOCIAL_CONFIG.autoUtm,
    showInFooter:
      src.showInFooter !== undefined ? Boolean(src.showInFooter) : DEFAULT_SOCIAL_CONFIG.showInFooter,
    showOnProductPage:
      src.showOnProductPage !== undefined
        ? Boolean(src.showOnProductPage)
        : DEFAULT_SOCIAL_CONFIG.showOnProductPage,
    defaultStyle: style,
    channels: channels.sort((a, b) => a.sort - b.sort),
  };
}

export const getSocialLinksConfig = cache(async (): Promise<SocialLinksConfig> => {
  const row = await one<{ value: string }>("SELECT value FROM settings WHERE key = ?", SETTINGS_KEY);
  if (!row?.value) return DEFAULT_SOCIAL_CONFIG;
  try {
    return normalizeSocialConfig(JSON.parse(row.value) as Partial<SocialLinksConfig>);
  } catch {
    return DEFAULT_SOCIAL_CONFIG;
  }
});

export async function saveSocialLinksConfig(next: Partial<SocialLinksConfig>): Promise<SocialLinksConfig> {
  const normalized = normalizeSocialConfig(next);
  await run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    SETTINGS_KEY,
    JSON.stringify(normalized),
  );
  return normalized;
}

export async function recordSocialClick(channelId: string): Promise<string | null> {
  const row = await one<{ value: string }>("SELECT value FROM settings WHERE key = ?", SETTINGS_KEY);
  let cfg = DEFAULT_SOCIAL_CONFIG;
  if (row?.value) {
    try {
      cfg = normalizeSocialConfig(JSON.parse(row.value) as Partial<SocialLinksConfig>);
    } catch {
      cfg = DEFAULT_SOCIAL_CONFIG;
    }
  }
  const ch = cfg.channels.find((c) => c.id === channelId && c.enabled);
  if (!ch) return null;
  const target = buildChannelOutboundUrl(ch, cfg.autoUtm);
  if (!target) return null;

  const updated: SocialLinksConfig = {
    ...cfg,
    channels: cfg.channels.map((c) => (c.id === channelId ? { ...c, clicks: c.clicks + 1 } : c)),
  };
  await run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    SETTINGS_KEY,
    JSON.stringify(updated),
  );
  return target;
}
