import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageHeader, ui } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getAllQrCodes, QR_POSITION_LABELS, type QrPosition } from "@/lib/qr";
import { deleteQrAction, toggleQrAction, updateQrUrlQuickAction } from "../actions";

export const metadata = { title: "QR Code Động (QR_Block) | Quản trị" };

export default async function QrAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const qrCodes = await getAllQrCodes();
  const totalScans = qrCodes.reduce((s, q) => s + q.scans, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader title="📱 Trình Tạo & Quản Lý QR Code Động (QR_Block)">
        <Link href="/admin/qr/new/" className={ui.primary}>
          + Tạo QR Code mới
        </Link>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`${ui.card} p-4`}>
          <div className="text-xs text-gray-500">Tổng số mã QR Động</div>
          <div className="mt-1 text-2xl font-extrabold text-brand">{qrCodes.length} mã</div>
        </div>
        <div className={`${ui.card} p-4`}>
          <div className="text-xs text-gray-500">Tổng lượt quét (Scans)</div>
          <div className="mt-1 text-2xl font-extrabold text-accent">{totalScans} lượt</div>
        </div>
        <div className={`${ui.card} p-4 text-xs text-gray-600`}>
          <strong className="text-brand">💡 Cơ chế Dynamic QR:</strong> Ảnh mã QR luôn cố định theo link <code>/q/&lt;slug&gt;</code>. Bạn có thể <strong>đổi Link đích bất cứ lúc nào</strong> mà không cần vẽ lại hay in lại mã QR!
        </div>
      </div>

      <div className="space-y-4">
        {qrCodes.map((qr) => {
          const posList = qr.positions
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean) as QrPosition[];

          return (
            <div key={qr.id} className={`${ui.card} p-5 flex flex-col md:flex-row gap-5 items-start`}>
              {/* Left: Live Vector QR Preview & Download */}
              <div className="shrink-0 text-center space-y-2">
                <a
                  href={`/q/${encodeURIComponent(qr.slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border bg-white p-2 shadow-xs hover:border-brand"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/qr/${encodeURIComponent(qr.slug)}`}
                    alt={qr.name}
                    className="h-32 w-32"
                  />
                </a>
                <div className="flex items-center justify-center gap-1.5">
                  <a
                    href={`/api/qr/${encodeURIComponent(qr.slug)}?download=1`}
                    className="rounded border bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    📥 Tải SVG
                  </a>
                  <span className="rounded bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800">
                    👁️ {qr.scans} quét
                  </span>
                </div>
              </div>

              {/* Right: Details + Inline Quick URL Edit */}
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/qr/${qr.id}/`} className="text-base font-bold text-gray-900 hover:text-brand">
                        {qr.name}
                      </Link>
                      <code className="rounded bg-green-100 px-2 py-0.5 font-mono text-xs font-bold text-brand">
                        [[qr:{qr.slug}]]
                      </code>
                    </div>
                    {qr.caption && <p className="mt-0.5 text-xs text-gray-500">{qr.caption}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <form action={toggleQrAction}>
                      <input type="hidden" name="id" value={qr.id} />
                      <input type="hidden" name="active" value={qr.active ? 0 : 1} />
                      <button
                        className={`rounded-full px-3 py-1 text-xs font-bold cursor-pointer ${
                          qr.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {qr.active ? "● Đang bật" : "○ Đang tắt"}
                      </button>
                    </form>
                    <Link href={`/admin/qr/${qr.id}/`} className={ui.secondary}>
                      ✏️ Sửa thuộc tính Block
                    </Link>
                    <form action={deleteQrAction}>
                      <input type="hidden" name="id" value={qr.id} />
                      <ConfirmButton message={`Xoá mã QR "${qr.name}"?`} className={ui.danger}>
                        Xoá
                      </ConfirmButton>
                    </form>
                  </div>
                </div>

                {/* Inline Quick Change Target URL */}
                <form action={updateQrUrlQuickAction} className="flex flex-wrap items-center gap-2 rounded-xl border bg-gray-50 p-2.5">
                  <input type="hidden" name="id" value={qr.id} />
                  <span className="text-xs font-bold text-gray-700">🔗 Link đích khi quét:</span>
                  <input
                    name="target_url"
                    defaultValue={qr.target_url}
                    required
                    className="min-w-[220px] flex-1 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium outline-none focus:border-brand"
                  />
                  <button className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark cursor-pointer">
                    Cập nhật link ngay
                  </button>
                </form>

                {/* Assigned Positions */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-semibold text-gray-500">Vị trí hiển thị (QR_Block):</span>
                  {posList.map((pos) => (
                    <span
                      key={pos}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand"
                    >
                      {QR_POSITION_LABELS[pos] ?? pos}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
