import "server-only";
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

/** Brand settings: defaults from lib/site.ts overridden by rows in the `settings` table (edited in /admin/settings/). */
export function getSite(): SiteSettings {
  const out: SiteSettings = { ...defaults };
  for (const r of all<{ key: string; value: string }>("SELECT key, value FROM settings")) {
    if (r.key in out) (out as Record<string, string>)[r.key] = r.value;
  }
  return out;
}

export function saveSite(values: Partial<SiteSettings>) {
  for (const k of SETTING_KEYS) {
    const v = values[k];
    if (typeof v === "string") {
      run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", k, v);
    }
  }
}

export function getMailSettings(): MailSettings {
  const out: MailSettings = { ...mailDefaults };
  for (const r of all<{ key: string; value: string }>("SELECT key, value FROM settings")) {
    if (r.key in out) (out as Record<string, string>)[r.key] = r.value;
  }
  if (!out.order_notify_email.trim()) out.order_notify_email = mailDefaults.order_notify_email;
  return out;
}

export function saveMailSettings(values: Partial<MailSettings>) {
  for (const k of MAIL_KEYS) {
    const v = values[k];
    if (typeof v === "string") {
      run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", k, v);
    }
  }
}
