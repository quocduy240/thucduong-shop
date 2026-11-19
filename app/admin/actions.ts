"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  checkPassword, createAdmin, currentToken, endSession, hasAdmin, isValidAdminPhone, normalizeAdminPhone,
  removeAdmin, requireAdmin, setPassword, startSession, verifyLogin,
} from "@/lib/auth";
import { isOrderStatus } from "@/lib/admin-data";
import { all, batch, one, run } from "@/lib/db";
import { onOrderStatusChanged } from "@/lib/loyalty-events";
import { sendEmail } from "@/lib/mail";
import {
  getSite,
  MAIL_KEYS,
  saveMailSettings,
  saveSite,
  saveWidgetSettings,
  SETTING_KEYS,
  WIDGET_KEYS,
} from "@/lib/settings";
import { saveDocumentFile, saveImage, slugify } from "@/lib/uploads";

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
  const identifier = str(formData, "identifier") || str(formData, "email");
  const id = await verifyLogin(identifier, str(formData, "password"));
  if (!id) back("/admin/", "Sai email/số điện thoại hoặc mật khẩu.");
  await startSession(id!);
  redirect("/admin/");
}

/** Creates the very first admin; refuses once any admin exists. */
export async function setupAction(formData: FormData) {
  if (await hasAdmin()) redirect("/admin/");
  const email = str(formData, "email").toLowerCase();
  const phone = normalizeAdminPhone(str(formData, "phone"));
  const password = str(formData, "password");
  if (!/^\S+@\S+\.\S+$/.test(email)) back("/admin/", "Email không hợp lệ.");
  if (phone && !isValidAdminPhone(phone)) back("/admin/", "Số điện thoại không hợp lệ (10–11 số bắt đầu bằng 0).");
  if (password.length < 8) back("/admin/", "Mật khẩu tối thiểu 8 ký tự.");
  if (password !== str(formData, "password2")) back("/admin/", "Hai mật khẩu không khớp.");
  await startSession(await createAdmin(email, password, "super_admin", "", phone));
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
  const sku = str(formData, "sku");
  const brand = str(formData, "brand");
  const origin = str(formData, "origin");
  const unit = str(formData, "unit");
  const videoUrl = str(formData, "video_url");

  // Gallery images: newline/comma separated URLs + any uploaded gallery_files
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
    if (id) {
      await run(
        `UPDATE products SET name=?, slug=?, category_id=?, price=?, sale_price=?, stock=?, summary=?, description=?, image=?, featured=?,
         sku=?, brand=?, origin=?, unit=?, gallery=?, video_url=? WHERE id=?`,
        name, slug, categoryId, price, salePrice, stock, str(formData, "summary"), String(formData.get("description") ?? ""), image, featured,
        sku, brand, origin, unit, gallery, videoUrl, id,
      );
    } else {
      await run(
        `INSERT INTO products (name, slug, category_id, price, sale_price, stock, summary, description, image, featured, sku, brand, origin, unit, gallery, video_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        name, slug, categoryId, price, salePrice, stock, str(formData, "summary"), String(formData.get("description") ?? ""), image, featured,
        sku, brand, origin, unit, gallery, videoUrl,
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
  await run("UPDATE products SET stock = ? WHERE id = ?", stock, id);
  refresh();
  const returnTo = str(formData, "return_to");
  redirect(returnTo && returnTo.startsWith("/admin/products") ? returnTo : "/admin/products/?saved=1");
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  await batch([
    { sql: "DELETE FROM comments WHERE product_id = ?", params: [id] },
    { sql: "DELETE FROM products WHERE id = ?", params: [id] },
  ]);
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
  if (!(await one("SELECT 1 AS x FROM post_categories WHERE id = ?", categoryId))) back(here, "Chọn chuyên mục.");

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
  const relatedProductIds = str(formData, "related_product_ids");
  const comboTitle = str(formData, "combo_title");
  try {
    if (id) {
      await run(
        `UPDATE posts SET title=?, slug=?, category_id=?, excerpt=?, content=?, cover=?, related_product_ids=?, combo_title=? WHERE id=?`,
        title, slug, categoryId, str(formData, "excerpt"), content, cover, relatedProductIds, comboTitle, id,
      );
    } else {
      await run(
        `INSERT INTO posts (title, slug, category_id, excerpt, content, cover, related_product_ids, combo_title) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        title, slug, categoryId, str(formData, "excerpt"), content, cover, relatedProductIds, comboTitle,
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
  await run("DELETE FROM posts WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/posts/?saved=1");
}


// ---- Orders ----
export async function updateOrderStatusAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const status = str(formData, "status");
  if (!isOrderStatus(status)) back(`/admin/orders/${id}/`, "Trạng thái không hợp lệ.");
  const current = await one<{ status: string }>("SELECT status FROM orders WHERE id = ?", id);
  if (!current) return back("/admin/orders/", "Đơn hàng không tồn tại.");

  const stmts: { sql: string; params: unknown[] }[] = [];
  if (current.status !== status) {
    const items = await all<{ product_id: number; qty: number }>(
      "SELECT product_id, qty FROM order_items WHERE order_id = ?",
      id,
    );
    if (current.status !== "cancelled" && status === "cancelled") {
      for (const it of items) {
        stmts.push({ sql: "UPDATE products SET stock = stock + ? WHERE id = ?", params: [it.qty, it.product_id] });
      }
    } else if (current.status === "cancelled" && status !== "cancelled") {
      for (const it of items) {
        stmts.push({
          sql: "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?",
          params: [it.qty, it.product_id],
        });
      }
    }
  }
  stmts.push({ sql: "UPDATE orders SET status = ? WHERE id = ?", params: [status, id] });
  await batch(stmts);
  if (current.status !== status) {
    await onOrderStatusChanged(id, current.status, status);
  }
  refresh();
  redirect(`/admin/orders/${id}/?saved=1`);
}

// ---- Comments ----
export async function deleteCommentAction(formData: FormData) {
  await requireAdmin();
  await run("DELETE FROM comments WHERE id = ?", num(formData, "id"));
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
  await run(
    "UPDATE pages SET title = ?, content = ? WHERE grp = ? AND slug = ?",
    title,
    String(formData.get("content") ?? ""),
    grp,
    slug,
  );
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
      await run("UPDATE product_categories SET name = ?, slug = ?, sort = ? WHERE id = ?", name, slug, num(formData, "sort"), id);
    } else {
      const next = (await one<{ n: number }>("SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM product_categories"))!.n;
      await run("INSERT INTO product_categories (name, slug, sort) VALUES (?, ?, ?)", name, slug, hasSort ? num(formData, "sort") : next);
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
  if (await one("SELECT 1 AS x FROM products WHERE category_id = ?", id)) back("/admin/categories/", "Danh mục còn sản phẩm, không thể xoá.");
  await run("DELETE FROM product_categories WHERE id = ?", id);
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
  if (!(await one("SELECT 1 AS x FROM post_sections WHERE slug = ?", section))) back("/admin/categories/", "Mục không hợp lệ.");
  try {
    if (id) await run("UPDATE post_categories SET name = ?, slug = ?, section_slug = ? WHERE id = ?", name, slug, section, id);
    else await run("INSERT INTO post_categories (name, slug, section_slug) VALUES (?, ?, ?)", name, slug, section);
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
  if (await one("SELECT 1 AS x FROM posts WHERE category_id = ?", id)) back("/admin/categories/", "Chuyên mục còn bài viết, không thể xoá.");
  await run("DELETE FROM post_categories WHERE id = ?", id);
  refresh();
  redirect("/admin/categories/?saved=1");
}

// ---- Settings & admin accounts ----
export async function saveSettingsAction(formData: FormData) {
  await requireAdmin();
  const values: Record<string, string> = {};
  for (const k of SETTING_KEYS) values[k] = str(formData, k);
  if (!values.name) back("/admin/settings/", "Tên cửa hàng không được để trống.");
  await saveSite(values);
  refresh();
  redirect("/admin/settings/?saved=1");
}

export async function saveWidgetSettingsAction(formData: FormData) {
  await requireAdmin();
  const values: Record<string, string> = {};
  for (const k of WIDGET_KEYS) values[k] = str(formData, k);
  values.widget_enabled = str(formData, "widget_enabled") === "0" ? "0" : "1";
  await saveWidgetSettings(values);
  refresh();
  redirect("/admin/settings/?saved=1");
}

export async function updateConsultationStatusAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const status = str(formData, "status") === "done" ? "done" : "new";
  await run("UPDATE consultation_requests SET status = ? WHERE id = ?", status, id);
  redirect("/admin/settings/?saved=1");
}

export async function deleteConsultationAction(formData: FormData) {
  await requireAdmin();
  await run("DELETE FROM consultation_requests WHERE id = ?", num(formData, "id"));
  redirect("/admin/settings/?saved=1");
}

// ---- Dynamic QR Code & QR_Block ----
export async function saveQrAction(formData: FormData) {
  await requireAdmin();
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
  const selectedPositions = formData
    .getAll("positions")
    .map((x) => String(x).trim())
    .filter(Boolean);
  const positions = selectedPositions.length > 0 ? selectedPositions.join(",") : "manual";
  const targetPosts = formData
    .getAll("target_post_ids")
    .map((x) => String(x).trim())
    .filter(Boolean)
    .join(",");
  const targetProducts = formData
    .getAll("target_product_ids")
    .map((x) => String(x).trim())
    .filter(Boolean)
    .join(",");
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
  await requireAdmin();
  const id = num(formData, "id");
  const targetUrl = str(formData, "target_url");
  if (!targetUrl) back("/admin/qr/", "Link đích không được để trống.");
  await run("UPDATE qr_codes SET target_url = ? WHERE id = ?", targetUrl, id);
  refresh();
  redirect("/admin/qr/?saved=1");
}

export async function toggleQrAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const active = num(formData, "active") ? 1 : 0;
  await run("UPDATE qr_codes SET active = ? WHERE id = ?", active, id);
  refresh();
  redirect("/admin/qr/?saved=1");
}

