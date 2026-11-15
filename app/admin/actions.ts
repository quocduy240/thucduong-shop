"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  checkPassword, createAdmin, currentToken, endSession, hasAdmin, removeAdmin, requireAdmin, setPassword,
  startSession, verifyLogin,
} from "@/lib/auth";
import { isOrderStatus } from "@/lib/admin-data";
import { db, one, run } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { getSite, MAIL_KEYS, saveMailSettings, saveSite, SETTING_KEYS } from "@/lib/settings";
import { saveImage, slugify } from "@/lib/uploads";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const n = Math.round(Number(str(f, k).replace(/[^\d.-]/g, "")));
  return Number.isFinite(n) ? n : 0;
};
const uploaded = (f: FormData, k: string) => {
  const v = f.get(k);
  return v instanceof File && v.size > 0 ? v : undefined;
};
const back = (path: string, error: string): never => redirect(`${path}?error=${encodeURIComponent(error)}`);
const refresh = () => revalidatePath("/", "layout");

// ---- Auth ----
export async function loginAction(formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  const id = verifyLogin(email, str(formData, "password"));
  if (!id) back("/admin/", "Sai email hoặc mật khẩu.");
  await startSession(id!);
  redirect("/admin/");
}

/** Creates the very first admin; refuses once any admin exists. */
export async function setupAction(formData: FormData) {
  if (hasAdmin()) redirect("/admin/");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  if (!/^\S+@\S+\.\S+$/.test(email)) back("/admin/", "Email không hợp lệ.");
  if (password.length < 8) back("/admin/", "Mật khẩu tối thiểu 8 ký tự.");
  if (password !== str(formData, "password2")) back("/admin/", "Hai mật khẩu không khớp.");
  await startSession(createAdmin(email, password));
  redirect("/admin/");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/");
}

