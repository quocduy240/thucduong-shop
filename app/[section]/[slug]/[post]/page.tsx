import { notFound } from "next/navigation";
import { getPost, getPostSection, url } from "@/lib/data";
import { getSeoFields } from "@/lib/seo";
import ArticleReadTracker from "@/components/ArticleReadTracker";
import { PostDetail } from "@/components/PostViews";

export const revalidate = 300;

// URL: /<section>/<category>/<slug>.html  e.g. /thuc-duong/thuc-duong-can-ban/abc.html
async function load(params: PageProps<"/[section]/[slug]/[post]">["params"]) {
  const { section, slug: category, post } = await params;
  if (!post.endsWith(".html")) return undefined;
  const p = await getPost(category, post.slice(0, -5));
  if (!p || p.section_slug !== section) return undefined;
  const s = await getPostSection(section);
  return s ? { post: p, section: s } : undefined;
}

export async function generateMetadata({ params }: PageProps<"/[section]/[slug]/[post]">) {
  const r = await load(params);
  if (!r) return { title: "Không tìm thấy" };
  const seo = await getSeoFields("posts", r.post.id);
  const title = seo.seo_title || r.post.title;
  const description = seo.seo_description || r.post.excerpt || undefined;
  return {
    title,
    description,
    keywords: seo.seo_keywords || undefined,
    alternates: { canonical: url.post(r.post) },
    openGraph: {
      title,
      description,
      images: r.post.cover ? [r.post.cover] : undefined,
    },
  };
}

export default async function PostPage({ params }: PageProps<"/[section]/[slug]/[post]">) {
  const r = await load(params);
  if (!r) notFound();
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: r.post.title,
    description: r.post.excerpt || undefined,
    image: r.post.cover ? [r.post.cover] : undefined,
    datePublished: r.post.created_at || undefined,
  };
  return (
    <>
      <script
        type="application/ld+json"
        // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }}
      />
      <PostDetail post={r.post} section={r.section} />
      <ArticleReadTracker postId={r.post.id} postTitle={r.post.title} />
    </>
  );
}
