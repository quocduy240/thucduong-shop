import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageHeader, Pagination, pageParam, strParam, ui } from "@/components/admin/ui";
import { listDocuments } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { vnd } from "@/lib/site";
import { deleteDocumentAction, deleteDocumentLeadAction } from "../actions";

export const metadata = { title: "Tài liệu & Sách | Quản trị" };

const DOC_TYPE_LABELS: Record<string, { label: string; badge: string }> = {
  pdf: { label: "📕 PDF", badge: "bg-red-100 text-red-700" },
  doc: { label: "📘 DOC/Word", badge: "bg-blue-100 text-blue-700" },
  ppt: { label: "📙 Slide PPT", badge: "bg-amber-100 text-amber-800" },
  book: { label: "📗 Sách / Ebook", badge: "bg-emerald-100 text-emerald-800" },
};

const ACCESS_MODE_LABELS: Record<string, { label: string; badge: string }> = {
  free: { label: "Miễn phí tải ngay", badge: "bg-green-100 text-green-700" },
  survey: { label: "Khảo sát / Nhiệm vụ", badge: "bg-purple-100 text-purple-700" },
  bundle: { label: "Tặng phẩm kèm SP", badge: "bg-teal-100 text-teal-800" },
  paid: { label: "Trả phí / Ủng hộ", badge: "bg-orange-100 text-orange-800" },
  affiliate: { label: "Sách & Link Affiliate", badge: "bg-indigo-100 text-indigo-700" },
};

export default async function DocumentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = strParam(sp.q);
  const folder = strParam(sp.folder);
  const docType = strParam(sp.type);
  const accessMode = strParam(sp.access);
  const page = pageParam(sp.page);

  const { rows, total, folders, recentLeads } = await listDocuments({
    q,
    folder,
    docType,
    accessMode,
    page,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Thư viện Tài liệu, Slide & Sách Thực dưỡng">
        <Link href="/thu-vien/tai-lieu-thuc-duong/" target="_blank" className={ui.secondary}>
          Xem Thư viện ngoài web ↗
        </Link>
        <Link href="/admin/documents/new/" className={ui.primary}>
          + Thêm tài liệu / sách
        </Link>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />

      {/* Filter Bar */}
      <form className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Tìm theo tên tài liệu, thư mục, tác giả..."
          className={`${ui.input} max-w-xs`}
        />
        <select name="folder" defaultValue={folder} className={`${ui.input} max-w-xs`}>
          <option value="">📁 Tất cả thư mục Google Drive</option>
          {folders.map((f) => (
            <option key={f.folder_path} value={f.folder_path}>
              {f.folder_path} ({f.n})
            </option>
          ))}
        </select>
        <select name="type" defaultValue={docType} className={`${ui.input} max-w-[170px]`}>
          <option value="">Mọi định dạng</option>
          <option value="pdf">📕 Tài liệu PDF</option>
          <option value="doc">📘 Word / Google Docs</option>
          <option value="ppt">📙 Slide Trình chiếu</option>
          <option value="book">📗 Sách / Ấn phẩm</option>
        </select>
        <select name="access" defaultValue={accessMode} className={`${ui.input} max-w-[190px]`}>
          <option value="">Mọi cơ chế tải</option>
          <option value="free">Miễn phí tải ngay</option>
          <option value="survey">Khảo sát / Nhiệm vụ</option>
          <option value="bundle">Tặng phẩm kèm Sản phẩm</option>
          <option value="paid">Trả phí / Ủng hộ</option>
          <option value="affiliate">Mua Sách / Affiliate</option>
        </select>
        <button className={ui.secondary}>Lọc</button>
        {(q || folder || docType || accessMode) && (
          <Link href="/admin/documents/" className={ui.secondary}>
            Bỏ lọc
          </Link>
        )}
      </form>

      {/* Documents Table */}
      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className={ui.th}>Tài liệu / Sách</th>
              <th className={ui.th}>Cây thư mục Drive</th>
              <th className={ui.th}>Loại</th>
              <th className={ui.th}>Cơ chế mở khóa</th>
              <th className={ui.th}>Lượt tải / Khảo sát</th>
              <th className={ui.th}></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((d) => {
              const tInfo = DOC_TYPE_LABELS[d.doc_type] ?? DOC_TYPE_LABELS.pdf;
              const aInfo = ACCESS_MODE_LABELS[d.access_mode] ?? ACCESS_MODE_LABELS.free;
              return (
                <tr key={d.id}>
                  <td className={`${ui.td} max-w-sm`}>
                    <Link href={`/admin/documents/${d.id}/`} className="font-semibold text-gray-900 hover:text-brand">
                      {d.title}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-500">
                      {d.pages > 0 && <span>{d.pages} trang/slide</span>}
                      {d.file_size && <span>· {d.file_size}</span>}
                      {d.bundle_product_name && (
                        <span className="text-brand">· Kèm SP: {d.bundle_product_name}</span>
                      )}
                    </div>
                  </td>
                  <td className={`${ui.td} text-xs text-gray-600`}>
                    <span className="font-medium">📁 {d.folder_path}</span>
                  </td>
                  <td className={ui.td}>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${tInfo.badge}`}>
                      {tInfo.label}
                    </span>
                  </td>
                  <td className={ui.td}>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${aInfo.badge}`}>
                      {aInfo.label}
                    </span>
                    {d.price > 0 && <div className="mt-0.5 text-xs font-bold text-accent">{vnd(d.price)}</div>}
                  </td>
                  <td className={ui.td}>
                    <div className="text-xs">
                      <div>⬇️ <strong>{d.downloads}</strong> lượt tải</div>
                      {d.leads_count > 0 && (
                        <div className="text-purple-700">📝 {d.leads_count} phản hồi khảo sát</div>
                      )}
                    </div>
                  </td>
                  <td className={`${ui.td} whitespace-nowrap text-right`}>
                    <Link href={`/admin/documents/${d.id}/`} className="mr-3 font-medium text-brand hover:underline">
                      Sửa &amp; Review
                    </Link>
                    <form action={deleteDocumentAction} className="inline">
                      <input type="hidden" name="id" value={d.id} />
                      <ConfirmButton message="Xoá tài liệu này khỏi thư viện?" className="text-xs text-red-600 hover:underline">
                        Xoá
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-gray-500">
                  Không có tài liệu nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        basePath="/admin/documents/"
        page={page}
        total={total}
        params={{
          q: q || undefined,
          folder: folder || undefined,
          type: docType || undefined,
          access: accessMode || undefined,
        }}
      />

      {/* Survey / Unlock Leads Box */}
      {recentLeads.length > 0 && (
        <div className={`${ui.card} p-5`}>
          <h2 className="mb-3 text-base font-bold text-gray-900">
            📋 Khách hàng hoàn thành khảo sát / mở khóa tài liệu gần đây
          </h2>
          <div className="divide-y text-sm">
            {recentLeads.map((l) => (
              <div key={l.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <div className="font-semibold text-gray-800">
                    {l.name} <span className="font-normal text-brand">({l.contact})</span>
                    <span className="ml-2 text-xs text-gray-400">· {l.created_at.slice(0, 16)}</span>
                  </div>
                  <div className="text-xs text-gray-500">Tài liệu: {l.doc_title}</div>
                  <div className="mt-1 text-xs text-gray-700">{l.answer}</div>
                </div>
                <form action={deleteDocumentLeadAction}>
                  <input type="hidden" name="id" value={l.id} />
                  <ConfirmButton message="Xoá bản ghi khảo sát này?" className="text-xs text-red-500 hover:underline">
                    Xoá
                  </ConfirmButton>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
