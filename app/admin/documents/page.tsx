import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageHeader, Pagination, pageParam, strParam, ui } from "@/components/admin/ui";
import { getDocumentsOverview, listDocuments } from "@/lib/admin-data";
import { requireAdminPath } from "@/lib/auth";
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
  affiliate: { label: "Sách & Affiliate", badge: "bg-indigo-100 text-indigo-700" },
};

function buildHref(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && String(v).trim() !== "") sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `/admin/documents/?${qs}` : "/admin/documents/";
}

export default async function DocumentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPath("/admin/documents/");
  const sp = await searchParams;
  const activeTab = strParam(sp.tab) === "leads" ? "leads" : "docs";
  const q = strParam(sp.q);
  const folder = strParam(sp.folder);
  const docType = strParam(sp.type);
  const accessMode = strParam(sp.access);
  const page = pageParam(sp.page);

  const [overview, docsData] = await Promise.all([
    getDocumentsOverview(),
    listDocuments({
      q,
      folder,
      docType,
      accessMode,
      page,
      includeLeads: activeTab === "leads",
    }),
  ]);
  const { rows, total, folders, recentLeads } = docsData;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader title="Thư viện Tài liệu, Slide & Sách Thực dưỡng">
        <Link href="/thu-vien/tai-lieu-thuc-duong/" target="_blank" prefetch={false} className={ui.secondary}>
          Xem Thư viện ngoài web ↗
        </Link>
        <Link href="/admin/documents/new/" prefetch={false} className={ui.primary}>
          + Thêm tài liệu / sách
        </Link>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />

      {/* 4 Clickable KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link
          href={buildHref({ tab: "docs" })}
          prefetch={false}
          className={`rounded-2xl border p-4 transition ${
            activeTab === "docs" ? "border-brand bg-green-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">📚 Tổng Tài liệu &amp; Sách</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{overview.docsTotal}</div>
          <div className="mt-1 text-[11px] text-gray-500">PDF, Word, Slide, Ebook</div>
        </Link>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-bold text-gray-500">⬇️ Tổng lượt tải</div>
          <div className="mt-1 text-2xl font-extrabold text-brand">{overview.totalDownloads}</div>
          <div className="mt-1 text-[11px] text-gray-500">Lượt tải tích luỹ toàn thư viện</div>
        </div>

        <Link
          href={buildHref({ tab: "leads" })}
          prefetch={false}
          className={`rounded-2xl border p-4 transition ${
            activeTab === "leads" ? "border-brand bg-green-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">📋 Khách mở khoá / Khảo sát</div>
          <div className="mt-1 text-2xl font-extrabold text-purple-700">{overview.leadsTotal}</div>
          <div className="mt-1 text-[11px] text-purple-700">Bấm để xem danh sách Leads →</div>
        </Link>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-bold text-gray-500">📁 Thư mục Google Drive</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{overview.foldersCount}</div>
          <div className="mt-1 text-[11px] text-gray-500">Nhóm phân loại tài liệu</div>
        </div>
      </div>

      {/* 2-Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref({ tab: "docs" })}
            prefetch={false}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "docs"
                ? "bg-brand text-white shadow-xs"
                : "border bg-white text-gray-700 hover:border-brand hover:text-brand"
            }`}
          >
            📚 Kho Tài liệu &amp; Sách ({overview.docsTotal})
          </Link>
          <Link
            href={buildHref({ tab: "leads" })}
            prefetch={false}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "leads"
                ? "bg-brand text-white shadow-xs"
                : "border bg-white text-gray-700 hover:border-brand hover:text-brand"
            }`}
          >
            📋 Khách hàng Khảo sát / Mở khoá ({overview.leadsTotal})
          </Link>
        </div>
      </div>

      {activeTab === "docs" && (
        <>
          {/* Search + Folder + 1-Click Filter Pills */}
          <div className={`${ui.card} p-4 space-y-3`}>
            <form method="get" action="/admin/documents/" className="flex flex-wrap items-center gap-2">
              {docType && <input type="hidden" name="type" value={docType} />}
              {accessMode && <input type="hidden" name="access" value={accessMode} />}
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
              <button className={ui.secondary}>Tìm &amp; Lọc</button>
              {(q || folder || docType || accessMode) && (
                <Link href="/admin/documents/" prefetch={false} className={ui.secondary}>
                  Bỏ tất cả lọc
                </Link>
              )}
            </form>

            {/* 1-Click Format Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-gray-500 mr-1">Định dạng:</span>
              {[
                { val: "", label: "Tất cả" },
                { val: "pdf", label: "📕 PDF" },
                { val: "doc", label: "📘 Word / Docs" },
                { val: "ppt", label: "📙 Slide PPT" },
                { val: "book", label: "📗 Sách / Ebook" },
              ].map((opt) => (
                <Link
                  key={opt.val || "all-type"}
                  href={buildHref({ q, folder, type: opt.val || undefined, access: accessMode })}
                  prefetch={false}
                  className={`rounded-full border px-3 py-1 font-semibold transition ${
                    docType === opt.val
                      ? "border-brand bg-green-50 text-brand"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>

            {/* 1-Click Access Mode Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-gray-500 mr-1">Cơ chế tải:</span>
              {[
                { val: "", label: "Tất cả" },
                { val: "free", label: "Miễn phí" },
                { val: "survey", label: "Khảo sát" },
                { val: "bundle", label: "Tặng kèm SP" },
                { val: "paid", label: "Trả phí" },
                { val: "affiliate", label: "Affiliate" },
              ].map((opt) => (
                <Link
                  key={opt.val || "all-access"}
                  href={buildHref({ q, folder, type: docType, access: opt.val || undefined })}
                  prefetch={false}
                  className={`rounded-full border px-3 py-1 font-semibold transition ${
                    accessMode === opt.val
                      ? "border-brand bg-green-50 text-brand"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Documents Table */}
          <div className={`${ui.card} overflow-x-auto`}>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className={ui.th}>Tài liệu / Sách</th>
                  <th className={ui.th}>Thư mục Drive</th>
                  <th className={ui.th}>Loại</th>
                  <th className={ui.th}>Cơ chế mở khoá</th>
                  <th className={ui.th}>Thống kê</th>
                  <th className={ui.th}></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((d) => {
                  const tInfo = DOC_TYPE_LABELS[d.doc_type] ?? DOC_TYPE_LABELS.pdf;
                  const aInfo = ACCESS_MODE_LABELS[d.access_mode] ?? ACCESS_MODE_LABELS.free;
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/60">
                      <td className={`${ui.td} max-w-sm`}>
                        <Link
                          href={`/admin/documents/${d.id}/`}
                          prefetch={false}
                          className="font-semibold text-gray-900 hover:text-brand"
                        >
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
                        <Link
                          href={buildHref({ folder: d.folder_path })}
                          prefetch={false}
                          title="Bấm để lọc theo thư mục này"
                          className="inline-block rounded bg-gray-100 px-2 py-0.5 font-medium hover:bg-emerald-50 hover:text-brand"
                        >
                          📁 {d.folder_path}
                        </Link>
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
                            <div className="text-purple-700">📝 {d.leads_count} khảo sát</div>
                          )}
                        </div>
                      </td>
                      <td className={`${ui.td} whitespace-nowrap text-right`}>
                        <a
                          href={`/thu-vien/tai-lieu-thuc-duong/?q=${encodeURIComponent(d.title)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mr-2.5 text-xs text-gray-500 hover:text-brand"
                          title="Xem ngoài thư viện"
                        >
                          👁️
                        </a>
                        <Link
                          href={`/admin/documents/${d.id}/`}
                          prefetch={false}
                          className="mr-3 font-medium text-brand hover:underline"
                        >
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
        </>
      )}

      {/* TAB 2: SURVEY / UNLOCK LEADS */}
      {activeTab === "leads" && (
        <div className={`${ui.card} p-5 space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                📋 Khách hàng hoàn thành khảo sát / mở khoá tài liệu ({recentLeads.length} gần nhất)
              </h2>
              <p className="text-xs text-gray-500">
                Danh sách người dùng đã gửi thông tin liên hệ &amp; trả lời khảo sát để mở khoá tài liệu.
              </p>
            </div>
          </div>

          {recentLeads.length > 0 ? (
            <div className="divide-y text-sm">
              {recentLeads.map((l) => (
                <div key={l.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-gray-900">
                      {l.name} <span className="font-medium text-brand">({l.contact})</span>
                      <span className="ml-2 text-xs font-normal text-gray-400">· {l.created_at.slice(0, 16)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Tài liệu: <strong className="text-gray-700">{l.doc_title}</strong>
                    </div>
                    <div className="text-xs text-gray-700">{l.answer}</div>
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
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">
              Chưa có khách hàng nào hoàn thành khảo sát mở khoá tài liệu.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