export async function deleteQrAction(formData: FormData) {
  await requireAdmin();
  await run("DELETE FROM qr_codes WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/qr/?saved=1");
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
  await saveMailSettings(values);
  redirect("/admin/settings/?saved=1");
}

export async function testMailAction(formData: FormData) {
  await requireAdmin();
  const values: Record<string, string> = {};
  for (const k of MAIL_KEYS) values[k] = str(formData, k);
  if (values.order_notify_email) await saveMailSettings(values);
  const site = await getSite();
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
  if (!(await checkPassword(me.id, str(formData, "current")))) back("/admin/settings/", "Mật khẩu hiện tại không đúng.");
  const pw = str(formData, "password");
  if (pw.length < 8) back("/admin/settings/", "Mật khẩu mới tối thiểu 8 ký tự.");
  if (pw !== str(formData, "password2")) back("/admin/settings/", "Hai mật khẩu mới không khớp.");
  await setPassword(me.id, pw, await currentToken());
  redirect("/admin/settings/?saved=1");
}

export async function addAdminAction(formData: FormData) {
  await requireAdmin();
  const email = str(formData, "email").toLowerCase();
  const pw = str(formData, "password");
  if (!/^\S+@\S+\.\S+$/.test(email)) back("/admin/settings/", "Email không hợp lệ.");
  if (pw.length < 8) back("/admin/settings/", "Mật khẩu tối thiểu 8 ký tự.");
  try {
    await createAdmin(email, pw);
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
  await removeAdmin(id);
  redirect("/admin/settings/?saved=1");
}

// ---- Video Library (Bài giảng YouTube) ----
function parseYoutubeId(raw: string): string | null {
  const s = (raw || "").trim();
  if (!s) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const watchMatch = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = s.match(/youtube\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

async function fetchYoutubeTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (res.ok) {
      const data = (await res.json()) as { title?: string };
      if (data.title?.trim()) return data.title.trim();
    }
  } catch {
    /* fallback below */
  }
  return `Video bài giảng Thực dưỡng (${videoId})`;
}

export async function addVideoAction(formData: FormData) {
  await requireAdmin();
  const here = "/admin/videos/";
  const rawUrls = String(formData.get("youtube_url") ?? "")
    .split(/[\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (rawUrls.length === 0) back(here, "Vui lòng dán ít nhất 1 đường link video YouTube.");

  const customTopic = str(formData, "custom_topic");
  const topic = customTopic || str(formData, "topic") || "Thực Dưỡng Hiện Đại";
  const manualTitle = str(formData, "title");
  const description = str(formData, "description");

  for (const rawUrl of rawUrls) {
    const videoId = parseYoutubeId(rawUrl);
    if (!videoId) return back(here, `Link YouTube không hợp lệ: ${rawUrl}`);
    const title = rawUrls.length === 1 && manualTitle ? manualTitle : await fetchYoutubeTitle(videoId);
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    await run(
      "INSERT INTO videos (youtube_url, video_id, title, topic, description, sort) VALUES (?, ?, ?, ?, ?, 0)",
      canonicalUrl,
      videoId,
      title,
      topic,
      description,
    );
  }
  refresh();
  redirect("/admin/videos/?saved=1");
}

export async function updateVideoAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const rawUrl = str(formData, "youtube_url");
  const videoId = parseYoutubeId(rawUrl);
  if (!videoId) return back("/admin/videos/", "Link YouTube không hợp lệ.");
  let title = str(formData, "title");
  if (!title) title = await fetchYoutubeTitle(videoId);
  const topic = str(formData, "topic") || "Thực Dưỡng Hiện Đại";
  const description = str(formData, "description");
  const sort = num(formData, "sort");
  await run(
    "UPDATE videos SET youtube_url=?, video_id=?, title=?, topic=?, description=?, sort=? WHERE id=?",
    `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
    title,
    topic,
    description,
    sort,
    id,
  );
  refresh();
  redirect("/admin/videos/?saved=1");
}

export async function deleteVideoAction(formData: FormData) {
  await requireAdmin();
  await run("DELETE FROM videos WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/videos/?saved=1");
}

// ---- Document & Book Library (Tài liệu & Sách Thực dưỡng) ----
export async function saveDocumentAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const here = `/admin/documents/${id || "new"}/`;
  const title = str(formData, "title");
  if (!title) back(here, "Vui lòng nhập tên tài liệu / sách.");
  const slug = slugify(str(formData, "slug") || title);
  if (!slug) back(here, "Đường dẫn (slug) không hợp lệ.");

  const folderPath = str(formData, "folder_path") || "01. Thực Dưỡng Căn Bản";
  let docType = str(formData, "doc_type") || "pdf";
  const accessMode = str(formData, "access_mode") || "free";
  const price = Math.max(0, num(formData, "price"));
  let driveUrl = str(formData, "drive_url");
  const driveFolderUrl = str(formData, "drive_folder_url");
  const affiliateUrl = str(formData, "affiliate_url");
  const bundleProductId = str(formData, "bundle_product_id") ? num(formData, "bundle_product_id") : null;
  const author = str(formData, "author") || "Duy Vo & Thực Dưỡng Phúc Thọ";
  const pages = Math.max(0, num(formData, "pages"));
  let fileSize = str(formData, "file_size");
  const summary = str(formData, "summary");
  const highlights = String(formData.get("highlights") ?? "").trim();
  const reviewHtml = String(formData.get("review_html") ?? "").trim();
  const taskPrompt = str(formData, "task_prompt");
  const sort = num(formData, "sort");

  // Optional direct document file upload (PDF/DOCX/PPTX)
  const docFile = uploaded(formData, "doc_file");
  if (docFile) {
    try {
      const saved = await saveDocumentFile(docFile);
      driveUrl = saved.url;
      if (!fileSize) fileSize = saved.fileSize;
      docType = saved.docType;
    } catch (e) {
      back(here, (e as Error).message);
    }
  }

  // Optional cover image upload
  let cover = str(formData, "cover");
  if (str(formData, "remove_cover") === "1") cover = "";
  const coverFile = uploaded(formData, "cover_file");
  if (coverFile) {
    try {
      cover = await saveImage(coverFile, "documents");
    } catch (e) {
      back(here, (e as Error).message);
    }
  }

  try {
    if (id) {
      await run(
        `UPDATE documents SET
          slug=?, title=?, folder_path=?, doc_type=?, access_mode=?, price=?,
          drive_url=?, drive_folder_url=?, affiliate_url=?, bundle_product_id=?,
          cover=?, author=?, pages=?, file_size=?, summary=?, highlights=?,
          review_html=?, task_prompt=?, sort=?
         WHERE id=?`,
        slug, title, folderPath, docType, accessMode, price,
        driveUrl, driveFolderUrl, affiliateUrl, bundleProductId,
        cover, author, pages, fileSize, summary, highlights,
        reviewHtml, taskPrompt, sort, id,
      );
    } else {
      await run(
        `INSERT INTO documents (
          slug, title, folder_path, doc_type, access_mode, price,
          drive_url, drive_folder_url, affiliate_url, bundle_product_id,
          cover, author, pages, file_size, summary, highlights,
          review_html, task_prompt, sort
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        slug, title, folderPath, docType, accessMode, price,
        driveUrl, driveFolderUrl, affiliateUrl, bundleProductId,
        cover, author, pages, fileSize, summary, highlights,
        reviewHtml, taskPrompt, sort,
      );
    }
  } catch (e) {
    if (String(e).includes("UNIQUE")) back(here, "Đường dẫn (slug) đã được dùng cho tài liệu khác.");
    throw e;
  }
  refresh();
  redirect("/admin/documents/?saved=1");
}

export async function deleteDocumentAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  await run("DELETE FROM document_leads WHERE document_id = ?", id);
  await run("DELETE FROM documents WHERE id = ?", id);
  refresh();
  redirect("/admin/documents/?saved=1");
}

