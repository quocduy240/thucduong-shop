import Link from "next/link";
import PostImportGuideDrawer from "@/components/admin/PostImportGuideDrawer";
import PostImporterClient from "@/components/admin/PostImporterClient";
import { PageHeader, ui } from "@/components/admin/ui";
import { requireRole } from "@/lib/auth";
import { getPostCategories, getProducts } from "@/lib/data";
import { getPostIdleWorkerSummary, listPostImportJobs } from "@/lib/post-importer";

export const metadata = { title: "Nghiên cứu & Nhập Bài viết từ Link / YouTube | Quản trị" };

export default async function PostImportPage() {
  await requireRole(["super_admin", "admin", "editor"]);
  const [jobs, workerSummary, categories, products] = await Promise.all([
    listPostImportJobs(40),
    getPostIdleWorkerSummary(),
    getPostCategories(),
    getProducts(60),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader title="🧠 Nghiên cứu &amp; Viết Bài Độc Bản từ Link / YouTube">
        <PostImportGuideDrawer />
        <Link href="/admin/posts/" className={ui.secondary}>
          ← Danh sách bài viết
        </Link>
      </PageHeader>
      <PostImporterClient
        initialJobs={jobs}
        initialSummary={workerSummary}
        categories={categories}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
