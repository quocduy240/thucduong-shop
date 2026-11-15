import "server-only";
import { all, run } from "./db";
import { site as defaults } from "./site";

export type SiteSettings = typeof defaults;
export const SETTING_KEYS = Object.keys(defaults) as (keyof SiteSettings)[];

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