export async function deleteDocumentLeadAction(formData: FormData) {
  await requireAdmin();
  await run("DELETE FROM document_leads WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/documents/?saved=1");
}

// ---- Members, Newsletter Subscribers & Coupons ----
export async function addSubscriberAction(formData: FormData) {
  await requireAdmin();
  const email = str(formData, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) back("/admin/members/", "Địa chỉ email không hợp lệ.");
  await run(
    "INSERT INTO newsletter_subscribers (email, source, status) VALUES (?, 'admin', 'active') ON CONFLICT(email) DO UPDATE SET status = 'active'",
    email,
  );
  refresh();
  redirect("/admin/members/?saved=1");
}

export async function deleteSubscriberAction(formData: FormData) {
  await requireAdmin();
  await run("DELETE FROM newsletter_subscribers WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/members/?saved=1");
}

export async function updateMemberAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const tier = str(formData, "tier");
  const points = Math.max(0, num(formData, "points"));
  if (!["bronze", "silver", "gold"].includes(tier)) back("/admin/members/", "Hạng thành viên không hợp lệ.");
  await run("UPDATE members SET tier = ?, points = ? WHERE id = ?", tier, points, id);
  refresh();
  redirect("/admin/members/?saved=1");
}

export async function deleteMemberAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  await run("DELETE FROM member_sessions WHERE member_id = ?", id);
  await run("DELETE FROM members WHERE id = ?", id);
  refresh();
  redirect("/admin/members/?saved=1");
}

