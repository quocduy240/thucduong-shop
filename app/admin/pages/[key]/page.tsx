import Link from "next/link";
import { notFound } from "next/navigation";
import ContentEditor from "@/components/admin/ContentEditor";
import { Flash, PageHeader, ui } from "@/components/admin/ui";
import { getPageRow } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { savePageAction } from "../../actions";

export const metadata = { title: "Sửa trang | Quản trị" };

// key = "<group or ->__<slug>", e.g. "-__gioi-thieu" or "chinh-sach__huong-dan-mua-hang"
export default async function PageEdit({ params, searchParams }: PageProps<"/admin/pages/[key]">) {
  await requireAdmin();
  const { key } = await params;
  const sp = await searchParams;
  const [g, slug] = decodeURIComponent(key).split("__");
  const grp = g === "-" ? "" : g;
  const page = slug ? await getPageRow(grp, slug) : undefined;
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/pages/" className="text-sm text-gray-500 hover:underline">← Trang tĩnh</Link>
      <PageHeader title="Sửa trang" />
      <Flash saved={sp.saved} error={sp.error} />
      <form action={savePageAction} className={`${ui.card} space-y-4 p-6`}>
        <input type="hidden" name="grp" value={page.grp} />
        <input type="hidden" name="slug" value={page.slug} />
        <div>
          <label className={ui.label}>Tiêu đề *</label>
          <input name="title" required defaultValue={page.title} className={ui.input} />
        </div>
        <div>
          <label className={ui.label}>Nội dung</label>
          <ContentEditor name="content" defaultValue={page.content} />
        </div>
        <button className={ui.primary}>Lưu</button>
      </form>
    </div>
  );
}
