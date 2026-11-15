import { notFound } from "next/navigation";
import { getPost, getPostSection } from "@/lib/data";
import { PostDetail } from "@/components/PostViews";

// URL: /<section>/<category>/<slug>.html  e.g. /thuc-duong/thuc-duong-can-ban/abc.html
async function load(params: PageProps<"/[section]/[slug]/[post]">["params"]) {
  const { section, slug: category, post } = await params;
  if (!post.endsWith(".html")) return undefined;
  const p = getPost(category, post.slice(0, -5));
  if (!p || p.section_slug !== section) return undefined;
  const s = getPostSection(section);
  return s ? { post: p, section: s } : undefined;
}

export async function generateMetadata({ params }: PageProps<"/[section]/[slug]/[post]">) {
  const r = await load(params);
  return r
    ? { title: r.post.title, description: r.post.excerpt, openGraph: r.post.cover ? { images: [r.post.cover] } : undefined }
    : { title: "Không tìm thấy" };
}

export default async function PostPage({ params }: PageProps<"/[section]/[slug]/[post]">) {
  const r = await load(params);
  if (!r) notFound();
  return <PostDetail post={r.post} section={r.section} />;
}
