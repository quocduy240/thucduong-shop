import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { CACHE_TAGS, invalidateStorefront } from "./cache-tags";
import { all, run } from "./db";
import { site as defaults } from "./site";

export type SiteSettings = typeof defaults;
export const SETTING_KEYS = Object.keys(defaults) as (keyof SiteSettings)[];

export const mailDefaults = {
  order_notify_email: "agvinh@gmail.com",
  smtp_host: "smtp.gmail.com",
  smtp_port: "465",
  smtp_user: "",
  smtp_pass: "",
};
export type MailSettings = typeof mailDefaults;
export const MAIL_KEYS = Object.keys(mailDefaults) as (keyof MailSettings)[];

export const widgetDefaults = {
  widget_enabled: "1",
  widget_zalo: "0767518592",
  widget_messenger: "https://m.me/thucduongphuctho",
  widget_hotline: "0767.518.592",
  widget_hotline_2: "0858.816.070",
  widget_consultant_email: "",
  widget_quick_ask_title: "Tư vấn Thực Dưỡng 1:1",
  widget_quick_ask_subtitle: "Để lại SĐT & câu hỏi, chuyên viên Thực Dưỡng Phúc Thọ sẽ gọi lại tư vấn miễn phí!",
};
export type WidgetSettings = typeof widgetDefaults;
export const WIDGET_KEYS = Object.keys(widgetDefaults) as (keyof WidgetSettings)[];

const cachedSettingsRows = unstable_cache(
  async () => all<{ key: string; value: string }>("SELECT key, value FROM settings"),
  ["storefront-settings-rows"],
  { revalidate: 60, tags: [CACHE_TAGS.site] },
);

/** Request-scoped + KV/Edge tagged cache: load all settings rows efficiently. */
const loadSettingsRows = cache(async () => {
  try {
    return await cachedSettingsRows();
  } catch {
    return all<{ key: string; value: string }>("SELECT key, value FROM settings");
  }
});

/** Brand settings: defaults from lib/site.ts overridden by rows in the `settings` table (edited in /admin/settings/). */
export const getSite = cache(async (): Promise<SiteSettings> => {
  const out: SiteSettings = { ...defaults };
  const rows = await loadSettingsRows();
  for (const r of rows) {
    if (r.key in out) (out as Record<string, string>)[r.key] = r.value;
  }
  return out;
});

export async function saveSite(values: Partial<SiteSettings>) {
  for (const k of SETTING_KEYS) {
    const v = values[k];
    if (typeof v === "string") {
      await run(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        k,
        v,
      );
    }
  }
  invalidateStorefront(CACHE_TAGS.site);
}

export const getMailSettings = cache(async (): Promise<MailSettings> => {
  const out: MailSettings = { ...mailDefaults };
  const rows = await loadSettingsRows();
  for (const r of rows) {
    if (r.key in out) (out as Record<string, string>)[r.key] = r.value;
  }
  if (!out.order_notify_email.trim()) out.order_notify_email = mailDefaults.order_notify_email;
  return out;
});

export async function saveMailSettings(values: Partial<MailSettings>) {
  for (const k of MAIL_KEYS) {
    const v = values[k];
    if (typeof v === "string") {
      await run(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        k,
        v,
      );
    }
  }
  invalidateStorefront(CACHE_TAGS.site);
}

export const getWidgetSettings = cache(async (): Promise<WidgetSettings> => {
  const out: WidgetSettings = { ...widgetDefaults };
  const rows = await loadSettingsRows();
  for (const r of rows) {
    if (r.key in out) (out as Record<string, string>)[r.key] = r.value;
  }
  return out;
});

export async function saveWidgetSettings(values: Partial<WidgetSettings>) {
  for (const k of WIDGET_KEYS) {
    const v = values[k];
    if (typeof v === "string") {
      await run(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        k,
        v,
      );
    }
  }
  invalidateStorefront(CACHE_TAGS.site);
}