// ---- Products ----
export async function saveProductAction(formData: FormData) {
  await requireAdmin();
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
  if (!one("SELECT 1 AS x FROM product_categories WHERE id = ?", categoryId)) back(here, "Chọn danh mục.");

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
  try {
    if (id) {
      run(
        `UPDATE products SET name=?, slug=?, category_id=?, price=?, sale_price=?, stock=?, summary=?, description=?, image=?, featured=? WHERE id=?`,
        name, slug, categoryId, price, salePrice, stock, str(formData, "summary"), String(formData.get("description") ?? ""), image, featured, id,
      );
    } else {
      run(
        `INSERT INTO products (name, slug, category_id, price, sale_price, stock, summary, description, image, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        name, slug, categoryId, price, salePrice, stock, str(formData, "summary"), String(formData.get("description") ?? ""), image, featured,
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
  await requireAdmin();
  const id = num(formData, "id");
  const stock = Math.max(0, num(formData, "stock"));
  run("UPDATE products SET stock = ? WHERE id = ?", stock, id);
  refresh();
  const returnTo = str(formData, "return_to");
  redirect(returnTo && returnTo.startsWith("/admin/products") ? returnTo : "/admin/products/?saved=1");
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const conn = db();
  conn.exec("BEGIN");
  try {
    run("DELETE FROM comments WHERE product_id = ?", id);
    run("DELETE FROM products WHERE id = ?", id);
    conn.exec("COMMIT");
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
  refresh();
  redirect("/admin/products/?saved=1");
}

// ---- Posts ----
export async function savePostAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const here = `/admin/posts/${id || "new"}/`;
  const title = str(formData, "title");
  if (!title) back(here, "Vui lòng nhập tiêu đề.");
  const slug = slugify(str(formData, "slug") || title);
  if (!slug) back(here, "Đường dẫn (slug) không hợp lệ.");
  const categoryId = num(formData, "category_id");
  if (!one("SELECT 1 AS x FROM post_categories WHERE id = ?", categoryId)) back(here, "Chọn chuyên mục.");

  let cover: string | null = str(formData, "cover") || null;
  if (str(formData, "remove_cover") === "1") cover = null;
  const file = uploaded(formData, "cover_file");
  if (file) {
    try {
      cover = await saveImage(file, "posts");
    } catch (e) {
      back(here, (e as Error).message);
    }
  }

  const content = String(formData.get("content") ?? "");
  try {
    if (id) {
      run(
        `UPDATE posts SET title=?, slug=?, category_id=?, excerpt=?, content=?, cover=? WHERE id=?`,
        title, slug, categoryId, str(formData, "excerpt"), content, cover, id,
      );
    } else {
      run(
        `INSERT INTO posts (title, slug, category_id, excerpt, content, cover) VALUES (?, ?, ?, ?, ?, ?)`,
        title, slug, categoryId, str(formData, "excerpt"), content, cover,
      );
    }
  } catch (e) {
    if (String(e).includes("UNIQUE")) back(here, "Đường dẫn (slug) đã được dùng cho bài khác.");
    throw e;
  }
  refresh();
  redirect("/admin/posts/?saved=1");
}

export async function deletePostAction(formData: FormData) {
  await requireAdmin();
  run("DELETE FROM posts WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/posts/?saved=1");
}


// ---- Orders ----
export async function updateOrderStatusAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const status = str(formData, "status");
  if (!isOrderStatus(status)) back(`/admin/orders/${id}/`, "Trạng thái không hợp lệ.");
  const current = one<{ status: string }>("SELECT status FROM orders WHERE id = ?", id);
  if (!current) return back("/admin/orders/", "Đơn hàng không tồn tại.");

  const conn = db();
  conn.exec("BEGIN");
  try {
    if (current.status !== status) {
      const items = conn.prepare("SELECT product_id, qty FROM order_items WHERE order_id = ?").all(id) as {
        product_id: number;
        qty: number;
      }[];
      if (current.status !== "cancelled" && status === "cancelled") {
        // Restore stock when cancelling an active order
        const restore = conn.prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
        for (const it of items) restore.run(it.qty, it.product_id);
      } else if (current.status === "cancelled" && status !== "cancelled") {
        // Deduct stock again when un-cancelling an order
        const deduct = conn.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?");
        for (const it of items) deduct.run(it.qty, it.product_id);
      }
    }
    run("UPDATE orders SET status = ? WHERE id = ?", status, id);
    conn.exec("COMMIT");
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
  refresh();
  redirect(`/admin/orders/${id}/?saved=1`);
}

// ---- Comments ----
export async function deleteCommentAction(formData: FormData) {
  await requireAdmin();
  run("DELETE FROM comments WHERE id = ?", num(formData, "id"));
  redirect("/admin/comments/?saved=1");
}

// ---- Static pages ----
export async function savePageAction(formData: FormData) {
  await requireAdmin();
  const grp = str(formData, "grp");
  const slug = str(formData, "slug");
  const here = `/admin/pages/${grp || "-"}__${slug}/`;
  const title = str(formData, "title");
  if (!title) back(here, "Vui lòng nhập tiêu đề.");
  run("UPDATE pages SET title = ?, content = ? WHERE grp = ? AND slug = ?", title, String(formData.get("content") ?? ""), grp, slug);
  refresh();
  redirect("/admin/pages/?saved=1");
}

// ---- Categories ----
export async function saveProductCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  if (!name || !slug) back("/admin/categories/", "Nhập tên danh mục.");
  const hasSort = str(formData, "sort") !== "";
  try {
    if (id) {
      run("UPDATE product_categories SET name = ?, slug = ?, sort = ? WHERE id = ?", name, slug, num(formData, "sort"), id);
    } else {
      const next = one<{ n: number }>("SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM product_categories")!.n;
      run("INSERT INTO product_categories (name, slug, sort) VALUES (?, ?, ?)", name, slug, hasSort ? num(formData, "sort") : next);
    }
  } catch (e) {
    if (String(e).includes("UNIQUE")) back("/admin/categories/", "Đường dẫn đã được dùng cho danh mục khác.");
    throw e;
  }
  refresh();
  redirect("/admin/categories/?saved=1");
}

export async function deleteProductCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  if (one("SELECT 1 AS x FROM products WHERE category_id = ?", id)) back("/admin/categories/", "Danh mục còn sản phẩm, không thể xoá.");
  run("DELETE FROM product_categories WHERE id = ?", id);
  refresh();
  redirect("/admin/categories/?saved=1");
}

export async function savePostCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  const section = str(formData, "section_slug");
  if (!name || !slug) back("/admin/categories/", "Nhập tên chuyên mục.");
  if (!one("SELECT 1 AS x FROM post_sections WHERE slug = ?", section)) back("/admin/categories/", "Mục không hợp lệ.");
  try {
    if (id) run("UPDATE post_categories SET name = ?, slug = ?, section_slug = ? WHERE id = ?", name, slug, section, id);
    else run("INSERT INTO post_categories (name, slug, section_slug) VALUES (?, ?, ?)", name, slug, section);
  } catch (e) {
    if (String(e).includes("UNIQUE")) back("/admin/categories/", "Đường dẫn đã được dùng cho chuyên mục khác.");
    throw e;
  }
  refresh();
  redirect("/admin/categories/?saved=1");
}

export async function deletePostCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  if (one("SELECT 1 AS x FROM posts WHERE category_id = ?", id)) back("/admin/categories/", "Chuyên mục còn bài viết, không thể xoá.");
  run("DELETE FROM post_categories WHERE id = ?", id);
  refresh();
  redirect("/admin/categories/?saved=1");
}

// ---- Settings & admin accounts ----
export async function saveSettingsAction(formData: FormData) {
  await requireAdmin();
  const values: Record<string, string> = {};
  for (const k of SETTING_KEYS) values[k] = str(formData, k);
  if (!values.name) back("/admin/settings/", "Tên cửa hàng không được để trống.");
  saveSite(values);
  refresh();
  redirect("/admin/settings/?saved=1");
}

export async function saveMailSettingsAction(formData: FormData) {
  await requireAdmin();
  const values: Record<string, string> = {};
  for (const k of MAIL_KEYS) values[k] = str(formData, k);
  if (!values.order_notify_email) {
    back("/admin/settings/", "Vui lòng nhập email nhận thông báo đơn hàng.");
  }
  const invalid = values.order_notify_email
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .find((s) => !/^\S+@\S+\.\S+$/.test(s));
  if (invalid) back("/admin/settings/", `Email nhận đơn không hợp lệ: ${invalid}`);
  saveMailSettings(values);
  redirect("/admin/settings/?saved=1");
}

export async function testMailAction(formData: FormData) {
  await requireAdmin();
  const values: Record<string, string> = {};
  for (const k of MAIL_KEYS) values[k] = str(formData, k);
  if (values.order_notify_email) saveMailSettings(values);
  const site = getSite();
  try {
    const res = await sendEmail({
      to: values.order_notify_email || undefined,
      subject: `[${site.name}] Email kiểm tra kết nối thông báo đơn hàng`,
      html: `<p>Xin chào,</p><p>Đây là email kiểm tra từ trang quản trị <strong>${site.name}</strong>.</p><p>Cấu hình gửi email thông báo đơn hàng mới tới <strong>${values.order_notify_email || "agvinh@gmail.com"}</strong> đã hoạt động tốt!</p>`,
    });
    if (!res.sent) back("/admin/settings/", res.error ?? "Không gửi được email thử.");
  } catch (e) {
    back("/admin/settings/", `Lỗi gửi email: ${(e as Error).message}`);
  }
  redirect("/admin/settings/?mail_sent=1");
}

export async function changePasswordAction(formData: FormData) {
  const me = await requireAdmin();
  if (!checkPassword(me.id, str(formData, "current"))) back("/admin/settings/", "Mật khẩu hiện tại không đúng.");
  const pw = str(formData, "password");
  if (pw.length < 8) back("/admin/settings/", "Mật khẩu mới tối thiểu 8 ký tự.");
  if (pw !== str(formData, "password2")) back("/admin/settings/", "Hai mật khẩu mới không khớp.");
  setPassword(me.id, pw, await currentToken());
  redirect("/admin/settings/?saved=1");
}

export async function addAdminAction(formData: FormData) {
  await requireAdmin();
  const email = str(formData, "email").toLowerCase();
  const pw = str(formData, "password");
  if (!/^\S+@\S+\.\S+$/.test(email)) back("/admin/settings/", "Email không hợp lệ.");
  if (pw.length < 8) back("/admin/settings/", "Mật khẩu tối thiểu 8 ký tự.");
  try {
    createAdmin(email, pw);
  } catch (e) {
    if (String(e).includes("UNIQUE")) back("/admin/settings/", "Email này đã là admin.");
    throw e;
  }
  redirect("/admin/settings/?saved=1");
}

export async function deleteAdminAction(formData: FormData) {
  const me = await requireAdmin();
  const id = num(formData, "id");
  if (id === me.id) back("/admin/settings/", "Không thể tự xoá tài khoản đang đăng nhập.");
  removeAdmin(id);
  redirect("/admin/settings/?saved=1");
}
