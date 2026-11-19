import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import {
  clearProductSourceTrace,
  fetchAndCreateImportJob,
  getImportJobById,
  importJobIntoProducts,
  listImportJobs,
  queueAutoCleanJob,
} from "@/lib/product-importer";
import { canAccessAdminPath } from "@/lib/rbac";

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAdminPath(admin.role, "/admin/products/")) {
    return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
  }
  const jobs = await listImportJobs(50);
  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAdminPath(admin.role, "/admin/products/")) {
    return NextResponse.json({ error: "Không có quyền thực hiện thao tác này." }, { status: 403 });
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(b.action ?? "");

  try {
    if (action === "fetch") {
      const url = String(b.url ?? "").trim();
      const rawHtmlOverride = String(b.raw_html ?? "");
      if (!url) {
        return NextResponse.json({ error: "Vui lòng dán đường dẫn (URL) sản phẩm." }, { status: 400 });
      }
      const { job, duplicateProduct } = await fetchAndCreateImportJob({ url, rawHtmlOverride });
      return NextResponse.json({ ok: true, job, duplicateProduct, jobs: await listImportJobs(50) });
    }

    if (action === "import") {
      const jobId = Number(b.job_id);
      const categoryId = Number(b.category_id);
      const priceAdjustPct = Number(b.price_adjust_pct) || 0;
      const holdStockZero = Boolean(b.hold_stock_zero);
      if (!jobId || !categoryId) {
        return NextResponse.json({ error: "Thiếu mã phiên hoặc danh mục sản phẩm." }, { status: 400 });
      }
      const { productId, job } = await importJobIntoProducts({
        jobId,
        categoryId,
        priceAdjustPct,
        holdStockZero,
      });
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, productId, job, jobs: await listImportJobs(50) });
    }

    if (action === "queue_auto_clean") {
      const jobId = Number(b.job_id);
      if (!jobId) return NextResponse.json({ error: "Thiếu job_id." }, { status: 400 });
      const job = await queueAutoCleanJob(jobId);
      return NextResponse.json({ ok: true, job, jobs: await listImportJobs(50) });
    }

    if (action === "check_update") {
      const jobId = Number(b.job_id);
      const oldJob = await getImportJobById(jobId);
      if (!oldJob) return NextResponse.json({ error: "Không tìm thấy lịch sử nguồn." }, { status: 404 });
      const { job } = await fetchAndCreateImportJob({ url: oldJob.source_url });
      return NextResponse.json({ ok: true, job, jobs: await listImportJobs(50) });
    }

    if (action === "clear_source") {
      const productId = Number(b.product_id);
      if (!productId) return NextResponse.json({ error: "Thiếu product_id." }, { status: 400 });
      await clearProductSourceTrace(productId);
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, jobs: await listImportJobs(50) });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Thao tác thất bại.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
