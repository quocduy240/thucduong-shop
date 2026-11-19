export type SocialPlatform =
  | "facebook"
  | "facebook_group"
  | "youtube"
  | "tiktok"
  | "zalo"
  | "instagram"
  | "shopee"
  | "lazada"
  | "tiktok_shop"
  | "tiki"
  | "website";

export type SocialGroup = "social" | "marketplace";
export type SocialStyle = "cards" | "pills" | "sidebar" | "icons";

export type SocialChannel = {
  id: string;
  platform: SocialPlatform;
  group: SocialGroup;
  name: string;
  handle: string;
  url: string;
  badge: string;
  ctaLabel: string;
  enabled: boolean;
  sort: number;
  clicks: number;
};

export type SocialLinksConfig = {
  enabled: boolean;
  title: string;
  subtitle: string;
  showDirectBuyNotice: boolean;
  directBuyNotice: string;
  autoUtm: boolean;
  showInFooter: boolean;
  showOnProductPage: boolean;
  defaultStyle: SocialStyle;
  channels: SocialChannel[];
};

export const PLATFORM_META: Record<
  SocialPlatform,
  {
    label: string;
    defaultGroup: SocialGroup;
    color: string;
    bg: string;
    border: string;
    defaultCta: string;
    svgPath: string;
  }