export async function saveCouponAction(formData: FormData) {
  await requireAdmin();
  const code = str(formData, "code").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const title = str(formData, "title");
  if (!code || !title) back("/admin/members/", "Vui lòng nhập Mã giảm giá và Tên chương trình ưu đãi.");
  const description = str(formData, "description");
  const discountType = str(formData, "discount_type") === "fixed" ? "fixed" : "percent";
  const discountValue = Math.max(1, num(formData, "discount_value"));
  const minOrder = Math.max(0, num(formData, "min_order"));
  const maxDiscount = Math.max(0, num(formData, "max_discount"));
  const memberOnly = str(formData, "member_only") === "0" ? 0 : 1;

  await run(
    `INSERT INTO coupons (code, title, description, discount_type, discount_value, min_order, max_discount, member_only, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(code) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       discount_type = excluded.discount_type,
       discount_value = excluded.discount_value,
       min_order = excluded.min_order,
       max_discount = excluded.max_discount,
       member_only = excluded.member_only`,
    code,
    title,
    description,
    discountType,
    discountValue,
    minOrder,
    maxDiscount,
    memberOnly,
  );
  refresh();
  redirect("/admin/members/?saved=1");
}

export async function toggleCouponAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const active = num(formData, "active") ? 1 : 0;
  await run("UPDATE coupons SET active = ? WHERE id = ?", active, id);
  refresh();
  redirect("/admin/members/?saved=1");
}

