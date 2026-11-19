import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { run } from "@/lib/db";
import {
  checkDuplicatePostUrl,
  clearPostSourceTrace,
  createPostImportJob,
  getPostIdleWorkerSummary,
  getPostImportJobById,
  listPostImportJobs,
  publishPostFromImportJob,
  type PostTonePreset,
} from "@/lib/post-importer";
import { canAccessAdminPath } from "@/lib/rbac";

export async function GET(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAdminPath(admin.role, "/admin/posts/")) {
    return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const checkUrl = searchParams.get("check_url")?.trim();
  if (checkUrl) {
    try {
      const dup = await checkDuplicatePostUrl(checkUrl);
      return NextResponse.json({ ok: true, ...dup });
    } catch (err) {
      const message = err instanceof Error ? err.message : "URL không hợp lệ.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const [jobs, workerSummary] = await Promise.all([
    listPostImportJobs(40),
    getPostIdleWorkerSummary(),
  ]);
  return NextResponse.json({ jobs, workerSummary });
}

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAdminPath(admin.role, "/admin/posts/")) {
    return NextResponse.json({ error: "Không có quyền thực hiện thao tác này." }, { status: 403 });
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(b.action ?? "");

  try {
    if (action === "create") {
      const sourceUrl = String(b.source_url ?? "").trim();
      if (!sourceUrl) {
        return NextResponse.json({ error: "Vui lòng dán link bài viết hoặc link YouTube." }, { status: 400 });
      }
      const extraUrls = Array.isArray(b.extra_urls) ? b.extra_urls.map(String) : [];
      const rawTextOverride = String(b.raw_text ?? "");
      const tonePreset = String(b.tone_preset ?? "expert_east_west") as PostTonePreset;
      const imagesCount = Math.min(5, Math.max(3, Number(b.images_count) || 4));

      const job = await createPostImportJob({
        sourceUrl,
        extraUrls,
        rawTextOverride,
        tonePreset,
        imagesCount,
      });
      const [jobs, workerSummary] = await Promise.all([
        listPostImportJobs(40),
        getPostIdleWorkerSummary(),
      ]);
      return NextResponse.json({ ok: true, job, jobs, workerSummary });
    }

    if (action === "publish") {
      const jobId = Number(b.job_id);
      const categoryId = Number(b.category_id);
      const title = String(b.title ?? "").trim();
      const excerpt = String(b.excerpt ?? "").trim();
      const contentHtml = String(b.content_html ?? "").trim();
      const cover = String(b.cover ?? "").trim();
      const comboTitle = String(b.combo_title ?? "").trim();
      const keepSourceUrl = b.keep_source_url !== false;
      const relatedProductIds = Array.isArray(b.related_product_ids)
        ? b.related_product_ids.map(Number)
        : [];

      if (!jobId || !categoryId || !title || !contentHtml) {
        return NextResponse.json(
          { error: "Vui lòng nhập đầy đủ Tiêu đề, Nội dung và chọn Chuyên mục xuất bản." },
          { status: 400 },
        );
      }

      const { postId, job } = await publishPostFromImportJob({
        jobId,
        title,
        excerpt,
        content_html: contentHtml,
        categoryId,
        cover,
        relatedProductIds,
        comboTitle,
        keepSourceUrl,
      });
      revalidatePath("/", "layout");
      const [jobs, workerSummary] = await Promise.all([
        listPostImportJobs(40),
        getPostIdleWorkerSummary(),
      ]);
      return NextResponse.json({ ok: true, postId, job, jobs, workerSummary });
    }

    if (action === "retry_job") {
      const jobId = Number(b.job_id);
      const existing = await getPostImportJobById(jobId);
      if (!existing) return NextResponse.json({ error: "Không tìm thấy job." }, { status: 404 });
      await run(
        `UPDATE post_import_jobs
         SET status = 'queued', step_cursor = 0, progress_pct = 5, current_step = 'Thử lại quy trình nghiên cứu & viết bài',
             error_message = '', locked_until = NULL, updated_at = datetime('now')
         WHERE id = ?`,
        jobId,
      );
      const [jobs, workerSummary] = await Promise.all([
        listPostImportJobs(40),
        getPostIdleWorkerSummary(),
      ]);
      return NextResponse.json({ ok: true, jobs, workerSummary });
    }

    if (action === "cancel_job") {
      const jobId = Number(b.job_id);
      await run(
        "DELETE FROM post_import_jobs WHERE id = ? AND status IN ('queued', 'failed', 'ready_review')",
        jobId,
      );
      const [jobs, workerSummary] = await Promise.all([
        listPostImportJobs(40),
        getPostIdleWorkerSummary(),
      ]);
      return NextResponse.json({ ok: true, jobs, workerSummary });
    }

    if (action === "clear_source") {
      const postId = Number(b.post_id);
      if (!postId) return NextResponse.json({ error: "Thiếu post_id." }, { status: 400 });
      await clearPostSourceTrace(postId);
      revalidatePath("/", "layout");
      const [jobs, workerSummary] = await Promise.all([
        listPostImportJobs(40),
        getPostIdleWorkerSummary(),
      ]);
      return NextResponse.json({ ok: true, jobs, workerSummary });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Thao tác thất bại.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
