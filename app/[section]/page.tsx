import { notFound } from "next/navigation";
import { getPage, getPostSection } from "@/lib/data";
import { PostList, StaticPage } from "@/components/PostViews";

/**
 * One top-level segment:
 *   /thuc-duong/        → post section listing
 *   /gioi-thieu.html    → static page
 */
function resolve(segment: string) {
  if (segment.endsWith(".html")) {
    const page = getPage("", segment.slice(0, -5));
    return page ? ({ kind: "page", page } as const) : undefined;
  }
  const section = getPostSection(segment);
  return section ? ({ kind: "section", section } as const) : undefined;
}

export async function generateMetadata({ params }: PageProps<"/[section]">) {
  const r = resolve((await params).section);
  return { title: r ? (r.kind === "page" ? r.page.title : r.section.name) : "Không tìm thấy" };
}

export default async function Page({ params }: PageProps<"/[section]">) {
  const r = resolve((await params).section);
  if (!r) notFound();
  return r.kind === "page" ? <StaticPage page={r.page} /> : <PostList section={r.section} />;
}
