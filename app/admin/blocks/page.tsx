import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageHeader, ui } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import {
  BLOCK_POSITION_LABELS,
  BLOCK_STYLE_LABELS,
  expandNestedBlocks,
  getAllBlocks,
  wrapBlockCard,
  type BlockPosition,
} from "@/lib/blocks";
import { deleteBlockAction, toggleBlockAction } from "../actions";

export const metadata = { title: "Các Block thường dùng | Quản trị" };

export default async function BlocksAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const blocks = await getAllBlocks();
  const blockMap = new Map(blocks.map((b) => [b.slug, b]));

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader title="Quản lý Các Block Thường Dùng (Reusable Blocks & Block-Positions)">
        <Link href="/admin/blocks/new/" className={ui.primary}>
          + Tạo Block mới
        </Link>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />

      {/* Guide Callout */}
      <div className="rounded-2xl border border-green-200 bg-green-50/50 p-4 text-xs text-gray-700 space-y-1.5">
        <div className="text-sm font-bold text-brand">
          🧩 Cách hoạt động của Hệ thống Block Thường Dùng (Tái sử dụng &amp; Lồng Block trong Block)
        </div>
        <p>
          • <strong>Cách 1 — Gắn tự động theo Vị trí (Block-Position):</strong> Chọn vị trí như <code>Đầu bài viết</code>, <code>Giữa bài viết</code>, <code>Cuối bài viết</code>, <code>Sidebar bài viết</code>, <code>Cuối mô tả sản phẩm</code>, <code>Sidebar sản phẩm</code> hoặc <code>Trang chủ</code> (có thể áp dụng cho tất cả hoặc chỉ gắn riêng cho một số bài viết/sản phẩm chỉ định).
        </p>
        <p>
          • <strong>Cách 2 — Nhúng vào bất kỳ đâu hoặc Chèn Block trong Block:</strong> Dùng mã <code>[[block:ma-block]]</code> hoặc bấm nút <strong>&quot;🧩 + Chèn Block Thường Dùng&quot;</strong> trong trình soạn thảo bài viết / trang tĩnh / hoặc ngay bên trong một Block khác. Khi bạn sửa nội dung Block tại đây, mọi nơi đang nhúng Block đó sẽ <strong>tự động cập nhật đồng bộ</strong>!
        </p>
      </div>

      {/* Blocks List */}
      <div className="space-y-4">
        {await Promise.all(
          blocks.map(async (b) => {
            const posList = b.positions
              .split(/[\s,]+/)
              .map((s) => s.trim())
              .filter(Boolean) as BlockPosition[];
            const nestedSlugs = [...b.content_html.matchAll(/\[\[\s*block\s*:\s*([a-zA-Z0-9_-]+)\s*\]\]/gi)].map(
              (m) => m[1],
            );
            const styleInfo = BLOCK_STYLE_LABELS[b.style_variant] ?? BLOCK_STYLE_LABELS.emerald;
            const previewHtml = wrapBlockCard(
              b,
              await expandNestedBlocks(b.content_html, 1, new Set([b.slug]), blockMap),
            );

          return (
            <div key={b.id} className={`${ui.card} p-5 space-y-4`}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-3.5">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/blocks/${b.id}/`} className="text-base font-bold text-gray-900 hover:text-brand">
                      {b.title}
                    </Link>
                    <code className="rounded-md bg-green-100 px-2.5 py-0.5 font-mono text-xs font-bold text-brand">
                      [[block:{b.slug}]]
                    </code>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {styleInfo.label}
                    </span>
                  </div>

                  {/* Assigned Positions */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-semibold text-gray-500">Vị trí hiển thị (Block-Position):</span>
                    {posList.map((pos) => (
                      <span
                        key={pos}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand"
                      >
                        {BLOCK_POSITION_LABELS[pos] ?? pos}
                      </span>
                    ))}
                  </div>

                  {/* Targeting & Nested info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span>
                      🎯 Bài viết áp dụng:{" "}
                      <strong>{b.target_post_ids ? `ID #${b.target_post_ids}` : "Tất cả bài viết"}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      🛍️ Sản phẩm áp dụng:{" "}
                      <strong>{b.target_product_ids ? `ID #${b.target_product_ids}` : "Tất cả sản phẩm"}</strong>
                    </span>
                    {nestedSlugs.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-purple-700">
                          🔗 Đang lồng {nestedSlugs.length} Block con: {nestedSlugs.map((s) => `[[block:${s}]]`).join(", ")}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5">
                  <form action={toggleBlockAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="active" value={b.active ? 0 : 1} />
                    <button
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        b.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {b.active ? "● Đang hiển thị" : "○ Đang tắt"}
                    </button>
                  </form>
                  <Link href={`/admin/blocks/${b.id}/`} className={ui.secondary}>
                    ✏️ Sửa Block
                  </Link>
                  <form action={deleteBlockAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <ConfirmButton message="Xoá Block thường dùng này?" className={ui.danger}>
                      Xoá
                    </ConfirmButton>
                  </form>
                </div>
              </div>

              {/* Live Rendered Preview */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-semibold text-brand hover:underline">
                  👁️ Xem trước giao diện hiển thị của Block này (bao gồm cả Block con lồng bên trong)
                </summary>
                <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4">
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
              </details>
            </div>
          );
          }),
        )}
      </div>
    </div>
  );
}
