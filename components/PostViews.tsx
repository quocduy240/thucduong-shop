import Link from "next/link";
import { getPostCategories, getPosts, url, type Page, type Post, type PostCategory, type PostSection } from "@/lib/data";
import { Breadcrumb, PostCard } from "./ui";

function PostSidebar({ section, active }: { section: string; active?: string }) {
  const cats = getPostCategories(section);
  const latest = getPosts({ limit: 5 });
  return (
    <aside className="space-y-6">
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-bold uppercase text-brand">Chuyên mục</h2>
        <ul className="space-y-1 text-sm">
          {cats.map((c) => (
            <li key={c.slug}>
              <Link href={url.postCategory(c)} className={`block rounded px-2 py-1 hover:bg-green-50 ${active === c.slug ? "font-semibold text-brand" : ""}`}>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-bold uppercase text-brand">Bài mới</h2>
        <ul className="space-y-2 text-sm">
          {latest.map((p) => (
            <li key={p.id}><Link href={url.post(p)} className="hover:text-brand">{p.title}</Link></li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/** /thuc-duong/ and /thuc-duong/<category>/ */
export function PostList({ section, category }: { section: PostSection; category?: PostCategory }) {
  const posts = getPosts({ section: section.slug, categoryId: category?.id });
  const title = category?.name ?? section.name;
  return (
    <>
      <Breadcrumb items={category ? [{ label: section.name, href: url.postSection(section.slug) }, { label: category.name }] : [{ label: section.name }]} />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-[1fr_280px]">
        <div>
          <h1 className="mb-4 text-2xl font-bold">{title}</h1>
          <div className="grid gap-4">
            {posts.length ? posts.map((p) => <PostCard key={p.id} p={p} />) : <p>Chưa có bài viết.</p>}
          </div>
        </div>
        <PostSidebar section={section.slug} active={category?.slug} />
      </div>
    </>
  );
}

/** /<category>/<slug>.html */
export function PostDetail({ post, section }: { post: Post; section: PostSection }) {
  const related = getPosts({ categoryId: undefined, section: section.slug, limit: 6 }).filter((p) => p.id !== post.id).slice(0, 4);
  return (
    <>
      <Breadcrumb
        items={[
          { label: section.name, href: url.postSection(section.slug) },
          { label: post.category_name, href: url.postCategory({ slug: post.category_slug, section_slug: section.slug }) },
          { label: post.title },
        ]}
      />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-[1fr_280px]">
        <article>
          <h1 className="text-2xl font-bold">{post.title}</h1>
          <p className="mt-1 text-sm text-gray-400">{post.created_at.slice(0, 10)}</p>
          <p className="mt-4 font-medium">{post.excerpt}</p>
          <div className="prose-content mt-4" dangerouslySetInnerHTML={{ __html: post.content }} />
          {related.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-3 font-bold uppercase text-brand">Bài viết liên quan</h2>
              <div className="grid gap-3">{related.map((p) => <PostCard key={p.id} p={p} />)}</div>
            </div>
          )}
        </article>
        <PostSidebar section={section.slug} active={post.category_slug} />
      </div>
    </>
  );
}

/** /gioi-thieu.html, /lien-he.html, /chinh-sach/<slug>.html */
export function StaticPage({ page }: { page: Page }) {
  return (
    <>
      <Breadcrumb items={[{ label: page.title }]} />
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-4 text-2xl font-bold">{page.title}</h1>
        <div className="prose-content" dangerouslySetInnerHTML={{ __html: page.content }} />
      </div>
    </>
  );
}
