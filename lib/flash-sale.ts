import "server-only";
import { all, one, run } from "./db";

export type FlashSaleConfig = {
  enabled: boolean;
  mode: "auto_24h" | "strict_slots";
  title: string;
  subtitle: string;
  autoResetDaily: boolean;
  auto_reset_daily: boolean;
  last_reset_date: string;
};

export type FlashSaleSlot = {
  id: number;
  name: string;
  start_hour: number;
  end_hour: number;
  discount_pct: number;
  auto_rotate: number;
  active: number;
};

export type FlashSaleItem = {
  id: number;
  slot_id: number;
  product_id: number;
  flash_price: number;
  quota: number;
  sold: number;
  gift_note: string;
  active: number;
  sort: number;
  product_name: string;
  product_slug: string;
  category_slug: string;
  category_name: string;
  original_price: number;
  sale_price: number | null;
  stock: number;
  product_stock: number;
  image: string | null;
  product_image: string | null;
  brand: string;
  unit: string;
};

/** Current hour (0..23) in Vietnam timezone (UTC+7). */
export function getVietnamHour(): number {
  const vnTime = new Date(Date.now() + 7 * 3600 * 1000);
  return vnTime.getUTCHours();
}

export function getVietnamDateStr(): string {
  const vnTime = new Date(Date.now() + 7 * 3600 * 1000);
  return vnTime.toISOString().slice(0, 10);
}

export async function getFlashSaleConfig(): Promise<FlashSaleConfig> {
  const rows = await all<{ key: string; value: string }>(
    "SELECT key, value FROM settings WHERE key LIKE 'flash_sale_%'",
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const enabled = (map.get("flash_sale_enabled") ?? "1") !== "0";
  const mode = map.get("flash_sale_mode") === "strict_slots" ? "strict_slots" : "auto_24h";
  const title =
    map.get("flash_sale_title") || "⚡ Giờ Vàng Săn Sale — Ưu Đãi Thực Dưỡng Mỗi Ngày";
  const subtitle =
    map.get("flash_sale_subtitle") ||
    "Giảm trực tiếp 10% – 20% khi đặt mua tại website trong khung giờ vàng (11:00–14:00 & 19:00–22:00)";
  const autoResetDaily = (map.get("flash_sale_auto_reset_daily") ?? "1") !== "0";

  // Daily automatic quota reset if a new day has started in Vietnam time
  const today = getVietnamDateStr();
  const lastReset = map.get("flash_sale_last_reset_date") ?? "";
  if (autoResetDaily && lastReset !== today) {
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('flash_sale_last_reset_date', ?)", today);
    await run("UPDATE flash_sale_items SET sold = MIN(quota - 2, (id * 3) % 8 + 4) WHERE active = 1");
  }

  return {
    enabled,
    mode,
    title,
    subtitle,
    autoResetDaily,
    auto_reset_daily: autoResetDaily,
    last_reset_date: today,
  };
}

export async function getFlashSaleSlots(): Promise<FlashSaleSlot[]> {
  return all<FlashSaleSlot>(
    "SELECT id, name, start_hour, end_hour, discount_pct, auto_rotate, active FROM flash_sale_slots ORDER BY start_hour ASC, id ASC",
  );
}

export async function getFlashSaleItems(onlyActive = true): Promise<FlashSaleItem[]> {
  return all<FlashSaleItem>(
    `SELECT f.id, f.slot_id, f.product_id, f.flash_price, f.quota, f.sold, f.gift_note, f.active, f.sort,
            p.name AS product_name, p.slug AS product_slug, c.slug AS category_slug, c.name AS category_name,
            p.price AS original_price, p.sale_price, p.stock, p.stock AS product_stock,
            p.image, p.image AS product_image, p.brand, p.unit
     FROM flash_sale_items f
     JOIN products p ON p.id = f.product_id
     JOIN product_categories c ON c.id = p.category_id
     ${onlyActive ? "WHERE f.active = 1 AND p.stock > 0 AND COALESCE(p.is_published, 1) = 1" : ""}
     ORDER BY f.sort ASC, f.id ASC`,
  );
}

export async function getFlashSaleDashboard() {
  const [config, allSlots, items] = await Promise.all([
    getFlashSaleConfig(),
    getFlashSaleSlots(),
    getFlashSaleItems(true),
  ]);
  const rawSlots = allSlots.filter((s) => s.active === 1);
  const currentHour = getVietnamHour();

  let activeSlot = rawSlots.find((s) => currentHour >= s.start_hour && currentHour < s.end_hour);
  if (!activeSlot && config.mode === "auto_24h" && rawSlots.length > 0) {
    activeSlot = rawSlots.find((s) => s.start_hour > currentHour) ?? rawSlots[0];
  }

  const slots = rawSlots.map((s) => {
    const status: "active" | "upcoming" | "ended" =
      activeSlot && s.id === activeSlot.id
        ? "active"
        : s.start_hour > currentHour
          ? "upcoming"
          : "ended";
    const slotItems = items.filter((it) => it.slot_id === s.id);
    return {
      ...s,
      status,
      items: slotItems.length > 0 ? slotItems : items.slice(0, 4),
    };
  });

  // Compute countdownTargetIso to end of activeSlot (or +3 hours fallback)
  const now = new Date();
  const endHour = activeSlot?.end_hour ?? currentHour + 3;
  const hoursRemaining = endHour > currentHour ? endHour - currentHour : 2;
  const targetMs =
    now.getTime() +
    hoursRemaining * 3600 * 1000 -
    now.getUTCMinutes() * 60 * 1000 -
    now.getUTCSeconds() * 1000;
  const countdownTargetIso = new Date(Math.max(now.getTime() + 1800 * 1000, targetMs)).toISOString();

  return {
    config,
    slots,
    items,
    activeSlot: activeSlot ?? null,
    currentHour,
    countdownTargetIso,
  };
}

/**
 * Check if a product has an active Flash Sale price right now.
 */
export async function getProductFlashSale(
  productId: number,
): Promise<(FlashSaleItem & { slot_name: string; end_hour: number }) | undefined> {
  const { config, slots, activeSlot } = await getFlashSaleDashboard();
  if (!config.enabled) return undefined;

  const item = await one<FlashSaleItem>(
    `SELECT f.id, f.slot_id, f.product_id, f.flash_price, f.quota, f.sold, f.gift_note, f.active, f.sort,
            p.name AS product_name, p.slug AS product_slug, c.slug AS category_slug, c.name AS category_name,
            p.price AS original_price, p.sale_price, p.stock, p.stock AS product_stock,
            p.image, p.image AS product_image, p.brand, p.unit
     FROM flash_sale_items f
     JOIN products p ON p.id = f.product_id
     JOIN product_categories c ON c.id = p.category_id
     WHERE f.product_id = ? AND f.active = 1 AND f.sold < f.quota AND p.stock > 0 AND COALESCE(p.is_published, 1) = 1
     ORDER BY f.flash_price ASC LIMIT 1`,
    productId,
  );
  if (!item) return undefined;

  const slot = slots.find((s) => s.id === item.slot_id) ?? activeSlot;
  if (config.mode === "strict_slots" && item.slot_id !== 0) {
    const h = getVietnamHour();
    if (!slot || h < slot.start_hour || h >= slot.end_hour) return undefined;
  }

  return {
    ...item,
    slot_name: slot?.name ?? "Giờ Vàng Săn Sale",
    end_hour: slot?.end_hour ?? 24,
  };
}
