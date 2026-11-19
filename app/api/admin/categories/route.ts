import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { listPostCategoriesWithCount, listProductCategoriesWithCount } from "@/lib/admin-data";
import { currentAdmin } from "@/lib/auth";
import { all, one, run } from "@/lib/db";
import { canAccessAdminPath } from "@/lib/rbac";

function slugifyVi(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(req: Request) {
  const admin = await currentAdmin();
  if (!admin || !canAccessAdminPath(admin.role, "/admin/categories/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const categoryId = Number(searchParams.get("category_id") || 0);

  if (type === "product" && categoryId > 0) {
    const items = await all<{
      id: number;
      name: string;
      slug: string;
      price: number;
      sale_price: number | null;
      stock: number;
      image: string | null;
    }>(
      "SELECT id, name, slug, price, sale_price, stock, image FROM products WHERE category_id = ? ORDER BY id DESC LIMIT 100",
      categoryId,
    );
    return NextResponse.json({ items });
  }

  if (type === "post" && categoryId > 0) {
    const items = await all<{
      id: number;
      title: string;
      slug: string;
      created_at: string;
    }>(
      "SELECT id, title, slug, created_at FROM posts WHERE category_id = ? ORDER BY id DESC LIMIT 100",
      categoryId,
    );
    return NextResponse.json({ items });
  }

  const [productCats, postCats] = await Promise.all([
    listProductCategoriesWithCount(),
    listPostCategoriesWithCount(),
  ]);
  return NextResponse.json({ productCats, postCats });
}

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin || !canAccessAdminPath(admin.role, "/admin/categories/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "");

  try {
    if (action === "bulk_save_product_categories") {
      const items = Array.isArray(body.items) ? body.items : [];
      for (const raw of items) {
        const it = raw as Record<string, unknown>;
        const id = Number(it.id);
        const name = String(it.name ?? "").trim();
        const slug = slugifyVi(String(it.slug ?? "") || name);
        if (!id || !name || !slug) continue;
        await run(
          `UPDATE product_categories
           SET name = ?, slug = ?, sort = ?,
               show_in_menu = ?, show_in_home = ?, show_in_footer = ?,
               is_active = ?, seo_title = ?, description = ?
           WHERE id = ?`,
          name,
          slug,
          Number(it.sort) || 0,
          it.show_in_menu ? 1 : 0,
          it.show_in_home ? 1 : 0,
          it.show_in_footer ? 1 : 0,
          it.is_active ? 1 : 0,
          String(it.seo_title ?? "").trim(),
          String(it.description ?? "").trim(),
          id,
        );
      }
      revalidatePath("/", "layout");
      const productCats = await listProductCategoriesWithCount();
      return NextResponse.json({ ok: true, productCats });
    }

    if (action === "move_products") {
      const productIds = Array.isArray(body.product_ids)
        ? body.product_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0)
        : [];
      let targetId = Number(body.target_category_id);
      if (productIds.length === 0) {
        return NextResponse.json({ error: "Chưa chọn sản phẩm nào." }, { status: 400 });
      }
      if (targetId === -1) {
        const existing = await one<{ id: number }>(
          "SELECT id FROM product_categories WHERE slug = 'chua-phan-loai'",
        );
        if (existing) {
          targetId = existing.id;
        } else {
          const created = await run(
            "INSERT INTO product_categories (slug, name, sort, show_in_menu, show_in_home, show_in_footer) VALUES ('chua-phan-loai', 'Chưa phân loại (?)', 999, 0, 0, 0)",
          );
          targetId = Number(created.lastInsertRowid);
        }
      }
      if (!targetId || !(await one("SELECT 1 AS x FROM product_categories WHERE id = ?", targetId))) {
        return NextResponse.json({ error: "Danh mục đích không hợp lệ." }, { status: 400 });
      }
      for (const pid of productIds) {
        await run("UPDATE products SET category_id = ? WHERE id = ?", targetId, pid);
      }
      revalidatePath("/", "layout");
      const productCats = await listProductCategoriesWithCount();
      return NextResponse.json({ ok: true, moved: productIds.length, productCats });
    }

    if (action === "move_posts") {
      const postIds = Array.isArray(body.post_ids)
        ? body.post_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0)
        : [];
      const targetId = Number(body.target_category_id);
      if (postIds.length === 0 || !targetId) {
        return NextResponse.json({ error: "Chưa chọn bài viết hoặc chuyên mục đích." }, { status: 400 });
      }
      if (!(await one("SELECT 1 AS x FROM post_categories WHERE id = ?", targetId))) {
        return NextResponse.json({ error: "Chuyên mục đích không hợp lệ." }, { status: 400 });
      }
      for (const pid of postIds) {
        await run("UPDATE posts SET category_id = ? WHERE id = ?", targetId, pid);
      }
      revalidatePath("/", "layout");
      const postCats = await listPostCategoriesWithCount();
      return NextResponse.json({ ok: true, moved: postIds.length, postCats });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Không thể cập nhật danh mục." },
      { status: 400 },
    );
  }
}
