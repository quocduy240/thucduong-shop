import Link from "next/link";
import {
  saveKiotVietConfigAction,
  syncKiotVietInventoryAction,
  testKiotVietAction,
} from "@/app/admin/actions";
import KiotVietExcelImport from "@/components/admin/KiotVietExcelImport";
import { Flash, PageHeader, ui } from "@/components/admin/ui";
import { requireRole } from "@/lib/auth";
import { getKiotVietConfig } from "@/lib/kiotviet";

export const metadata = { title: "Kết nối KiotViet | Quản trị" };

export default async function KiotVietAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; msg?: string }>;
}) {
  await requireRole(["super_admin", "admin"]);
  const sp = await searchParams;
  const cfg = await getKiotVietConfig();

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <PageHeader title="🔗 Kết nối & Đồng bộ KiotViet (API + Webhook)">
        <Link href="/admin/orders/" prefetch={false} className={ui.secondary}>
          🧾 Đơn hàng
        </Link>
        <Link href="/admin/inventory/" prefetch={false} className={ui.secondary}>
          📦 Kho &amp; Sổ quỹ
        </Link>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />
      {sp.msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-800">
          ✓ {sp.msg}
        </div>
      )}

      <KiotVietExcelImport />

      {/* Status + Sync Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className={`${ui.card} p-5 space-y-2`}>
          <div className="text-xs font-bold uppercase text-gray-500">Trạng thái cầu nối KiotViet</div>
          <div className="text-lg font-extrabold">
            {cfg.enabled && cfg.retailer && cfg.clientId ? (
              <span className="text-emerald-600">🟢 Đã bật · Gian hàng: {cfg.retailer}</span>
            ) : (
              <span className="text-amber-600">⚪ Chưa cấu hình đầy đủ</span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Lấy <code>ClientId</code> &amp; <code>ClientSecret</code> tại KiotViet →{" "}
            <strong>Thiết lập cửa hàng → Thiết lập kết nối API</strong>.
          </p>
        </div>

        <div className={`${ui.card} p-5 flex flex-col justify-between space-y-3`}>
          <div>
            <div className="text-xs font-bold uppercase text-gray-500">Đồng bộ Tồn kho từ KiotViet về Web</div>
            <p className="mt-1 text-xs text-gray-600">
              Khớp theo <strong>Mã SKU sản phẩm</strong> (<code>products.sku</code> ↔ Mã hàng KiotViet).
            </p>
          </div>
          <form action={syncKiotVietInventoryAction}>
            <button
              type="submit"
              className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark cursor-pointer"
            >
              🔄 Đồng bộ Tồn kho từ KiotViet ngay
            </button>
          </form>
        </div>
      </div>

      {/* API Config Form */}
      <form action={saveKiotVietConfigAction} className={`${ui.card} p-6 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">1. Thông số kết nối KiotViet Public API</h2>
            <p className="text-xs text-gray-500">
              Dùng để đẩy đơn hàng từ website sang KiotViet và đồng bộ tồn kho 2 chiều.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
            <input type="checkbox" name="enabled" value="1" defaultChecked={cfg.enabled} className="accent-brand" />
            <span>Bật kết nối KiotViet</span>
          </label>
        </div>

        <details className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 text-xs text-gray-700">
          <summary className="cursor-pointer font-bold text-blue-800 select-none">
            📖 Hướng dẫn lấy Client ID &amp; Client Secret từ KiotViet (Bấm để xem)
          </summary>
          <div className="mt-3 space-y-2 border-t border-blue-200/70 pt-3 leading-relaxed">
            <p>
              <strong>Bước 1 — Đảm bảo gian hàng đã bật Kết nối API:</strong> Đăng nhập KiotViet (tài khoản Admin chủ gian hàng) →{" "}
              <strong>Thiết lập (⚙️) → Cửa hàng → Kết nối API</strong>. Nếu chưa thấy mục này, hãy gọi tổng đài{" "}
              <strong>1900 6522</strong> hoặc gửi email tới <strong>hotro@kiotviet.com</strong> yêu cầu bật tính năng{" "}
              <em>&ldquo;Kết nối API (Public API)&rdquo;</em> cho gian hàng <code>{cfg.retailer || "phuoctho88"}</code>.
            </p>
            <p>
              <strong>Bước 2 — Tạo mã bảo mật (có OTP):</strong> Trong mục <em>Kết nối API</em> bấm <strong>Chỉnh sửa</strong> → nhập SĐT đăng ký hợp đồng → bấm{" "}
              <strong>Nhận mã xác thực (OTP)</strong> → bấm <strong>Tạo mã</strong> tại ô <em>Mã bảo mật (Client Secret)</em> → tích{" "}
              <strong>Đồng ý</strong> và <strong>tích chọn quyền truy xuất Khách hàng, Hoá đơn, Đặt hàng</strong> → bấm <strong>Lưu</strong>.
            </p>
            <p>
              <strong>Bước 3 — Kết nối:</strong> Copy <strong>Client ID</strong> và <strong>Client Secret</strong> dán vào các ô bên dưới → bấm{" "}
              <strong>🔌 Lưu &amp; Kiểm tra kết nối API</strong>.
            </p>
          </div>
        </details>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={ui.label}>Tên gian hàng (Retailer) *</label>
            <input
              name="retailer"
              defaultValue={cfg.retailer}
              placeholder="VD: thucduongphuctho"
              className={ui.input}
            />
          </div>
          <div>
            <label className={ui.label}>Branch ID (Chi nhánh mặc định)</label>
            <input
              name="branch_id"
              defaultValue={cfg.branchId}
              placeholder="Để trống sẽ tự lấy chi nhánh đầu tiên khi Test"
              className={ui.input}
            />
          </div>
          <div>
            <label className={ui.label}>Client ID *</label>
            <input
              name="client_id"
              defaultValue={cfg.clientId}
              placeholder="UUID Client ID từ KiotViet"
              className={`${ui.input} font-mono text-xs`}
            />
          </div>
          <div>
            <label className={ui.label}>Client Secret *</label>
            <input
              name="client_secret"
              type="password"
              defaultValue={cfg.clientSecret}
              placeholder="Secret Key từ KiotViet"
              autoComplete="new-password"
              className={`${ui.input} font-mono text-xs`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Webhook Secret (Tuỳ chọn bảo mật Webhook)</label>
            <input
              name="webhook_secret"
              defaultValue={cfg.webhookSecret}
              placeholder="Chuỗi bí mật gửi kèm header hoặc query ?secret=..."
              className={`${ui.input} font-mono text-xs`}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
          <input type="checkbox" name="auto_push" value="1" defaultChecked={cfg.autoPush} className="accent-brand" />
          <span>Ưu tiên gợi ý đẩy đơn sang KiotViet ngay trong trang chi tiết đơn hàng</span>
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" className={ui.primary}>
            💾 Lưu cấu hình KiotViet
          </button>
          <button type="submit" formAction={testKiotVietAction} className={ui.secondary}>
            🔌 Lưu &amp; Kiểm tra kết nối API
          </button>
        </div>
      </form>

      {/* Webhook & CSV Fallback Guide */}
      <div className={`${ui.card} p-5 space-y-3`}>
        <h2 className="text-base font-bold text-gray-900">2. Webhook nhận tồn kho Real-time &amp; Xuất CSV dự phòng</h2>
        <div className="rounded-xl bg-gray-50 p-3 text-xs space-y-1.5">
          <div className="font-bold text-gray-700">URL Webhook nhận cập nhật từ KiotViet (POST JSON):</div>
          <code className="block rounded border bg-white px-3 py-2 font-mono text-brand select-all">
            https://thucduongshop.duyvo.win/api/kiotviet/webhook/
          </code>
          <p className="text-gray-500">
            Hỗ trợ sự kiện <code>product.update</code> / <code>stock.update</code> để tự động cập nhật tồn kho về web theo SKU.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-xs">
          <span>
            <strong>Chưa bật gói API KiotViet?</strong> Bạn vẫn có thể xuất file CSV đúng chuẩn Import KiotViet để nạp đơn hàng loạt:
          </span>
          <a href="/admin/orders/export-kiotviet/" className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700">
            ⬇️ Xuất CSV Đơn chuẩn KiotViet
          </a>
        </div>
      </div>
    </div>
  );
}
