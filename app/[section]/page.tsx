import { notFound } from "next/navigation";
import { getPage, getPostSection } from "@/lib/data";
import { PostList, StaticPage } from "@/components/PostViews";

export const revalidate = 300;

/**
 * One top-level segment:
 *   /thuc-duong/        → post section listing
 *   /gioi-thieu.html    → static page
 */
async function resolve(segment: string) {
  if (segment.endsWith(".html")) {
    const page = await getPage("", segment.slice(0, -5));
    return page ? ({ kind: "page", page } as const) : undefined;
  }
  const section = await getPostSection(segment);
  return section ? ({ kind: "section", section } as const) : undefined;
}

export async function generateMetadata({ params }: PageProps<"/[section]">) {
  const r = await resolve((await params).section);
  return { title: r ? (r.kind === "page" ? r.page.title : r.section.name) : "Không tìm thấy" };
}

export default async function Page({ params }: PageProps<"/[section]">) {
  const r = await resolve((await params).section);
  if (!r) notFound();
  return r.kind === "page" ? <StaticPage page={r.page} /> : <PostList section={r.section} />;
}
