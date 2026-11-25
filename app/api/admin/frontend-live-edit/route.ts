import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit-log";
import { currentAdmin } from "@/lib/auth";
import { CACHE_TAGS, invalidateStorefront } from "@/lib/cache-tags";
import { all, one, run } from "@/lib/db";
import { canAccessAdminPath } from "@/lib/rbac";
import { ensureRetailOpsSchema, recordInventoryMovement } from "@/lib/retail-ops";
import { getSite, getWidgetSettings, saveSite, saveWidgetSettings } from "@/lib/settings";

export async function GET(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return Response.json({ error: "Chưa đăng nhập quản trị." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const target = (searchParams.get("target") || "/admin/").trim();
  if (!canAccessAdminPath(admin.role, target)) {
    return Response.json({ error: "Tài khoản không có quyền sửa mục này." }, { status: 403 });
  }

  await ensureRetailOpsSchema();

  // 1. Match /admin/products/<id>
  const prodMatch = target.match(/\/admin\/products\/(\d+)/);
  if (prodMatch) {
    const id = Number(prodMatch[1]);
    const [product, categories] = await Promise.all([
      one<Record<string, unknown>>(
        `SELECT id, name, slug, category_id, price, sale_price, COALESCE(cost_price, 0) AS cost_price,
                stock, COALESCE(min_stock, 0) AS min_stock, COALESCE(is_published, 1) AS is_published,
                COALESCE(featured, 0) AS featured, COALESCE(contact_only, 0) AS contact_only,
                COALESCE(sku, '') AS sku, COALESCE(summary, '') AS summary
         FROM products WHERE id = ?`,
        id,
      ),
      all<{ id: number; name: string; is_active: number }>(
        "SELECT id, name, COALESCE(is_active, 1) AS is_active FROM product_categories ORDER BY sort, id",
      ),
    ]);
    if (!product) return Response.json({ error: "Không tìm thấy sản phẩm." }, { status: 404 });
    return Response.json({ kind: "product", product, categories });
  }

  // 2. Match /admin/posts/<id>
  const postMatch = target.match(/\/admin\/posts\/(\d+)/);
  if (postMatch) {
    const id = Number(postMatch[1]);
    const [post, postCategories] = await Promise.all([
      one<Record<string, unknown>>(
        "SELECT id, title, slug, category_id, COALESCE(excerpt, '') AS excerpt, created_at FROM posts WHERE id = ?",
        id,
      ),
      all<{ id: number; name: string; section_slug: string }>(
        "SELECT id, name, section_slug FROM post_categories ORDER BY section_slug, id",
      ),
    ]);
    if (!post) return Response.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
    return Response.json({ kind: "post", post, postCategories });
  }

  // 3. Match /admin/blocks/<id> or /admin/blocks
  const blockMatch = target.match(/\/admin\/blocks\/(\d+)/);
  if (blockMatch || target.startsWith("/admin/blocks")) {
    const selectedId = blockMatch ? Number(blockMatch[1]) : 0;
    const blocks = await all<Record<string, unknown>>(
      "SELECT id, slug, title, type, zone, sort_order, is_active, html FROM content_blocks ORDER BY zone ASC, sort_order ASC, id ASC",
    );
    return Response.json({ kind: "blocks", selectedId, blocks });
  }

  // 4. Match /admin/categories or /admin/products (category & module positioning)
  if (target.startsWith("/admin/categories") || target.startsWith("/admin/products")) {
    const categories = await all<Record<string, unknown>>(
      `SELECT id, name, slug, sort,
              COALESCE(show_in_menu, 1) AS show_in_menu,
              COALESCE(show_in_home, 1) AS show_in_home,
              COALESCE(show_in_footer, 1) AS show_in_footer,
              COALESCE(is_active, 1) AS is_active,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = product_categories.id) AS prod_count
       FROM product_categories ORDER BY sort ASC, id ASC`,
    );
    return Response.json({ kind: "categories", categories });
  }

  // 5. Match /admin/posts (post list ordering / pinning)
  if (target.startsWith("/admin/posts")) {
    const posts = await all<Record<string, unknown>>(
      `SELECT po.id, po.title, po.slug, po.category_id, COALESCE(po.excerpt, '') AS excerpt, po.created_at,
              pc.name AS category_name
       FROM posts po JOIN post_categories pc ON pc.id = po.category_id
       ORDER BY po.created_at DESC, po.id DESC LIMIT 25`,
    );
    return Response.json({ kind: "posts_list", posts });
  }

  // 6. Default: Storefront Settings, Hotlines & Widget (/admin/settings)
  const [site, widget] = await Promise.all([getSite(), getWidgetSettings()]);
  return Response.json({ kind: "site_settings", site, widget });
}

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return Response.json({ error: "Chưa đăng nhập quản trị." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const kind = String(body.kind || "");

  await ensureRetailOpsSchema();

  // 1. Save Product inline from Frontend Drawer
  if (kind === "product") {
    if (!canAccessAdminPath(admin.role, "/admin/products/")) {
      return Response.json({ error: "Không có quyền sửa sản phẩm." }, { status: 403 });
    }
    const id = Number(body.id);
    const prev = await one<Record<string, unknown>>(
      "SELECT id, name, category_id, price, sale_price, cost_price, stock, is_published, featured, contact_only, sku, summary FROM products WHERE id = ?",
      id,
    );
    if (!prev) return Response.json({ error: "Không tìm thấy sản phẩm." }, { status: 404 });

    const name = String(body.name || prev.name).trim();
    const categoryId = Number(body.category_id) || Number(prev.category_id);
    const price = Math.max(0, Number(body.price ?? prev.price));
    const costPrice = Math.max(0, Number(body.cost_price ?? prev.cost_price));
    const rawSale = body.sale_price;
    const salePrice =
      rawSale !== null && rawSale !== "" && Number(rawSale) > 0 && Number(rawSale) < price
        ? Number(rawSale)
        : null;
    const stock = Math.max(0, Number(body.stock ?? prev.stock));
    const isPublished = body.is_published ? 1 : 0;
    const featured = body.featured ? 1 : 0;
    const contactOnly = body.contact_only ? 1 : 0;
    const sku = String(body.sku ?? prev.sku).trim();
    const summary = String(body.summary ?? prev.summary).trim();

    await run(
      `UPDATE products
       SET name = ?, category_id = ?, price = ?, sale_price = ?, cost_price = ?, stock = ?,
           is_published = ?, featured = ?, contact_only = ?, sku = ?, summary = ?
       WHERE id = ?`,
      name,
      categoryId,
      price,
      salePrice,
      costPrice,
      stock,
      isPublished,
      featured,
      contactOnly,
      sku,
      summary,
      id,
    );

    const prevStock = Number(prev.stock ?? 0);
    if (prevStock !== stock) {
      await recordInventoryMovement({
        productId: id,
        changeQty: stock - prevStock,
        unitCost: costPrice,
        reason: "stocktake",
        refCode: sku || `FE-${id}`,
        note: `Sửa trực tiếp ngoài Frontend (${prevStock} → ${stock})`,
        createdBy: admin.email,
      });
    }

    const afterSnap = {
      id,
      name,
      category_id: categoryId,
      price,
      sale_price: salePrice,
      cost_price: costPrice,
      stock,
      is_published: isPublished,
      featured,
      contact_only: contactOnly,
      sku,
      summary,
    };

    await recordAuditLog({
      actor: admin,
      module: "frontend_live_edit",
      action: "live_update_product",
      severity:
        Number(prev.price) !== price || Number(prev.cost_price) !== costPrice || prevStock !== stock
          ? "warning"
          : "info",
      entityType: "product",
      entityId: id,
      entityLabel: `${sku ? `[${sku}] ` : ""}${name}`,
      beforeData: prev,
      afterData: afterSnap,
    });

    invalidateStorefront(CACHE_TAGS.products, CACHE_TAGS.categories);
    revalidatePath("/", "layout");
    return Response.json({ ok: true, message: "Đã lưu sản phẩm và cập nhật giao diện trực tiếp!" });
  }

  // 2. Save Post inline (including "Đẩy lên đầu trang / Ghim mới nhất")
  if (kind === "post") {
    if (!canAccessAdminPath(admin.role, "/admin/posts/")) {
      return Response.json({ error: "Không có quyền sửa bài viết." }, { status: 403 });
    }
    const id = Number(body.id);
    const prev = await one<Record<string, unknown>>(
      "SELECT id, title, excerpt, category_id, created_at FROM posts WHERE id = ?",
      id,
    );
    if (!prev) return Response.json({ error: "Không tìm thấy bài viết." }, { status: 404 });

    const title = String(body.title || prev.title).trim();
    const excerpt = String(body.excerpt ?? prev.excerpt).trim();
    const categoryId = Number(body.category_id) || Number(prev.category_id);
    const pinToTop = Boolean(body.pin_to_top);
    const nextCreatedAt = pinToTop
      ? new Date().toISOString().replace("T", " ").slice(0, 19)
      : String(prev.created_at);

    await run(
      "UPDATE posts SET title = ?, excerpt = ?, category_id = ?, created_at = ? WHERE id = ?",
      title,
      excerpt,
      categoryId,
      nextCreatedAt,
      id,
    );

    await recordAuditLog({
      actor: admin,
      module: "frontend_live_edit",
      action: pinToTop ? "pin_post_to_top" : "live_update_post",
      severity: "info",
      entityType: "post",
      entityId: id,
      entityLabel: title,
      beforeData: prev,
      afterData: { id, title, excerpt, category_id: categoryId, created_at: nextCreatedAt },
    });

    invalidateStorefront(CACHE_TAGS.posts);
    revalidatePath("/", "layout");
    return Response.json({ ok: true, message: "Đã cập nhật bài viết & vị trí hiển thị!" });
  }

  // 3. Save Category visibility & ordering inline
  if (kind === "categories") {
    if (!canAccessAdminPath(admin.role, "/admin/categories/")) {
      return Response.json({ error: "Không có quyền sửa danh mục." }, { status: 403 });
    }
    const items = Array.isArray(body.categories) ? (body.categories as Record<string, unknown>[]) : [];
    for (let idx = 0; idx < items.length; idx++) {
      const cat = items[idx];
      const id = Number(cat.id);
      if (!id) continue;
      await run(
        `UPDATE product_categories
         SET name = ?, sort = ?, show_in_menu = ?, show_in_home = ?, show_in_footer = ?, is_active = ?
         WHERE id = ?`,
        String(cat.name || "").trim(),
        Number(cat.sort ?? idx + 1),
        cat.show_in_menu ? 1 : 0,
        cat.show_in_home ? 1 : 0,
        cat.show_in_footer ? 1 : 0,
        cat.is_active ? 1 : 0,
        id,
      );
    }
    await recordAuditLog({
      actor: admin,
      module: "frontend_live_edit",
      action: "reorder_categories",
      severity: "info",
      entityType: "product_categories",
      entityId: "all",
      entityLabel: "Danh mục & Vị trí Menu/Trang chủ",
      diffSummary: `Cập nhật thứ tự & trạng thái hiển thị của ${items.length} nhóm hàng ngoài Frontend`,
    });
    invalidateStorefront(CACHE_TAGS.categories, CACHE_TAGS.products);
    revalidatePath("/", "layout");
    return Response.json({ ok: true, message: "Đã lưu thứ tự và vị trí hiển thị các danh mục!" });
  }

  // 4. Save Block / Module Zone content & ordering
  if (kind === "block_save") {
    if (!canAccessAdminPath(admin.role, "/admin/blocks/")) {
      return Response.json({ error: "Không có quyền sửa Block giao diện." }, { status: 403 });
    }
    const id = Number(body.id);
    const prev = await one<Record<string, unknown>>("SELECT * FROM content_blocks WHERE id = ?", id);
    if (!prev) return Response.json({ error: "Không tìm thấy Block." }, { status: 404 });

    const title = String(body.title || prev.title).trim();
    const zone = String(body.zone || prev.zone).trim();
    const sortOrder = Number(body.sort_order ?? prev.sort_order ?? 0);
    const isActive = body.is_active ? 1 : 0;
    const html = String(body.html ?? prev.html);

    await run(
      "UPDATE content_blocks SET title = ?, zone = ?, sort_order = ?, is_active = ?, html = ? WHERE id = ?",
      title,
      zone,
      sortOrder,
      isActive,
      html,
      id,
    );

    await recordAuditLog({
      actor: admin,
      module: "frontend_live_edit",
      action: "live_update_block",
      severity: "info",
      entityType: "block",
      entityId: id,
      entityLabel: `Block: ${title} (${zone})`,
      beforeData: prev,
      afterData: { id, title, zone, sort_order: sortOrder, is_active: isActive },
    });

    invalidateStorefront(CACHE_TAGS.blocks);
    revalidatePath("/", "layout");
    return Response.json({ ok: true, message: "Đã cập nhật Block vùng giao diện!" });
  }

  // 5. Save Storefront Settings & Dual Hotlines inline
  if (kind === "site_settings") {
    if (!canAccessAdminPath(admin.role, "/admin/settings/")) {
      return Response.json({ error: "Không có quyền sửa cài đặt cửa hàng." }, { status: 403 });
    }
    const siteValues = (body.site || {}) as Record<string, string>;
    const widgetValues = (body.widget || {}) as Record<string, string>;
    await Promise.all([saveSite(siteValues), saveWidgetSettings(widgetValues)]);
    await recordAuditLog({
      actor: admin,
      module: "frontend_live_edit",
      action: "live_update_site_settings",
      severity: "warning",
      entityType: "settings",
      entityId: "site",
      entityLabel: "Thông tin Cửa hàng & Hotline ngoài Web",
      diffSummary: `Cập nhật trực tiếp: Tên="${siteValues.name || ""}" · Hotline="${siteValues.hotline || ""}"`,
    });
    revalidatePath("/", "layout");
    return Response.json({ ok: true, message: "Đã lưu thông tin cửa hàng & Hotline!" });
  }

  return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
}
