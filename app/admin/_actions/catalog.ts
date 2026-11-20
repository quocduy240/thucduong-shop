"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { batch, one, run } from "@/lib/db";
import { logWarn } from "@/lib/logger";
import { ADMIN_ACTION_ROLES } from "@/lib/rbac";
import { ensureSeoColumns } from "@/lib/seo";
import { saveImage, slugify } from "@/lib/uploads";
import { back, num, refresh, str, uploaded } from "./shared";

export async function saveProductAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.catalog_write);
  const id = num(formData, "id");
  const here = `/admin/products/${id || "new"}/`;
  const name = str(formData, "name");
  if (!name) back(here, "Vui lòng nhập tên sản phẩm.");
  const slug = slugify(str(formData, "slug") || name);
  if (!slug) back(here, "Đường dẫn (slug) không hợp lệ.");
  const price = num(formData, "price");
  if (price < 0) back(here, "Giá không hợp lệ.");
  const salePrice = str(formData, "sale_price") ? num(formData, "sale_price") : null;
  if (salePrice !== null && (salePrice <= 0 || salePrice >= price)) back(here, "Giá khuyến mãi phải nhỏ hơn giá gốc.");
  const stock = str(formData, "stock") !== "" ? Math.max(0, num(formData, "stock")) : 100;
  const categoryId = num(formData, "category_id");
  if (!(await one("SELECT 1 AS x FROM product_categories WHERE id = ?", categoryId))) back(here, "Chọn danh mục.");

  let image: string | null = str(formData, "image") || null;
  if (str(formData, "remove_image") === "1") image = null;
  const file = uploaded(formData, "image_file");
  if (file) {
    try {
      image = await saveImage(file, "products");
    } catch (e) {
      back(here, (e as Error).message);
    }
  }

  const featured = str(formData, "featured") === "1" ? 1 : 0;
  const isPublished = str(formData, "is_published") === "1" ? 1 : 0;
  const sku = str(formData, "sku");
  const brand = str(formData, "brand");
  const origin = str(formData, "origin");
  const unit = str(formData, "unit");
  const videoUrl = str(formData, "video_url");
  const seoTitle = str(formData, "seo_title");
  const seoDescription = str(formData, "seo_description");
  const seoKeywords = str(formData, "seo_keywords");

  const galleryList = String(formData.get("gallery") ?? "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const entry of formData.getAll("gallery_files")) {
    if (entry instanceof File && entry.size > 0) {
      try {
        galleryList.push(await saveImage(entry, "products"));
      } catch (e) {
        back(here, (e as Error).message);
      }
    }
  }
  const gallery = galleryList.join("\n");

  try {
    await ensureSeoColumns();
    if (id) {
      await run(
        `UPDATE products SET name=?, slug=?, category_id=?, price=?, sale_price=?, stock=?, summary=?, description=?, image=?, featured=?, is_published=?,
         sku=?, brand=?, origin=?, unit=?, gallery=?, video_url=?, seo_title=?, seo_description=?, seo_keywords=? WHERE id=?`,
        name, slug, categoryId, price, salePrice, stock, str(formData, "summary"), String(formData.get("description") ?? ""), image, featured, isPublished,
        sku, brand, origin, unit, gallery, videoUrl, seoTitle, seoDescription, seoKeywords, id,
      );
    } else {
      await run(
        `INSERT INTO products (name, slug, category_id, price, sale_price, stock, summary, description, image, featured, is_published, sku, brand, origin, unit, gallery, video_url, seo_title, seo_description, seo_keywords)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        name, slug, categoryId, price, salePrice, stock, str(formData, "summary"), String(formData.get("description") ?? ""), image, featured, isPublished,
        sku, brand, origin, unit, gallery, videoUrl, seoTitle, seoDescription, seoKeywords,
      );
    }
  } catch (e) {
    if (String(e).includes("UNIQUE")) back(here, "Đường dẫn (slug) đã được dùng cho sản phẩm khác.");
    throw e;
  }
  refresh();
  redirect("/admin/products/?saved=1");
}

export async function updateProductStockAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  const id = num(formData, "id");
  const stock = Math.max(0, num(formData, "stock"));
  await run("UPDATE products SET stock = ? WHERE id = ?", stock, id);
  refresh();
  const returnTo = str(formData, "return_to");
  redirect(returnTo && returnTo.startsWith("/admin/products") ? returnTo : "/admin/products/?saved=1");
}

/** Bulk: move to category and/or publish/hide the selected products. */
export async function bulkProductsAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.catalog_delete);
  const ids = formData.getAll("ids").map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);
  const returnTo = str(formData, "return_to");
  const dest = returnTo.startsWith("/admin/products") ? returnTo : "/admin/products/";
  if (!ids.length) back("/admin/products/", "Chưa chọn sản phẩm nào.");
  const marks = ids.map(() => "?").join(",");
  const categoryId = num(formData, "category_id");
  if (categoryId) {
    if (!(await one("SELECT 1 AS x FROM product_categories WHERE id = ?", categoryId))) back("/admin/products/", "Danh mục không hợp lệ.");
    await run(`UPDATE products SET category_id = ? WHERE id IN (${marks})`, categoryId, ...ids);
  }
  const visibility = str(formData, "visibility");
  if (visibility === "publish" || visibility === "hide") {
    await run(`UPDATE products SET is_published = ? WHERE id IN (${marks})`, visibility === "publish" ? 1 : 0, ...ids);
  }
  refresh();
  redirect(dest.includes("?") ? dest + "&saved=1" : dest + "?saved=1");
}

export async function deleteProductAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.catalog_delete);
  const id = num(formData, "id");
  await batch([
    { sql: "DELETE FROM comments WHERE product_id = ?", params: [id] },
    { sql: "DELETE FROM products WHERE id = ?", params: [id] },
  ]);
  logWarn("admin.product_deleted", { productId: id, actor: admin.email });
  refresh();
  redirect("/admin/products/?saved=1");
}

export async function saveProductCategoryAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_write);
  const id = num(formData, "id");
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  if (!name || !slug) back("/admin/categories/", "Nhập tên danh mục.");
  const hasSort = str(formData, "sort") !== "";
  const showInMenu = formData.get("show_in_menu") === "1" ? 1 : 0;
  const showInHome = formData.get("show_in_home") === "1" ? 1 : 0;
  const showInFooter = formData.get("show_in_footer") === "1" ? 1 : 0;
  const isActive = formData.get("is_active") === "0" ? 0 : 1;
  const seoTitle = str(formData, "seo_title");
  const description = str(formData, "description");
  try {
    if (id) {
      await run(
        `UPDATE product_categories
         SET name = ?, slug = ?, sort = ?, show_in_menu = ?, show_in_home = ?, show_in_footer = ?, is_active = ?, seo_title = ?, description = ?
         WHERE id = ?`,
        name, slug, num(formData, "sort"), showInMenu, showInHome, showInFooter, isActive, seoTitle, description, id,
      );
    } else {
      const next = (await one<{ n: number }>("SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM product_categories"))!.n;
      await run(
        `INSERT INTO product_categories (name, slug, sort, show_in_menu, show_in_home, show_in_footer, is_active, seo_title, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        name, slug, hasSort ? num(formData, "sort") : next, showInMenu, showInHome, showInFooter, isActive, seoTitle, description,
      );
    }
  } catch (e) {
    if (String(e).includes("UNIQUE")) back("/admin/categories/", "Đường dẫn đã được dùng cho danh mục khác.");
    throw e;
  }
  refresh();
  redirect("/admin/categories/?saved=1");
}