export async function deleteCouponAction(formData: FormData) {
  await requireAdmin();
  await run("DELETE FROM coupons WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/members/?saved=1");
}

// ---- Reusable Content Blocks (Các Block thường dùng) ----
export async function saveBlockAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const here = `/admin/blocks/${id || "new"}/`;
  const title = str(formData, "title");
  if (!title) back(here, "Vui lòng nhập tiêu đề Block.");
  const slug = slugify(str(formData, "slug") || title);
  if (!slug) back(here, "Mã định danh (slug) của Block không hợp lệ.");

  const styleVariant = str(formData, "style_variant") || "emerald";
  const selectedPositions = formData
    .getAll("positions")
    .map((x) => String(x).trim())
    .filter(Boolean);
  const positions = selectedPositions.length > 0 ? selectedPositions.join(",") : "manual";

  const targetPosts = formData
    .getAll("target_post_ids")
    .map((x) => String(x).trim())
    .filter(Boolean)
    .join(",");
  const targetProducts = formData
    .getAll("target_product_ids")
    .map((x) => String(x).trim())
    .filter(Boolean)
    .join(",");

  const contentHtml = String(formData.get("content_html") ?? "").trim();
  const active = str(formData, "active") === "0" ? 0 : 1;
  const sort = num(formData, "sort");

  try {
    if (id) {
      await run(
        `UPDATE content_blocks SET
          slug=?, title=?, style_variant=?, positions=?, target_post_ids=?, target_product_ids=?,
          content_html=?, active=?, sort=?
         WHERE id=?`,
        slug, title, styleVariant, positions, targetPosts, targetProducts, contentHtml, active, sort, id,
      );
    } else {
      await run(
        `INSERT INTO content_blocks (
          slug, title, style_variant, positions, target_post_ids, target_product_ids,
          content_html, active, sort
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        slug, title, styleVariant, positions, targetPosts, targetProducts, contentHtml, active, sort,
      );
    }
  } catch (e) {
    if (String(e).includes("UNIQUE")) back(here, "Mã định danh (slug) này đã được dùng cho một Block khác.");
    throw e;
  }
  refresh();
  redirect("/admin/blocks/?saved=1");
}

export async function toggleBlockAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  const active = num(formData, "active") ? 1 : 0;
  await run("UPDATE content_blocks SET active = ? WHERE id = ?", active, id);
  refresh();
  redirect("/admin/blocks/?saved=1");
}

export async function deleteBlockAction(formData: FormData) {
  await requireAdmin();
  await run("DELETE FROM content_blocks WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/blocks/?saved=1");
}

// ---- Giờ vàng săn sale (Flash Sale & Tự động hóa) ----
export async function saveFlashSaleConfigAction(formData: FormData) {
  await requireAdmin();
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
  redirect("/admin/flash-sale/?saved=1");
}

export async function saveFlashSaleSlotAction(formData: FormData) {
  await requireAdmin();
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
  redirect("/admin/flash-sale/?saved=1");
}

export async function deleteFlashSaleSlotAction(formData: FormData) {
  await requireAdmin();
  const id = num(formData, "id");
  await run("DELETE FROM flash_sale_items WHERE slot_id = ?", id);
  await run("DELETE FROM flash_sale_slots WHERE id = ?", id);
  refresh();
  redirect("/admin/flash-sale/?saved=1");
}

export async function saveFlashSaleItemAction(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
  await run("DELETE FROM flash_sale_items WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/flash-sale/?saved=1");
}

export async function autoGenerateFlashSaleAction(formData: FormData) {
  await requireAdmin();
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

export async function saveGeminiKeyAction(formData: FormData) {
  await requireAdmin();
  const key = str(formData, "gemini_api_key");
  if (!key) {
    await run("DELETE FROM settings WHERE key = 'gemini_api_key'");
    refresh();
    redirect("/admin/settings/?saved=1");
  }
  if (!(key.startsWith("AIza") || key.startsWith("AQ.")) || key.length < 25 || /\s/.test(key)) {
    redirect(
      `/admin/settings/?error=${encodeURIComponent("Gemini API Key không hợp lệ (Key Google AI Studio phải bắt đầu bằng 'AIza...' hoặc 'AQ....').")}`,
    );
  }
  await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('gemini_api_key', ?)", key);
  refresh();
  redirect("/admin/settings/?saved=1");
}
