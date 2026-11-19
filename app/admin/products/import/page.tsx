import Link from "next/link";
import ProductImporterClient from "@/components/admin/ProductImporterClient";
import { PageHeader, ui } from "@/components/admin/ui";
import { requireRole } from "@/lib/auth";
import { getProductCategories } from "@/lib/data";
import { getIdleWorkerSummary, listImportJobs } from "@/lib/product-importer";

export const metadata = { title: "Nhập sản phẩm từ Link & Làm sạch AI | Quản trị" };

export default async function ProductImportPage() {
  await requireRole(["super_admin", "admin", "editor"]);
  const [jobs, categories, workerSummary] = await Promise.all([
    listImportJobs(50),
    getProductCategories(),
    getIdleWorkerSummary(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader title="🌐 Nhập Sản Phẩm từ Link &amp; Làm Sạch Thương Hiệu">
        <Link href="/admin/products/" className={ui.secondary}>
          ← Danh sách sản phẩm
        </Link>
      </PageHeader>
      <ProductImporterClient
        initialJobs={jobs}
        initialSummary={workerSummary}
        categories={categories}
      />
    </div>
  );
}
