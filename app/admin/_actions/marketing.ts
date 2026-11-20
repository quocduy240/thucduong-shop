"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { all, one, run } from "@/lib/db";
import { ADMIN_ACTION_ROLES } from "@/lib/rbac";
import { slugify } from "@/lib/uploads";
import { back, num, refresh, str } from "./shared";

// ---- Dynamic QR Code & QR_Block ----
export async function saveQrAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_write);
  const id = num(formData, "id");
  const here = `/admin/qr/${id || "new"}/`;
  const name = str(formData, "name");
  if (!name) back(here, "Vui lòng nhập Tên riêng cho mã QR.");
  const slug = slugify(str(formData, "slug") || name);
  if (!slug) back(here, "Mã định danh (slug) không hợp lệ.");
  const targetUrl = str(formData, "target_url");
  if (!targetUrl) back(here, "Vui lòng nhập Link đích khi quét mã QR.");

  const caption = str(formData, "caption");
  const fgColor = str(formData, "fg_color") || "#14532d";
  const bgColor = str(formData, "bg_color") || "#ffffff";
  const styleVariant = str(formData, "style_variant") || "emerald";
  const selectedPositions = formData.getAll("positions").map((x) => String(x).trim()).filter(Boolean);
  const positions = selectedPositions.length > 0 ? selectedPositions.join(",") : "manual";
  const targetPosts = formData.getAll("target_post_ids").map((x) => String(x).trim()).filter(Boolean).join(",");
  const targetProducts = formData.getAll("target_product_ids").map((x) => String(x).trim()).filter(Boolean).join(",");
  const active = str(formData, "active") === "0" ? 0 : 1;
  const sort = num(formData, "sort") || 1;

  try {
    if (id) {
      await run(
        `UPDATE qr_codes SET
          slug=?, name=?, target_url=?, caption=?, fg_color=?, bg_color=?, style_variant=?,
          positions=?, target_post_ids=?, target_product_ids=?, active=?, sort=?
         WHERE id=?`,
        slug, name, targetUrl, caption, fgColor, bgColor, styleVariant,
        positions, targetPosts, targetProducts, active, sort, id,
      );
    } else {
      await run(
        `INSERT INTO qr_codes (
          slug, name, target_url, caption, fg_color, bg_color, style_variant,
          positions, target_post_ids, target_product_ids, active, sort
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        slug, name, targetUrl, caption, fgColor, bgColor, styleVariant,
        positions, targetPosts, targetProducts, active, sort,
      );
    }
  } catch (e) {
    if (String(e).includes("UNIQUE")) back(here, "Mã định danh (slug) này đã được dùng cho một QR khác.");
    throw e;
  }
  refresh();
  redirect("/admin/qr/?saved=1");
}

export async function updateQrUrlQuickAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_write);
  const id = num(formData, "id");
  const targetUrl = str(formData, "target_url");
  if (!targetUrl) back("/admin/qr/", "Link đích không được để trống.");
  await run("UPDATE qr_codes SET target_url = ? WHERE id = ?", targetUrl, id);
  refresh();
  redirect("/admin/qr/?saved=1");
}

export async function toggleQrAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_write);
  const id = num(formData, "id");
  const active = num(formData, "active") ? 1 : 0;
  await run("UPDATE qr_codes SET active = ? WHERE id = ?", active, id);
  refresh();
  redirect("/admin/qr/?saved=1");
}

export async function deleteQrAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_delete);
  await run("DELETE FROM qr_codes WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/qr/?saved=1");
}

// ---- Giờ vàng săn sale (Flash Sale) ----
export async function saveFlashSaleConfigAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.flash_sale);
  const enabled = str(formData, "enabled") === "1" ? "1" : "0";
  const mode = str(formData, "mode") === "strict_slots" ? "strict_slots" : "auto_24h";
  const title = str(formData, "title") || "⚡ GIỜ VÀNG SĂN SALE THỰC DƯỠNG";
  const subtitle = str(formData, "subtitle") || "Ưu đãi trực tiếp 10% - 20% trên website theo khung giờ vàng mỗi ngày";
  const autoReset = str(formData, "auto_reset_daily") === "1" ? "1" : "0";

  const pairs: [string, string][] = [
    ["flash_sale_enabled", enabled],
    ["flash_sale_mode", mode],
    ["flash_sale_title", title],
    ["flash_sale_subtitle", subtitle],
    ["flash_sale_auto_reset_daily", autoReset],
  ];
  for (const [k, v] of pairs) {
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", k, v);
  }
  refresh();
  redirect("/admin/flash-sale/?tab=config&saved=1");
}

export async function saveFlashSaleSlotAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.flash_sale);
  const id = num(formData, "id");
  const name = str(formData, "name") || "Khung Giờ Vàng";
  const startHour = Math.max(0, Math.min(23, num(formData, "start_hour")));
  const endHour = Math.max(startHour + 1, Math.min(24, num(formData, "end_hour") || 24));
  const discountPct = Math.max(1, Math.min(90, num(formData, "discount_pct") || 15));
  const autoRotate = str(formData, "auto_rotate") === "1" ? 1 : 0;
  const active = str(formData, "active") === "0" ? 0 : 1;

  if (id) {
    await run(
      "UPDATE flash_sale_slots SET name=?, start_hour=?, end_hour=?, discount_pct=?, auto_rotate=?, active=? WHERE id=?",
      name, startHour, endHour, discountPct, autoRotate, active, id,
    );
  } else {
    await run(
      "INSERT INTO flash_sale_slots (name, start_hour, end_hour, discount_pct, auto_rotate, active) VALUES (?, ?, ?, ?, ?, ?)",
      name, startHour, endHour, discountPct, autoRotate, active,
    );
  }
  refresh();
  redirect("/admin/flash-sale/?tab=slots&saved=1");
}

export async function deleteFlashSaleSlotAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.flash_sale);
  const id = num(formData, "id");
  await run("DELETE FROM flash_sale_items WHERE slot_id = ?", id);
  await run("DELETE FROM flash_sale_slots WHERE id = ?", id);
  refresh();
  redirect("/admin/flash-sale/?tab=slots&saved=1");
}

export async function saveFlashSaleItemAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.flash_sale);
  const id = num(formData, "id");
  const slotId = num(formData, "slot_id");
  const productId = num(formData, "product_id");
  if (!slotId || !productId) back("/admin/flash-sale/", "Vui lòng chọn khung giờ và sản phẩm.");

  const product = await one<{ price: number; sale_price: number | null }>("SELECT price, sale_price FROM products WHERE id = ?", productId);
  const slot = await one<{ discount_pct: number }>("SELECT discount_pct FROM flash_sale_slots WHERE id = ?", slotId);
  const basePrice = product ? (product.sale_price && product.sale_price > 0 ? product.sale_price : product.price) : 100000;
  const pct = slot?.discount_pct ?? 15;
  const autoPrice = Math.max(1000, Math.round((basePrice * (100 - pct)) / 1000) * 1000);

  const flashPrice = num(formData, "flash_price") || autoPrice;
  const quota = Math.max(1, num(formData, "quota") || 20);
  const sold = Math.max(0, Math.min(quota, num(formData, "sold")));
  const giftNote = str(formData, "gift_note");
  const active = str(formData, "active") === "0" ? 0 : 1;
  const sort = num(formData, "sort");

  if (id) {
    await run(
      "UPDATE flash_sale_items SET slot_id=?, product_id=?, flash_price=?, quota=?, sold=?, gift_note=?, active=?, sort=? WHERE id=?",
      slotId, productId, flashPrice, quota, sold, giftNote, active, sort, id,
    );
  } else {
    await run(
      "INSERT INTO flash_sale_items (slot_id, product_id, flash_price, quota, sold, gift_note, active, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      slotId, productId, flashPrice, quota, sold, giftNote, active, sort,
    );
  }
  refresh();
  redirect("/admin/flash-sale/?saved=1");
}

export async function deleteFlashSaleItemAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.flash_sale);
  await run("DELETE FROM flash_sale_items WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/flash-sale/?saved=1");
}

export async function autoGenerateFlashSaleAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.flash_sale);
  const discountPct = Math.max(5, Math.min(50, num(formData, "discount_pct") || 15));
  const quota = Math.max(5, num(formData, "quota") || 20);
  const replaceExisting = str(formData, "replace_existing") === "1";

  const slots = await all<{ id: number; discount_pct: number }>("SELECT id, discount_pct FROM flash_sale_slots WHERE active = 1 ORDER BY start_hour ASC");
  const products = await all<{ id: number; price: number; sale_price: number | null }>(
    "SELECT id, price, sale_price FROM products WHERE price > 0 AND stock > 0 ORDER BY featured DESC, id ASC LIMIT 24",
  );

  if (slots.length > 0 && products.length > 0) {
    if (replaceExisting) {
      await run("DELETE FROM flash_sale_items");
    }
    const gifts = [
      "Tặng kèm Cẩm nang 36 món ăn thực dưỡng PDF",
      "Tặng kèm Muối mè dưỡng sinh dùng thử",
      "Miễn phí tư vấn thực đơn quân bình Âm Dương",
      "Tặng gói Trà Bancha 3 năm thanh lọc",
    ];
    let pIdx = 0;
    for (const s of slots) {
      const pct = discountPct || s.discount_pct || 15;
      for (let k = 0; k < 4; k++) {
        const p = products[pIdx % products.length];
        pIdx++;
        const base = p.sale_price && p.sale_price > 0 ? p.sale_price : p.price;
        const fPrice = Math.max(1000, Math.round((base * (100 - pct)) / 1000) * 1000);
        const initSold = Math.min(quota - 2, 3 + ((p.id + k) % 6));
        const exists = await one("SELECT id FROM flash_sale_items WHERE slot_id = ? AND product_id = ?", s.id, p.id);
        if (!exists) {
          await run(
            "INSERT INTO flash_sale_items (slot_id, product_id, flash_price, quota, sold, gift_note, active, sort) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
            s.id, p.id, fPrice, quota, initSold, gifts[(pIdx + k) % gifts.length], k + 1,
          );
        }
      }
    }
  }
  refresh();
  redirect("/admin/flash-sale/?saved=1");
}
