import { notFound } from "next/navigation";
import { getPage, getPost, getPostCategory, getPostSection } from "@/lib/data";
import { PostDetail, PostList, StaticPage } from "@/components/PostViews";

/**
 * Two segments:
 *   /thuc-duong/thuc-duong-can-ban/      → post category listing
 *   /chinh-sach/huong-dan-mua-hang.html  → static page in a group
 *   /<post-category>/<post-slug>.html    → post detail
 */
function resolve(first: string, second: string) {
  if (second.endsWith(".html")) {
    const slug = second.slice(0, -5);
    const page = getPage(first, slug);
    if (page) return { kind: "page", page } as const;
    const post = getPost(first, slug);
    const section = post && getPostSection(post.section_slug);
    if (post && section) return { kind: "post", post, section } as const;
    return undefined;
  }
  const section = getPostSection(first);
  const category = section && getPostCategory(first, second);
  return section && category ? ({ kind: "category", section, category } as const) : undefined;
}

export async function generateMetadata({ params }: PageProps<"/[section]/[slug]">) {
  const { section, slug } = await params;
  const r = resolve(section, slug);
  if (!r) return { title: "Không tìm thấy" };
  if (r.kind === "page") return { title: r.page.title };
  if (r.kind === "post") return { title: r.post.title, description: r.post.excerpt };
  return { title: r.category.name };
}

export default async function Page({ params }: PageProps<"/[section]/[slug]">) {
  const { section, slug } = await params;
  const r = resolve(section, slug);
  if (!r) notFound();
  if (r.kind === "page") return <StaticPage page={r.page} />;
  if (r.kind === "post") return <PostDetail post={r.post} section={r.section} />;
  return <PostList section={r.section} category={r.category} />;
}
