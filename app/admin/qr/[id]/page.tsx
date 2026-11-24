import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { ui } from "@/components/admin/ui";
import { requireAdminPath } from "@/lib/auth";
import { getPosts, getProducts } from "@/lib/data";
import { getQrCodeById, QR_POSITION_LABELS, type QrPosition } from "@/lib/qr";
import { deleteQrAction, saveQrAction } from "../../actions";

export const metadata = { title: "Soạn thảo QR_Block | Quản trị" };

export default async function QrEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPath("/admin/qr/");
  const { id: rawId } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const id = rawId === "new" ? 0 : Number(rawId);
  if (rawId !== "new" && !Number.isInteger(id)) notFound();

  const [qr, posts, products] = await Promise.all([
    id ? getQrCodeById(id) : Promise.resolve(undefined),
    getPosts({ limit: 100 }),
    getProducts(200),
  ]);
  if (id && !qr) notFound();

  const activePositions = new Set(
    (qr?.positions ?? "manual")
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const targetPostSet = new Set(
    (qr?.target_post_ids ?? "")
      .split(/[\s,]+/)
      .map((s) => Number(s.trim()))
      .filter(Boolean),
  );
  const targetProdSet = new Set(
    (qr?.target_product_ids ?? "")
      .split(/[\s,]+/)
      .map((s) => Number(s.trim()))
      .filter(Boolean),
  );

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <Link href="/admin/qr/" className="text-sm text-gray-500 hover:underline">
        ← Danh sách QR Code Động
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">
        {qr ? `Sửa QR_Block: ${qr.name}` : "Tạo QR Code Động (QR_Block) mới"}
      </h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form action={saveQrAction} className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
        <input type="hidden" name="id" value={id} />

        <div className="grid gap-4 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label className={ui.label}>Tên riêng của QR Code *</label>
            <input
              name="name"
              required
              defaultValue={qr?.name}
              placeholder="VD: QR Đặt mua Gạo Lứt Huyết Rồng"
              className={ui.input}
            />
          </div>
          <div className="sm:col-span-4">
            <label className={ui.label}>Mã định danh (slug)</label>
            <input
              name="slug"
              defaultValue={qr?.slug}
              placeholder="Tự tạo từ tên riêng"
              className={`${ui.input} font-mono text-xs`}
            />
            {qr && (
              <p className="mt-1 text-[11px] font-mono text-brand">
                Shortcode nhúng: [[qr:{qr.slug}]]
              </p>
            )}
          </div>
          <div className="sm:col-span-3">
            <label className={ui.label}>Kiểu khung QR_Block</label>
            <select name="style_variant" defaultValue={qr?.style_variant ?? "emerald"} className={ui.input}>
              <option value="emerald">🌿 Khung Xanh Thực dưỡng</option>
              <option value="amber">🍯 Khung Vàng Ấm Áp</option>
              <option value="blue">💎 Khung Xanh Dương</option>
              <option value="neutral">📄 Khung Trắng Viền Xám</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-12">
          <div className="sm:col-span-7">
            <label className={ui.label}>Link đích khi quét mã QR * (Có thể đổi bất cứ lúc nào)</label>
            <input
              name="target_url"
              required
              defaultValue={qr?.target_url ?? "https://"}
              placeholder="VD: https://zalo.me/0767518592 hoặc /san-pham/..."
              className={ui.input}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Màu mã QR</label>
            <input
              type="color"
              name="fg_color"
              defaultValue={qr?.fg_color ?? "#14532d"}
              className="h-10 w-full cursor-pointer rounded-lg border bg-white p-1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Màu nền QR</label>
            <input
              type="color"
              name="bg_color"
              defaultValue={qr?.bg_color ?? "#ffffff"}
              className="h-10 w-full cursor-pointer rounded-lg border bg-white p-1"
            />
          </div>
          <div className="sm:col-span-1">
            <label className={ui.label}>Thứ tự</label>
            <input name="sort" type="number" defaultValue={qr?.sort ?? 1} className={ui.input} />
          </div>
        </div>

        <div>
          <label className={ui.label}>Mô tả / Lời kêu gọi dưới mã QR (Caption)</label>
          <input
            name="caption"
            defaultValue={qr?.caption}
            placeholder="VD: Quét mã bằng camera điện thoại để xem hướng dẫn chi tiết hoặc đặt mua nhanh"
            className={ui.input}
          />
        </div>

        {/* Vị trí hiển thị như một Block-Position (gồm cả Video, Ảnh SP, Ảnh bài viết) */}
        <div className="rounded-xl border border-green-200 bg-green-50/40 p-4 space-y-3">
          <div>
            <div className="text-sm font-bold text-brand">
              📍 Chọn Vị trí hiển thị của QR_Block (Bài viết · Sản phẩm · Khung Video · Hình ảnh)
            </div>
            <p className="text-xs text-gray-600">
              Chọn một hoặc nhiều vị trí để tự động hiển thị, hoặc dùng mã <code>[[qr:slug]]</code> để chèn vào bất kỳ vị trí nào trong bài viết hay bên trong một Block khác.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.entries(QR_POSITION_LABELS) as [QrPosition, string][]).map(([posKey, posLabel]) => (
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

        {/* Gắn riêng cho bài viết hoặc sản phẩm cụ thể */}
        <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-800">
              🎯 Gắn riêng cho Bài viết cụ thể (Không tích chọn = Áp dụng TẤT CẢ)
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
              🛍️ Gắn riêng cho Sản phẩm cụ thể (Không tích chọn = Áp dụng TẤT CẢ)
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

        <div className="flex items-center gap-3 pt-2">
          <button className="rounded-xl bg-brand px-6 py-2.5 font-bold text-white shadow hover:bg-brand-dark cursor-pointer">
            💾 Lưu QR_Block
          </button>
          <Link href="/admin/qr/" className={ui.secondary}>
            Huỷ
          </Link>
        </div>
      </form>

      {qr && (
        <form action={deleteQrAction} className="mt-8 border-t pt-6">
          <input type="hidden" name="id" value={qr.id} />
          <ConfirmButton
            message={`Xoá mã QR "${qr.name}"?`}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Xoá QR Code này
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