> = {
  facebook: {
    label: "Facebook Fanpage",
    defaultGroup: "social",
    color: "#1877F2",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    defaultCta: "Theo dõi Page",
    svgPath:
      "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  },
  facebook_group: {
    label: "Cộng đồng Facebook Group",
    defaultGroup: "social",
    color: "#1D4ED8",
    bg: "#EEF2FF",
    border: "#C7D2FE",
    defaultCta: "Tham gia nhóm",
    svgPath:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  },
  youtube: {
    label: "YouTube Channel",
    defaultGroup: "social",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    defaultCta: "Xem kênh YouTube",
    svgPath:
      "M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z M9.75 15.02V8.48l5.75 3.27-5.75 3.27z",
  },
  tiktok: {
    label: "TikTok",
    defaultGroup: "social",
    color: "#111827",
    bg: "#F3F4F6",
    border: "#D1D5DB",
    defaultCta: "Follow TikTok",
    svgPath:
      "M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5",
  },
  zalo: {
    label: "Zalo OA",
    defaultGroup: "social",
    color: "#0068FF",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    defaultCta: "Quan tâm Zalo OA",
    svgPath:
      "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  },
  instagram: {
    label: "Instagram",
    defaultGroup: "social",
    color: "#DB2777",
    bg: "#FDF2F8",
    border: "#FBCFE8",
    defaultCta: "Theo dõi IG",
    svgPath:
      "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01 M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z",
  },
  shopee: {
    label: "Shopee",
    defaultGroup: "marketplace",
    color: "#EE4D2D",
    bg: "#FFF7ED",
    border: "#FED7AA",
    defaultCta: "Mua trên Shopee",
    svgPath:
      "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  },
  lazada: {
    label: "Lazada",
    defaultGroup: "marketplace",
    color: "#0F146D",
    bg: "#EEF2FF",
    border: "#C7D2FE",
    defaultCta: "Mua trên Lazada",
    svgPath:
      "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M12 10v6 M9 13h6",
  },
  tiktok_shop: {
    label: "TikTok Shop",
    defaultGroup: "marketplace",
    color: "#0F172A",
    bg: "#F8FAFC",
    border: "#CBD5E1",
    defaultCta: "Mua TikTok Shop",
    svgPath:
      "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M9 14a3 3 0 1 0 3 3v-6a4 4 0 0 0 4 4",
  },
  tiki: {
    label: "Tiki",
    defaultGroup: "marketplace",
    color: "#1A94FF",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    defaultCta: "Mua trên Tiki",
    svgPath:
      "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M12 10v6",
  },
  website: {
    label: "Kênh / Link khác",
    defaultGroup: "social",
    color: "#15803D",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    defaultCta: "Truy cập",
    svgPath:
      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  },
};

export const DEFAULT_SOCIAL_CONFIG: SocialLinksConfig = {
  enabled: true,
  title: "Kết nối Cộng đồng & Gian hàng Chính hãng",
  subtitle: "Theo dõi video hướng dẫn Thực Dưỡng mỗi ngày hoặc đặt hàng qua các kênh chính thức của Phúc Thọ.",
  showDirectBuyNotice: true,
  directBuyNotice:
    "🎁 Mẹo tiết kiệm: Đặt trực tiếp tại Website để được tích điểm đổi quà, tư vấn Thực Dưỡng 1:1 & freeship nhanh hơn!",
  autoUtm: true,
  showInFooter: true,
  showOnProductPage: true,
  defaultStyle: "cards",
  channels: [
    {
      id: "fb-page",
      platform: "facebook",
      group: "social",
      name: "Facebook Fanpage Thực Dưỡng Phúc Thọ",
      handle: "@thucduongphuctho · Hỏi đáp mỗi ngày",
      url: "https://www.facebook.com/",
      badge: "Chính thức",
      ctaLabel: "Theo dõi Page",
      enabled: true,
      sort: 1,
      clicks: 0,
    },
    {
      id: "yt-channel",
      platform: "youtube",
      group: "social",
      name: "Kênh YouTube Thực Dưỡng Hiện Đại",
      handle: "Video bài giảng & hướng dẫn nấu ăn",
      url: "https://www.youtube.com/",
      badge: "Video mới",
      ctaLabel: "Xem kênh",
      enabled: true,
      sort: 2,
      clicks: 0,
    },
    {
      id: "zalo-oa",
      platform: "zalo",
      group: "social",
      name: "Zalo OA Tư Vấn 1:1",
      handle: "Nhắn tin nhận thực đơn & ưu đãi",
      url: "https://zalo.me/0767518592",
      badge: "Phản hồi nhanh",
      ctaLabel: "Nhắn Zalo",
      enabled: true,
      sort: 3,
      clicks: 0,
    },
    {
      id: "shopee-mall",
      platform: "shopee",
      group: "marketplace",
      name: "Gian hàng Shopee Chính Hãng",
      handle: "Đánh giá 4.9★ · Giao nhanh toàn quốc",
      url: "https://shopee.vn/",
      badge: "Chính hãng",
      ctaLabel: "Xem Shopee",
      enabled: false,
      sort: 4,
      clicks: 0,
    },
    {
      id: "lazada-shop",
      platform: "lazada",
      group: "marketplace",
      name: "Gian hàng Lazada Chính Hãng",
      handle: "Sản phẩm hữu cơ & thảo dược sạch",
      url: "https://www.lazada.vn/",
      badge: "Chính hãng",
      ctaLabel: "Xem Lazada",
      enabled: false,
      sort: 5,
      clicks: 0,
    },
  ],
};

export function escHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeSocialUrl(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    return "";
  } catch {
    return "";
  }
}

export function buildChannelOutboundUrl(ch: SocialChannel, autoUtm: boolean): string {
  const safe = safeSocialUrl(ch.url);
  if (!safe) return "";
  if (!autoUtm) return safe;
  try {
    const u = new URL(safe);
    if (!u.searchParams.has("utm_source")) u.searchParams.set("utm_source", "thucduongshop");
    if (!u.searchParams.has("utm_medium")) u.searchParams.set("utm_medium", "web_block");
    if (!u.searchParams.has("utm_campaign")) u.searchParams.set("utm_campaign", ch.platform);
    return u.toString();
  } catch {
    return safe;
  }
}

function svgIcon(platform: SocialPlatform, color: string, size = 18): string {
  const meta = PLATFORM_META[platform] || PLATFORM_META.website;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${escHtml(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;"><path d="${escHtml(meta.svgPath)}"/></svg>`;
}

export function renderSocialBlockHtml(
  config: SocialLinksConfig,
  opts: {
    style?: SocialStyle;
    group?: "all" | SocialGroup;
    dark?: boolean;
    trackClicks?: boolean;
    compactTitle?: boolean;
  } = {},
): string {
  if (!config.enabled) return "";
  const groupFilter = opts.group ?? "all";
  const style = opts.style ?? config.defaultStyle ?? "cards";
  const track = opts.trackClicks !== false;
  const dark = !!opts.dark;

  const active = [...config.channels]
    .filter((c) => c.enabled && safeSocialUrl(c.url) !== "")
    .filter((c) => groupFilter === "all" || c.group === groupFilter)
    .sort((a, b) => a.sort - b.sort);

  if (active.length === 0) return "";

  const hrefOf = (ch: SocialChannel) =>
    track ? `/go/social/${encodeURIComponent(ch.id)}` : buildChannelOutboundUrl(ch, config.autoUtm);

  const hasMarketplace = active.some((c) => c.group === "marketplace");

  if (style === "icons") {
    const iconsHtml = active
      .map((ch) => {
        const meta = PLATFORM_META[ch.platform] || PLATFORM_META.website;
        const href = escHtml(hrefOf(ch));
        const bg = dark ? "rgba(255,255,255,0.12)" : meta.bg;
        const border = dark ? "rgba(255,255,255,0.2)" : meta.border;
        const iconColor = dark ? "#ffffff" : meta.color;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow" title="${escHtml(ch.name)}" style="display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:9999px;background:${bg};border:1px solid ${border};color:${iconColor};text-decoration:none;font-size:12px;font-weight:700;">${svgIcon(ch.platform, iconColor, 15)}<span>${escHtml(meta.label.split(" ")[0])}</span></a>`;
      })
      .join("");
    return `<div class="td-social-block td-social-icons" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">${iconsHtml}</div>`;
  }

  if (style === "pills") {
    const pillsHtml = active
      .map((ch) => {
        const meta = PLATFORM_META[ch.platform] || PLATFORM_META.website;
        const href = escHtml(hrefOf(ch));
        return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow" style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:9999px;background:${meta.bg};border:1px solid ${meta.border};color:#111827;text-decoration:none;font-size:13px;font-weight:700;">${svgIcon(ch.platform, meta.color, 16)}<span>${escHtml(ch.name)}</span>${ch.badge ? `<span style="font-size:10px;padding:2px 7px;border-radius:9999px;background:${meta.color};color:#fff;">${escHtml(ch.badge)}</span>` : ""}</a>`;
      })
      .join("");
    const noticeHtml =
      config.showDirectBuyNotice && config.directBuyNotice && hasMarketplace
        ? `<div style="margin-top:10px;font-size:12px;color:#14532d;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:8px 12px;">${escHtml(config.directBuyNotice)}</div>`
        : "";
    return `<div class="td-social-block td-social-pills" style="margin:14px 0;padding:14px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">${config.title ? `<div style="font-size:14px;font-weight:800;color:#111827;margin-bottom:10px;">${escHtml(config.title)}</div>` : ""}<div style="display:flex;flex-wrap:wrap;gap:8px;">${pillsHtml}</div>${noticeHtml}</div>`;
  }

  if (style === "sidebar") {
    const itemsHtml = active
      .map((ch) => {
        const meta = PLATFORM_META[ch.platform] || PLATFORM_META.website;
        const href = escHtml(hrefOf(ch));
        return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow" style="display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:12px;border:1px solid ${meta.border};background:${meta.bg};text-decoration:none;color:#111827;">
          <span style="display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:#ffffff;flex-shrink:0;">${svgIcon(ch.platform, meta.color, 17)}</span>
          <span style="min-width:0;flex:1;">
            <span style="display:block;font-size:12px;font-weight:800;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(ch.name)}</span>
            ${ch.handle ? `<span style="display:block;font-size:11px;color:#4b5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(ch.handle)}</span>` : ""}
          </span>
          <span style="font-size:11px;font-weight:700;color:${meta.color};flex-shrink:0;">→</span>
        </a>`;
      })
      .join("");
    return `<div class="td-social-block td-social-sidebar" style="border:1px solid #e5e7eb;border-radius:16px;background:#ffffff;padding:14px;">
      ${config.title ? `<div style="font-size:14px;font-weight:800;color:#111827;margin-bottom:10px;">${escHtml(config.title)}</div>` : ""}
      <div style="display:flex;flex-direction:column;gap:8px;">${itemsHtml}</div>
    </div>`;
  }

  // Default: "cards"
  const cardsHtml = active
    .map((ch) => {
      const meta = PLATFORM_META[ch.platform] || PLATFORM_META.website;
      const href = escHtml(hrefOf(ch));
      const cta = ch.ctaLabel || meta.defaultCta;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow" style="display:flex;flex-direction:column;justify-content:space-between;gap:10px;padding:14px;border-radius:14px;border:1px solid ${meta.border};background:${meta.bg};text-decoration:none;color:#111827;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
          <span style="display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:#ffffff;border:1px solid ${meta.border};flex-shrink:0;">${svgIcon(ch.platform, meta.color, 19)}</span>
          ${ch.badge ? `<span style="font-size:10px;font-weight:800;padding:3px 8px;border-radius:9999px;background:#ffffff;color:${meta.color};border:1px solid ${meta.border};">${escHtml(ch.badge)}</span>` : ""}
        </div>
        <div>
          <div style="font-size:13px;font-weight:800;color:#111827;line-height:1.35;">${escHtml(ch.name)}</div>
          ${ch.handle ? `<div style="margin-top:3px;font-size:11px;color:#4b5563;line-height:1.35;">${escHtml(ch.handle)}</div>` : ""}
        </div>
        <div style="font-size:12px;font-weight:800;color:${meta.color};">${escHtml(cta)} ↗</div>
      </a>`;
    })
    .join("");

  const noticeHtml =
    config.showDirectBuyNotice && config.directBuyNotice && hasMarketplace
      ? `<div style="margin-top:12px;font-size:12px;line-height:1.5;color:#14532d;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:10px 14px;">${escHtml(config.directBuyNotice)}</div>`
      : "";

  return `<section class="td-social-block td-social-cards" style="margin:18px 0;padding:18px;border-radius:18px;border:1px solid #bbf7d0;background:linear-gradient(180deg,#f0fdf4 0%,#ffffff 100%);">
    ${!opts.compactTitle && config.title ? `<div style="font-size:16px;font-weight:800;color:#14532d;">${escHtml(config.title)}</div>` : ""}
    ${!opts.compactTitle && config.subtitle ? `<div style="margin-top:4px;font-size:13px;color:#4b5563;">${escHtml(config.subtitle)}</div>` : ""}
    <div style="margin-top:${opts.compactTitle ? "0" : "14px"};display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">${cardsHtml}</div>
    ${noticeHtml}
  </section>`;
}
