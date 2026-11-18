import Link from "next/link";
import { expandNestedBlocks, preparePostHtmlWithBlocks } from "@/lib/blocks";
import {
  getBestSellingProducts,
  getCrossSellProducts,
  getDocuments,
  getPages,
  getPostCategories,
  getPostComboProducts,
  getPosts,
  getVideos,
  url,
  type Page,
  type Post,
  type PostCategory,
  type PostSection,
} from "@/lib/data";
import BlockZone from "./BlockZone";
import DocumentLibrary from "./DocumentLibrary";
import {
  ArticleProductSet,
  CrossSellSidebarWidget,
  FrequentlyPurchasedBlock,
  ShoppableArticleBody,
} from "./PostShopBlocks";
import { Breadcrumb, PostCard } from "./ui";
import VideoLibrary from "./VideoLibrary";

async function PostSidebar({
  section,
  active,
  excludeProductIds = [],
  postId,
}: {
  section: string;
  active?: string;
  excludeProductIds?: number[];
  postId?: number;
}) {
  const [cats, latest, crossSell] = await Promise.all([
    getPostCategories(section),
    getPosts({ limit: 5 }),
    getCrossSellProducts(excludeProductIds, 4),
  ]);
  return (
    <aside className="space-y-6">
      <BlockZone position="post_sidebar" postId={postId} />
      <CrossSellSidebarWidget products={crossSell} />
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
export async function PostList({ section, category }: { section: PostSection; category?: PostCategory }) {
  if (category?.slug === "tai-lieu-thuc-duong") {
    const documents = await getDocuments();
    return (
      <>
        <Breadcrumb
          items={[
            { label: section.name, href: url.postSection(section.slug) },
            { label: category.name },
          ]}
        />
        <div className="mx-auto max-w-6xl px-4 pb-8">
          <DocumentLibrary documents={documents} />
        </div>
      </>
    );
  }

  const isVideoLibrary = category?.slug === "bai-giang-thuc-duong" || (section.slug === "thu-vien" && !category);
  if (isVideoLibrary) {
    const videos = await getVideos();
    return (
      <>
        <Breadcrumb
          items={
            category
              ? [{ label: section.name, href: url.postSection(section.slug) }, { label: category.name }]
              : [{ label: section.name }]
          }
        />
        <div className="mx-auto max-w-6xl px-4 pb-8">
          <VideoLibrary videos={videos} />
        </div>
      </>
    );
  }

  const posts = await getPosts({ section: section.slug, categoryId: category?.id });
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
export async function PostDetail({ post, section }: { post: Post; section: PostSection }) {
  const [relatedAll, comboProducts, bestSelling, bodyHtml] = await Promise.all([
    getPosts({ categoryId: undefined, section: section.slug, limit: 6 }),
    getPostComboProducts(post),
    getBestSellingProducts(4),
    preparePostHtmlWithBlocks(post.content, post.id),
  ]);
  const related = relatedAll.filter((p) => p.id !== post.id).slice(0, 4);
  const comboIds = comboProducts.map((p) => p.id);

  return (
    <>
      <Breadcrumb
        items={[
          { label: section.name, href: url.postSection(section.slug) },
          { label: post.category_name, href: url.postCategory({ slug: post.category_slug, section_slug: section.slug }) },
          { label: post.title },
        ]}
      />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-[1fr_300px]">
        <article className="min-w-0">
          <div className="rounded-2xl border bg-white p-5 shadow-sm md:p-7">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{post.title}</h1>
            <p className="mt-1 text-xs text-gray-400">Ngày đăng: {post.created_at.slice(0, 10)} · Chuyên mục: {post.category_name}</p>
            {post.excerpt && (
              <p className="mt-4 rounded-xl border-l-4 border-brand bg-green-50/50 p-3.5 text-sm font-medium text-gray-800">
                {post.excerpt}
              </p>
            )}
            <BlockZone position="post_top" postId={post.id} className="mt-4" />
            <ShoppableArticleBody html={bodyHtml} />
            <BlockZone position="post_bottom" postId={post.id} className="mt-6" />
          </div>

          {/* Block 1: Gói / Set Sản phẩm liên quan đến bài viết (Frequently Bought Together / Bundle Set) */}
          <ArticleProductSet
            title={post.combo_title || "Combo Thực Dưỡng Khuyên Dùng Theo Bài Viết"}
            products={comboProducts}
          />

          {/* Block 2: Sản phẩm được mua nhiều & Thường xuyên */}
          <FrequentlyPurchasedBlock products={bestSelling} />

          {related.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-3 font-bold uppercase text-brand">Bài viết liên quan</h2>
              <div className="grid gap-3">{related.map((p) => <PostCard key={p.id} p={p} />)}</div>
            </div>
          )}
        </article>
        <PostSidebar section={section.slug} active={post.category_slug} excludeProductIds={comboIds} postId={post.id} />
      </div>
    </>
  );
}

/** /gioi-thieu.html, /lien-he.html, /chinh-sach/<slug>.html */
export async function StaticPage({ page }: { page: Page }) {
  const [policies, expandedContent] = await Promise.all([
    getPages("chinh-sach"),
    expandNestedBlocks(page.content),
  ]);
  return (
    <>
      <Breadcrumb
        items={
          page.grp === "chinh-sach"
            ? [{ label: "Chính sách", href: url.page(policies[0] ?? page) }, { label: page.title }]
            : [{ label: page.title }]
        }
      />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-[1fr_280px]">
        <article className="rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="mb-4 border-b pb-3 text-2xl font-bold text-brand">{page.title}</h1>
          <div className="prose-content" dangerouslySetInnerHTML={{ __html: expandedContent }} />
        </article>
        <aside className="space-y-4 h-fit">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="mb-2.5 border-b pb-2 font-bold uppercase text-brand">Chính sách khách hàng</h2>
            <ul className="space-y-1 text-sm">
              {policies.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={url.page(p)}
                    className={`block rounded-lg px-3 py-2 transition hover:bg-green-50 ${
                      page.slug === p.slug ? "bg-green-50 font-semibold text-brand" : "text-gray-700"
                    }`}
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50/70 p-4 text-sm">
            <div className="font-bold text-brand">Hỗ trợ giải đáp &amp; Khiếu nại</div>
            <p className="mt-1 text-xs text-gray-600">
              Tiếp nhận và phản hồi nhanh chóng trong vòng 24 giờ làm việc:
            </p>
            <div className="mt-2 space-y-1 text-xs font-medium text-gray-800">
              <p>📞 Hotline: <a href="tel:0767518592" className="text-accent hover:underline">0767.518.592</a> - <a href="tel:0858816070" className="text-accent hover:underline">0858.816.070</a></p>
              <p>✉️ Email: <a href="mailto:thucduonghiendaiphuctho@gmail.com" className="text-brand hover:underline">thucduonghiendaiphuctho@gmail.com</a></p>
              <p>📍 Địa chỉ: Ấp 1, Xã Bình Hưng, TP Hồ Chí Minh</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
