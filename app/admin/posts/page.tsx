import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageHeader, Pagination, pageParam, strParam, ui } from "@/components/admin/ui";
import { getPostsOverview, listPosts } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getPostCategories, url } from "@/lib/data";
import { deletePostAction } from "../actions";

export const metadata = { title: "Bài viết | Quản trị" };

function buildHref(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && String(v).trim() !== "" && v !== 0) sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `/admin/posts/?${qs}` : "/admin/posts/";
}

export default async function PostsAdmin({ searchParams }: PageProps<"/admin/posts">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = strParam(sp.q);
  const category = Number(strParam(sp.category)) || 0;
  const filter = strParam(sp.filter);
  const page = pageParam(sp.page);

  const [overview, { rows, total }, categories] = await Promise.all([
    getPostsOverview(),
    listPosts({ q, category, filter, page }),
    getPostCategories(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader title="Quản lý Bài viết & Tin tức">
        <Link href="/admin/posts/import/" prefetch={false} className={ui.secondary}>
          🌐 Nhập Bài từ Link / YouTube
        </Link>
        <Link href="/admin/posts/new/" prefetch={false} className={ui.primary}>
          + Thêm bài viết
        </Link>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />

      {/* 4 Clickable KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link
          href="/admin/posts/"
          prefetch={false}
          className={`rounded-2xl border p-4 transition ${
            !filter && !category && !q ? "border-brand bg-green-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">📝 Tổng Bài viết</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{overview.postsTotal}</div>
          <div className="mt-1 text-[11px] text-gray-500">Tất cả bài viết trên web</div>
        </Link>

        <Link
          href={buildHref({ filter: "no_cover" })}
          prefetch={false}
          className={`rounded-2xl border p-4 transition ${
            filter === "no_cover" ? "border-amber-400 bg-amber-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">🖼️ Thiếu ảnh bìa</div>
          <div className={`mt-1 text-2xl font-extrabold ${overview.missingCover > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {overview.missingCover}
          </div>
          <div className="mt-1 text-[11px] text-amber-700">Bấm để lọc bài cần bổ sung ảnh →</div>
        </Link>

        <Link
          href={buildHref({ filter: "no_seo" })}
          prefetch={false}
          className={`rounded-2xl border p-4 transition ${
            filter === "no_seo" ? "border-blue-400 bg-blue-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">🔍 Chưa tối ưu SEO</div>
          <div className={`mt-1 text-2xl font-extrabold ${overview.missingSeo > 0 ? "text-blue-600" : "text-emerald-600"}`}>
            {overview.missingSeo}
          </div>
          <div className="mt-1 text-[11px] text-blue-700">Chưa điền Meta Title / Description →</div>
        </Link>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-bold text-gray-500">🗂️ Chuyên mục</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{overview.categoriesCount}</div>
          <div className="mt-1 text-[11px] text-gray-500">Thiếu mô tả ngắn: {overview.missingExcerpt} bài</div>
        </div>
      </div>

      {/* Search + Category + 1-Click Status Pills */}
      <div className={`${ui.card} p-4 space-y-3`}>
        <form method="get" action="/admin/posts/" className="flex flex-wrap gap-2">
          {filter && <input type="hidden" name="filter" value={filter} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm theo tiêu đề bài viết..."
            className={`${ui.input} max-w-xs`}
          />
          <select name="category" defaultValue={category || ""} className={`${ui.input} max-w-xs`}>
            <option value="">Tất cả chuyên mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.section_slug} / {c.name}
              </option>
            ))}
          </select>
          <button className={ui.secondary}>Tìm &amp; Lọc</button>
          {(q || category || filter) && (
            <Link href="/admin/posts/" prefetch={false} className={ui.secondary}>
              Bỏ lọc
            </Link>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-bold text-gray-500 mr-1">Lọc nhanh:</span>
          {[
            { val: "", label: `Tất cả (${overview.postsTotal})` },
            { val: "no_cover", label: `🖼️ Thiếu ảnh (${overview.missingCover})` },
            { val: "no_excerpt", label: `📝 Thiếu mô tả (${overview.missingExcerpt})` },
            { val: "no_seo", label: `🔍 Chưa tối ưu SEO (${overview.missingSeo})` },
          ].map((opt) => (
            <Link
              key={opt.val || "all"}
              href={buildHref({ q, category, filter: opt.val || undefined })}
              prefetch={false}
              className={`rounded-full border px-3 py-1 font-semibold transition ${
                filter === opt.val
                  ? "border-brand bg-green-50 text-brand"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Posts Table */}
      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className={ui.th}>Ảnh</th>
              <th className={ui.th}>Tiêu đề &amp; Tình trạng SEO</th>
              <th className={ui.th}>Chuyên mục</th>
              <th className={ui.th}>Ngày đăng</th>
              <th className={ui.th}></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => {
              const hasCover = Boolean(p.cover?.trim());
              const hasExcerpt = Boolean(p.excerpt?.trim());
              const hasSeo = Boolean(p.seo_title?.trim() || p.seo_description?.trim());
              return (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <td className={ui.td}>
                    {p.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.cover} alt="" loading="lazy" className="h-12 w-16 rounded-lg object-cover border" />
                    ) : (
                      <span className="grid h-12 w-16 place-items-center rounded-lg border border-dashed border-amber-300 bg-amber-50/50 text-[10px] font-semibold text-amber-700">
                        Chưa có
                      </span>
                    )}
                  </td>
                  <td className={`${ui.td} max-w-md space-y-1`}>
                    <Link
                      href={`/admin/posts/${p.id}/`}
                      prefetch={false}
                      className="block font-semibold text-gray-900 hover:text-brand line-clamp-2"
                    >
                      {p.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="font-mono text-gray-400">/{p.slug}.html</span>
                      {hasSeo ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-semibold text-emerald-700">
                          ✓ Chuẩn SEO
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 font-semibold text-blue-700">
                          Chưa điền SEO
                        </span>
                      )}
                      {!hasCover && (
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 font-semibold text-amber-700">
                          Thiếu ảnh
                        </span>
                      )}
                      {!hasExcerpt && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                          Thiếu mô tả
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={ui.td}>
                    <Link
                      href={buildHref({
                        category: categories.find((c) => c.slug === p.category_slug && c.section_slug === p.section_slug)?.id,
                      })}
                      prefetch={false}
                      title="Bấm để lọc theo chuyên mục này"
                      className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-brand"
                    >
                      {p.section_slug} / {p.category_name}
                    </Link>
                  </td>
                  <td className={`${ui.td} whitespace-nowrap text-xs text-gray-500`}>{p.created_at.slice(0, 10)}</td>
                  <td className={`${ui.td} whitespace-nowrap text-right`}>
                    <Link
                      href={url.post(p)}
                      target="_blank"
                      prefetch={false}
                      className="mr-2.5 text-xs text-gray-500 hover:text-brand"
                      title="Xem bài viết ngoài trang"
                    >
                      👁️ Xem
                    </Link>
                    <Link
                      href={`/admin/posts/${p.id}/`}
                      prefetch={false}
                      className="mr-3 text-xs font-bold text-brand hover:underline"
                    >
                      ✏️ Sửa
                    </Link>
                    <form action={deletePostAction} className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton message="Xoá bài viết này? Không thể hoàn tác." className="text-xs text-red-600 hover:underline">
                        Xoá
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-gray-500">
                  Không có bài viết nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        basePath="/admin/posts/"
        page={page}
        total={total}
        params={{
          q: q || undefined,
          category: category ? String(category) : undefined,
          filter: filter || undefined,
        }}
      />
    </div>
  );
}
