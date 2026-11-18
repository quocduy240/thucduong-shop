import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ContentEditor from "@/components/admin/ContentEditor";
import { ui } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import {
  BLOCK_POSITION_LABELS,
  BLOCK_STYLE_LABELS,
  getAllBlocks,
  getBlockById,
  type BlockPosition,
} from "@/lib/blocks";
import { getPosts, getProducts } from "@/lib/data";
import { deleteBlockAction, saveBlockAction } from "../../actions";

export const metadata = { title: "Soạn thảo Block thường dùng | Quản trị" };

export default async function BlockEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id: rawId } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const id = rawId === "new" ? 0 : Number(rawId);
  if (rawId !== "new" && !Number.isInteger(id)) notFound();
  const block = id ? await getBlockById(id) : undefined;
  if (id && !block) notFound();

  const [allBlocksRaw, posts, productsRaw] = await Promise.all([
    getAllBlocks(),
    getPosts({ limit: 100 }),
    getProducts(200),
  ]);
  const allBlocks = allBlocksRaw.filter((b) => b.id !== id);
  const products = productsRaw.map((prod) => ({
    id: prod.id,
    name: prod.name,
    slug: prod.slug,
    category_slug: prod.category_slug,
    category_name: prod.category_name,
    price: prod.price,
    sale_price: prod.sale_price,
    image: prod.image,
    sku: prod.sku,
    brand: prod.brand,
    unit: prod.unit,
    summary: prod.summary,
  }));

  const activePositions = new Set(
    (block?.positions ?? "manual")
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const targetPostSet = new Set(
    (block?.target_post_ids ?? "")
      .split(/[\s,]+/)
      .map((s) => Number(s.trim()))
      .filter(Boolean),
  );
  const targetProdSet = new Set(
    (block?.target_product_ids ?? "")
      .split(/[\s,]+/)
      .map((s) => Number(s.trim()))
      .filter(Boolean),
  );

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <Link href="/admin/blocks/" className="text-sm text-gray-500 hover:underline">
        ← Danh sách Các Block thường dùng
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">
        {block ? `Sửa Block: ${block.title}` : "Tạo Block thường dùng mới"}
      </h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form action={saveBlockAction} className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
        <input type="hidden" name="id" value={id} />

        {/* Row 1: Title, Slug, Style, Sort */}
        <div className="grid gap-4 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label className={ui.label}>Tiêu đề Block *</label>
            <input
              name="title"
              required
              defaultValue={block?.title}
              placeholder="VD: 💡 3 Nguyên Tắc Vàng Thực Dưỡng"
              className={ui.input}
            />
          </div>
          <div className="sm:col-span-3">
            <label className={ui.label}>Mã nhúng (slug)</label>
            <input
              name="slug"
              defaultValue={block?.slug}
              placeholder="Tự tạo từ tiêu đề"
              className={`${ui.input} font-mono text-xs`}
            />
            {block && (
              <p className="mt-1 text-[11px] text-brand font-mono">
                Mã nhúng: [[block:{block.slug}]]
              </p>
            )}
          </div>
          <div className="sm:col-span-3">
            <label className={ui.label}>Kiểu khung trang trí</label>
            <select name="style_variant" defaultValue={block?.style_variant ?? "emerald"} className={ui.input}>
              {Object.entries(BLOCK_STYLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className={ui.label}>Thứ tự</label>
            <input name="sort" type="number" defaultValue={block?.sort ?? 1} className={ui.input} />
          </div>
        </div>

        {/* Row 2: Frontend Block-Positions */}
        <div className="rounded-xl border border-green-200 bg-green-50/40 p-4 space-y-3">
          <div>
            <div className="text-sm font-bold text-brand">
              📍 Chọn Vị trí hiển thị tự động ngoài Frontend (Block-Position)
            </div>
            <p className="text-xs text-gray-600">
              Bạn có thể chọn 1 hoặc nhiều vị trí để Block tự động xuất hiện ngoài giao diện web, hoặc chọn &quot;Chỉ chèn thủ công&quot; để nhúng bằng mã <code>[[block:slug]]</code>.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.entries(BLOCK_POSITION_LABELS) as [BlockPosition, string][]).map(([posKey, posLabel]) => (
              <label
                key={posKey}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-white px-3 py-2 text-xs font-medium text-gray-800 hover:border-brand"
              >
                <input
                  type="checkbox"
                  name="positions"
                  value={posKey}
                  defaultChecked={activePositions.has(posKey)}
                  className="h-4 w-4 accent-brand"
                />
                <span>{posLabel}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Row 3: Optional Post / Product Specific Attachment */}
        <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-800">
              🎯 Gắn riêng cho Bài viết cụ thể (Không tích chọn = Áp dụng cho TẤT CẢ bài viết)
            </label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-white p-2.5 text-xs">
              {posts.map((po) => (
                <label key={po.id} className="flex cursor-pointer items-center gap-2 py-0.5 hover:text-brand">
                  <input
                    type="checkbox"
                    name="target_post_ids"
                    value={po.id}
                    defaultChecked={targetPostSet.has(po.id)}
                  />
                  <span className="truncate">
                    #{po.id} · {po.title}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-gray-800">
              🛍️ Gắn riêng cho Sản phẩm cụ thể (Không tích chọn = Áp dụng cho TẤT CẢ sản phẩm)
            </label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-white p-2.5 text-xs">
              {products.map((pr) => (
                <label key={pr.id} className="flex cursor-pointer items-center gap-2 py-0.5 hover:text-brand">
                  <input
                    type="checkbox"
                    name="target_product_ids"
                    value={pr.id}
                    defaultChecked={targetProdSet.has(pr.id)}
                  />
                  <span className="truncate">
                    #{pr.sku || pr.id} · {pr.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Row 4: Nested Block Helper Reference + Google Docs ContentEditor */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-bold text-gray-900">
              ✍️ Nội dung của Block (Hỗ trợ chèn Sản phẩm &amp; Lồng Block trong Block)
            </label>
            {allBlocks.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                <span>Mã Block khác có thể lồng vào đây:</span>
                {allBlocks.slice(0, 4).map((ob) => (
                  <code key={ob.id} className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-brand">
                    [[block:{ob.slug}]]
                  </code>
                ))}
              </div>
            )}
          </div>
          <ContentEditor
            name="content_html"
            defaultValue={block?.content_html ?? ""}
            products={products}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button className="rounded-xl bg-brand px-6 py-2.5 font-bold text-white shadow hover:bg-brand-dark">
            💾 Lưu Block thường dùng
          </button>
          <Link href="/admin/blocks/" className={ui.secondary}>
            Huỷ
          </Link>
        </div>
      </form>

      {block && (
        <form action={deleteBlockAction} className="mt-8 border-t pt-6">
          <input type="hidden" name="id" value={block.id} />
          <ConfirmButton
            message="Xoá Block thường dùng này?"
            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Xoá Block này
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
