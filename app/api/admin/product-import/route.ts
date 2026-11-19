import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { all, run } from "@/lib/db";
import {
  applySourceUpdateForJob,
  checkDuplicateProductUrl,
  checkSourceDiffForJob,
  cleanProductJobData,
  clearProductSourceTrace,
  enqueueBulkUrls,
  fetchAndCreateImportJob,
  getIdleWorkerSummary,
  getImportJobById,
  importJobIntoProducts,
  listImportJobs,
  listUncleanedImportedProducts,
  queueAutoCleanJob,
  queueSelectedUncleanedProducts,
  recleanExistingProduct,
  type CleanProductStylePreset,
} from "@/lib/product-importer";
import { canAccessAdminPath } from "@/lib/rbac";

export async function GET(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAdminPath(admin.role, "/admin/products/")) {
    return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const checkUrl = searchParams.get("check_url")?.trim();
  if (checkUrl) {
    try {
      const result = await checkDuplicateProductUrl(checkUrl);
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "URL không hợp lệ.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const [jobs, workerSummary, uncleanedProducts] = await Promise.all([
    listImportJobs(50),
    getIdleWorkerSummary(),
    listUncleanedImportedProducts(100),
  ]);
  return NextResponse.json({ jobs, workerSummary, uncleanedProducts });
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
      const { job, duplicate } = await fetchAndCreateImportJob({ url, rawHtmlOverride });
      const [jobs, workerSummary] = await Promise.all([listImportJobs(50), getIdleWorkerSummary()]);
      return NextResponse.json({ ok: true, job, duplicate, jobs, workerSummary });
    }

    if (action === "import") {
      const jobId = Number(b.job_id);
      const categoryId = Number(b.category_id);
      const priceAdjustPct = Number(b.price_adjust_pct) || 0;
      const holdStockZero = Boolean(b.hold_stock_zero);
      const overrideName = typeof b.override_name === "string" ? b.override_name : undefined;
      const overridePrice =
        b.override_price !== undefined && b.override_price !== null && b.override_price !== ""
          ? Number(b.override_price)
          : undefined;
      const overrideSalePrice =
        b.override_sale_price === null || b.override_sale_price === ""
          ? null
          : b.override_sale_price !== undefined
            ? Number(b.override_sale_price)
            : undefined;
      if (!jobId || !categoryId) {
        return NextResponse.json({ error: "Thiếu mã phiên hoặc danh mục sản phẩm." }, { status: 400 });
      }
      const { productId, job } = await importJobIntoProducts({
        jobId,
        categoryId,
        priceAdjustPct,
        holdStockZero,
        overrideName,
        overridePrice,
        overrideSalePrice,
      });
      revalidatePath("/", "layout");
      const [jobs, workerSummary] = await Promise.all([listImportJobs(50), getIdleWorkerSummary()]);
      return NextResponse.json({ ok: true, productId, job, jobs, workerSummary });
    }

    if (action === "queue_auto_clean") {
      const jobId = Number(b.job_id);
      if (!jobId) return NextResponse.json({ error: "Thiếu job_id." }, { status: 400 });
      const job = await queueAutoCleanJob(jobId);
      const [jobs, workerSummary] = await Promise.all([listImportJobs(50), getIdleWorkerSummary()]);
      return NextResponse.json({ ok: true, job, jobs, workerSummary });
    }

    if (action === "clean_data") {
      const jobId = Number(b.job_id);
      if (!jobId) return NextResponse.json({ error: "Thiếu job_id." }, { status: 400 });
      const stylePreset: CleanProductStylePreset =
        b.style_preset === "seo_sales" || b.style_preset === "senior_friendly"
          ? b.style_preset
          : "expert_east_west";
      const customInstruction = String(b.custom_instruction ?? "");
      const cleanImages = b.clean_images !== false;
      const result = await cleanProductJobData({
        jobId,
        stylePreset,
        customInstruction,
        cleanImages,
      });
      revalidatePath("/", "layout");
      const [jobs, workerSummary, uncleanedProducts] = await Promise.all([
        listImportJobs(50),
        getIdleWorkerSummary(),
        listUncleanedImportedProducts(100),
      ]);
      return NextResponse.json({ ok: true, ...result, jobs, workerSummary, uncleanedProducts });
    }

    if (action === "reclean_existing") {
      const productId = Number(b.product_id);
      const categoryId = Number(b.category_id);
      const mode = b.mode === "manual" ? "manual" : "auto";
      if (!productId || !categoryId) {
        return NextResponse.json({ error: "Thiếu ID sản phẩm hoặc danh mục." }, { status: 400 });
      }
      const res = await recleanExistingProduct({ productId, categoryId, mode });
      revalidatePath("/", "layout");
      const [jobs, workerSummary] = await Promise.all([listImportJobs(50), getIdleWorkerSummary()]);
      return NextResponse.json({ ok: true, ...res, jobs, workerSummary });
    }

    if (action === "bulk_queue") {
      const urls = Array.isArray(b.urls) ? b.urls.map(String) : [];
      const categoryId = Number(b.category_id);
      if (urls.length === 0 || !categoryId) {
        return NextResponse.json({ error: "Vui lòng nhập danh sách link và chọn danh mục." }, { status: 400 });
      }
      const stats = await enqueueBulkUrls({ urls, categoryId });
      const [jobs, workerSummary] = await Promise.all([listImportJobs(50), getIdleWorkerSummary()]);
      return NextResponse.json({ ok: true, stats, jobs, workerSummary });
    }

    if (action === "queue_all_uncleaned") {
      const rows = await all<{ id: number }>(
        "SELECT id FROM product_import_jobs WHERE status = 'imported' AND product_id IS NOT NULL ORDER BY id ASC LIMIT 20",
      );
      for (const r of rows) {
        await queueAutoCleanJob(r.id);
      }
      const [jobs, workerSummary] = await Promise.all([listImportJobs(50), getIdleWorkerSummary()]);
      return NextResponse.json({ ok: true, queuedCount: rows.length, jobs, workerSummary });
    }

    if (action === "retry_job") {
      const jobId = Number(b.job_id);
      const existing = await getImportJobById(jobId);
      if (!existing) return NextResponse.json({ error: "Không tìm thấy job." }, { status: 404 });
      if (existing.product_id) {
        await queueAutoCleanJob(jobId);
      } else {
        await run(
          "UPDATE product_import_jobs SET status = 'fetch_queued', error_message = '', locked_until = NULL, progress_pct = 5, current_step = 'Thử lại lấy dữ liệu', updated_at = datetime('now') WHERE id = ?",
          jobId,
        );
      }
      const [jobs, workerSummary] = await Promise.all([listImportJobs(50), getIdleWorkerSummary()]);
      return NextResponse.json({ ok: true, jobs, workerSummary });
    }

    if (action === "cancel_job") {
      const jobId = Number(b.job_id);
      await run(
        "DELETE FROM product_import_jobs WHERE id = ? AND status IN ('fetch_queued', 'cleaning_queued', 'failed', 'fetched')",
        jobId,
      );
      const [jobs, workerSummary] = await Promise.all([listImportJobs(50), getIdleWorkerSummary()]);
      return NextResponse.json({ ok: true, jobs, workerSummary });
    }

    if (action === "queue_selected_uncleaned") {
      const productIds = Array.isArray(b.product_ids) ? b.product_ids.map(Number) : [];
      if (productIds.length === 0) {
        return NextResponse.json({ error: "Vui lòng chọn ít nhất 1 sản phẩm." }, { status: 400 });
      }
      const res = await queueSelectedUncleanedProducts(productIds);
      const [jobs, workerSummary, uncleanedProducts] = await Promise.all([
        listImportJobs(50),
        getIdleWorkerSummary(),
        listUncleanedImportedProducts(100),
      ]);
      return NextResponse.json({ ok: true, ...res, jobs, workerSummary, uncleanedProducts });
    }

    if (action === "check_update") {
      const jobId = Number(b.job_id);
      if (!jobId) return NextResponse.json({ error: "Thiếu job_id." }, { status: 400 });
      const diff = await checkSourceDiffForJob(jobId);
      const [jobs, workerSummary] = await Promise.all([listImportJobs(50), getIdleWorkerSummary()]);
      return NextResponse.json({ ok: true, diff, jobs, workerSummary });
    }

    if (action === "apply_source_update") {
      const jobId = Number(b.job_id);
      const mode =
        b.mode === "mark_out_of_stock" || b.mode === "full_reclean" ? b.mode : "price_only";
      if (!jobId) return NextResponse.json({ error: "Thiếu job_id." }, { status: 400 });
      const job = await applySourceUpdateForJob({ jobId, mode });
      revalidatePath("/", "layout");
      const [jobs, workerSummary, uncleanedProducts] = await Promise.all([
        listImportJobs(50),
        getIdleWorkerSummary(),
        listUncleanedImportedProducts(100),
      ]);
      return NextResponse.json({ ok: true, job, jobs, workerSummary, uncleanedProducts });
    }

    if (action === "clear_source") {
      const productId = Number(b.product_id);
      if (!productId) return NextResponse.json({ error: "Thiếu product_id." }, { status: 400 });
      await clearProductSourceTrace(productId);
      revalidatePath("/", "layout");
      const [jobs, workerSummary] = await Promise.all([listImportJobs(50), getIdleWorkerSummary()]);
      return NextResponse.json({ ok: true, jobs, workerSummary });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Thao tác thất bại.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