export async function deleteProductCategoryAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.catalog_delete);
  const id = num(formData, "id");
  const targetRaw = str(formData, "target_category_id");
  const productCountRow = await one<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM products WHERE category_id = ?", id);
  const hasProducts = (productCountRow?.cnt ?? 0) > 0;

  if (hasProducts) {
    let targetId = Number(targetRaw);
    if (targetId === -1) {
      const existing = await one<{ id: number }>("SELECT id FROM product_categories WHERE slug = 'chua-phan-loai'");
      if (existing) {
        targetId = existing.id;
      } else {
        const created = await run(
          "INSERT INTO product_categories (slug, name, sort) VALUES ('chua-phan-loai', 'Chưa phân loại (?)', 999)",
        );
        targetId = Number(created.lastInsertRowid);
      }
    }
    if (!targetId || targetId === id || !(await one("SELECT 1 AS x FROM product_categories WHERE id = ?", targetId))) {
      back("/admin/categories/", "Vui lòng chọn danh mục đích hợp lệ để chuyển sản phẩm trước khi xoá.");
    }
    await run("UPDATE products SET category_id = ? WHERE category_id = ?", targetId, id);
    await run("UPDATE product_import_jobs SET target_category_id = ? WHERE target_category_id = ?", targetId, id).catch(() => {});
  }

  await run("DELETE FROM product_categories WHERE id = ?", id);
  refresh();
  redirect("/admin/categories/?saved=1");
}
