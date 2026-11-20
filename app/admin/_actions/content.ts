"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { logWarn } from "@/lib/logger";
import { ADMIN_ACTION_ROLES } from "@/lib/rbac";
import { ensureSeoColumns } from "@/lib/seo";
import { saveDocumentFile, saveImage, slugify } from "@/lib/uploads";
import { back, num, refresh, str, uploaded } from "./shared";

// ---- Posts ----
export async function savePostAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_write);
  const id = num(formData, "id");
  const here = `/admin/posts/${id || "new"}/`;
  const title = str(formData, "title");
  if (!title) back(here, "Vui lòng nhập tiêu đề.");
  const slug = slugify(str(formData, "slug") || title);
  if (!slug) back(here, "Đường dẫn (slug) không hợp lệ.");
  const categoryId = num(formData, "category_id");
  if (!(await one("SELECT 1 AS x FROM post_categories WHERE id = ?", categoryId))) back(here, "Chọn chuyên mục.");

  let cover: string | null = str(formData, "cover") || null;
  if (str(formData, "remove_cover") === "1") cover = null;
  const file = uploaded(formData, "cover_file");
  if (file) {
    try {
      cover = await saveImage(file, "posts");
    } catch (e) {
      back(here, (e as Error).message);
    }
  }

  const content = String(formData.get("content") ?? "");
  const relatedProductIds = str(formData, "related_product_ids");
  const comboTitle = str(formData, "combo_title");
  const seoTitle = str(formData, "seo_title");
  const seoDescription = str(formData, "seo_description");
  const seoKeywords = str(formData, "seo_keywords");
  try {
    await ensureSeoColumns();
    if (id) {
      await run(
        `UPDATE posts SET title=?, slug=?, category_id=?, excerpt=?, content=?, cover=?, related_product_ids=?, combo_title=?, seo_title=?, seo_description=?, seo_keywords=? WHERE id=?`,
        title, slug, categoryId, str(formData, "excerpt"), content, cover, relatedProductIds, comboTitle, seoTitle, seoDescription, seoKeywords, id,
      );
    } else {
      await run(
        `INSERT INTO posts (title, slug, category_id, excerpt, content, cover, related_product_ids, combo_title, seo_title, seo_description, seo_keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        title, slug, categoryId, str(formData, "excerpt"), content, cover, relatedProductIds, comboTitle, seoTitle, seoDescription, seoKeywords,
      );
    }
  } catch (e) {
    if (String(e).includes("UNIQUE")) back(here, "Đường dẫn (slug) đã được dùng cho bài khác.");
    throw e;
  }
  refresh();
  redirect("/admin/posts/?saved=1");
}

export async function deletePostAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.content_delete);
  const id = num(formData, "id");
  await run("DELETE FROM posts WHERE id = ?", id);
  logWarn("admin.post_deleted", { postId: id, actor: admin.email });
  refresh();
  redirect("/admin/posts/?saved=1");
}

// ---- Comments ----
export async function deleteCommentAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.comments_moderate);
  await run("DELETE FROM comments WHERE id = ?", num(formData, "id"));
  redirect("/admin/comments/?saved=1");
}

// ---- Static pages ----
export async function savePageAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_write);
  const grp = str(formData, "grp");
  const slug = str(formData, "slug");
  const here = `/admin/pages/${grp || "-"}__${slug}/`;
  const title = str(formData, "title");
  if (!title) back(here, "Vui lòng nhập tiêu đề.");
  await run(
    "UPDATE pages SET title = ?, content = ? WHERE grp = ? AND slug = ?",
    title,
    String(formData.get("content") ?? ""),
    grp,
    slug,
  );
  refresh();
  redirect("/admin/pages/?saved=1");
}

// ---- Post Categories ----
export async function savePostCategoryAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_write);
  const id = num(formData, "id");
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  const section = str(formData, "section_slug");
  if (!name || !slug) back("/admin/categories/", "Nhập tên chuyên mục.");
  if (!(await one("SELECT 1 AS x FROM post_sections WHERE slug = ?", section))) back("/admin/categories/", "Mục không hợp lệ.");
  try {
    if (id) await run("UPDATE post_categories SET name = ?, slug = ?, section_slug = ? WHERE id = ?", name, slug, section, id);
    else await run("INSERT INTO post_categories (name, slug, section_slug) VALUES (?, ?, ?)", name, slug, section);
  } catch (e) {
    if (String(e).includes("UNIQUE")) back("/admin/categories/", "Đường dẫn đã được dùng cho chuyên mục khác.");
    throw e;
  }
  refresh();
  redirect("/admin/categories/?saved=1");
}

export async function deletePostCategoryAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_delete);
  const id = num(formData, "id");
  const targetRaw = str(formData, "target_category_id");
  const postCountRow = await one<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM posts WHERE category_id = ?", id);
  const hasPosts = (postCountRow?.cnt ?? 0) > 0;

  if (hasPosts) {
    let targetId = Number(targetRaw);
    if (targetId === -1) {
      const curCat = await one<{ section_slug: string }>("SELECT section_slug FROM post_categories WHERE id = ?", id);
      const sec = curCat?.section_slug || "thuc-duong";
      const existing = await one<{ id: number }>("SELECT id FROM post_categories WHERE slug = 'chua-phan-loai'");
      if (existing) {
        targetId = existing.id;
      } else {
        const created = await run(
          "INSERT INTO post_categories (slug, name, section_slug) VALUES ('chua-phan-loai', 'Chưa phân loại (?)', ?)",
          sec,
        );
        targetId = Number(created.lastInsertRowid);
      }
    }
    if (!targetId || targetId === id || !(await one("SELECT 1 AS x FROM post_categories WHERE id = ?", targetId))) {
      back("/admin/categories/", "Vui lòng chọn chuyên mục đích hợp lệ để chuyển bài viết trước khi xoá.");
    }
    await run("UPDATE posts SET category_id = ? WHERE category_id = ?", targetId, id);
  }

  await run("DELETE FROM post_categories WHERE id = ?", id);
  refresh();
  redirect("/admin/categories/?saved=1");
}

// ---- Video Library (Bài giảng YouTube) ----
function parseYoutubeId(raw: string): string | null {
  const s = (raw || "").trim();
  if (!s) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const watchMatch = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = s.match(/youtube\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

async function fetchYoutubeTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (res.ok) {
      const data = (await res.json()) as { title?: string };
      if (data.title?.trim()) return data.title.trim();
    }
  } catch {
    /* fallback below */
  }
  return `Video bài giảng Thực dưỡng (${videoId})`;
}

export async function addVideoAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_write);
  const here = "/admin/videos/";
  const rawUrls = String(formData.get("youtube_url") ?? "")
    .split(/[\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (rawUrls.length === 0) back(here, "Vui lòng dán ít nhất 1 đường link video YouTube.");

  const customTopic = str(formData, "custom_topic");
  const topic = customTopic || str(formData, "topic") || "Thực Dưỡng Hiện Đại";
  const manualTitle = str(formData, "title");
  const description = str(formData, "description");

  for (const rawUrl of rawUrls) {
    const videoId = parseYoutubeId(rawUrl);
    if (!videoId) return back(here, `Link YouTube không hợp lệ: ${rawUrl}`);
    const title = rawUrls.length === 1 && manualTitle ? manualTitle : await fetchYoutubeTitle(videoId);
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    await run(
      "INSERT INTO videos (youtube_url, video_id, title, topic, description, sort) VALUES (?, ?, ?, ?, ?, 0)",
      canonicalUrl, videoId, title, topic, description,
    );
  }
  refresh();
  redirect("/admin/videos/?saved=1");
}

export async function updateVideoAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_write);
  const id = num(formData, "id");
  const rawUrl = str(formData, "youtube_url");
  const videoId = parseYoutubeId(rawUrl);
  if (!videoId) return back("/admin/videos/", "Link YouTube không hợp lệ.");
  let title = str(formData, "title");
  if (!title) title = await fetchYoutubeTitle(videoId);
  const topic = str(formData, "topic") || "Thực Dưỡng Hiện Đại";
  const description = str(formData, "description");
  const sort = num(formData, "sort");
  await run(
    "UPDATE videos SET youtube_url=?, video_id=?, title=?, topic=?, description=?, sort=? WHERE id=?",
    `https://www.youtube.com/watch?v=${videoId}`, videoId, title, topic, description, sort, id,
  );
  refresh();
  redirect("/admin/videos/?saved=1");
}

export async function deleteVideoAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_delete);
  await run("DELETE FROM videos WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/videos/?saved=1");
}

// ---- Document & Book Library (Tài liệu & Sách Thực dưỡng) ----
export async function saveDocumentAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_write);
  const id = num(formData, "id");
  const here = `/admin/documents/${id || "new"}/`;
  const title = str(formData, "title");
  if (!title) back(here, "Vui lòng nhập tên tài liệu / sách.");
  const slug = slugify(str(formData, "slug") || title);
  if (!slug) back(here, "Đường dẫn (slug) không hợp lệ.");

  const folderPath = str(formData, "folder_path") || "01. Thực Dưỡng Căn Bản";
  let docType = str(formData, "doc_type") || "pdf";
  const accessMode = str(formData, "access_mode") || "free";
  const price = Math.max(0, num(formData, "price"));
  let driveUrl = str(formData, "drive_url");
  const driveFolderUrl = str(formData, "drive_folder_url");
  const affiliateUrl = str(formData, "affiliate_url");
  const bundleProductId = str(formData, "bundle_product_id") ? num(formData, "bundle_product_id") : null;
  const author = str(formData, "author") || "Duy Vo & Thực Dưỡng Phúc Thọ";
  const pages = Math.max(0, num(formData, "pages"));
  let fileSize = str(formData, "file_size");
  const summary = str(formData, "summary");
  const highlights = String(formData.get("highlights") ?? "").trim();
  const reviewHtml = String(formData.get("review_html") ?? "").trim();
  const taskPrompt = str(formData, "task_prompt");
  const sort = num(formData, "sort");

  const docFile = uploaded(formData, "doc_file");
  if (docFile) {
    try {
      const saved = await saveDocumentFile(docFile);
      driveUrl = saved.url;
      if (!fileSize) fileSize = saved.fileSize;
      docType = saved.docType;
    } catch (e) {
      back(here, (e as Error).message);
    }
  }

  let cover = str(formData, "cover");
  if (str(formData, "remove_cover") === "1") cover = "";
  const coverFile = uploaded(formData, "cover_file");
  if (coverFile) {
    try {
      cover = await saveImage(coverFile, "documents");
    } catch (e) {
      back(here, (e as Error).message);
    }
  }

  try {
    if (id) {
      await run(
        `UPDATE documents SET
          slug=?, title=?, folder_path=?, doc_type=?, access_mode=?, price=?,
          drive_url=?, drive_folder_url=?, affiliate_url=?, bundle_product_id=?,
          cover=?, author=?, pages=?, file_size=?, summary=?, highlights=?,
          review_html=?, task_prompt=?, sort=?
         WHERE id=?`,
        slug, title, folderPath, docType, accessMode, price,
        driveUrl, driveFolderUrl, affiliateUrl, bundleProductId,
        cover, author, pages, fileSize, summary, highlights,
        reviewHtml, taskPrompt, sort, id,
      );
    } else {
      await run(
        `INSERT INTO documents (
          slug, title, folder_path, doc_type, access_mode, price,
          drive_url, drive_folder_url, affiliate_url, bundle_product_id,
          cover, author, pages, file_size, summary, highlights,
          review_html, task_prompt, sort
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        slug, title, folderPath, docType, accessMode, price,
        driveUrl, driveFolderUrl, affiliateUrl, bundleProductId,
        cover, author, pages, fileSize, summary, highlights,
        reviewHtml, taskPrompt, sort,
      );
    }
  } catch (e) {
    if (String(e).includes("UNIQUE")) back(here, "Đường dẫn (slug) đã được dùng cho tài liệu khác.");
    throw e;
  }
  refresh();
  redirect("/admin/documents/?saved=1");
}

export async function deleteDocumentAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_delete);
  const id = num(formData, "id");
  await run("DELETE FROM document_leads WHERE document_id = ?", id);
  await run("DELETE FROM documents WHERE id = ?", id);
  refresh();
  redirect("/admin/documents/?saved=1");
}

export async function deleteDocumentLeadAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_delete);
  await run("DELETE FROM document_leads WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/documents/?tab=leads&saved=1");
}

// ---- Reusable Content Blocks ----
export async function saveBlockAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_write);
  const id = num(formData, "id");
  const here = `/admin/blocks/${id || "new"}/`;
  const title = str(formData, "title");
  if (!title) back(here, "Vui lòng nhập tiêu đề Block.");
  const slug = slugify(str(formData, "slug") || title);
  if (!slug) back(here, "Mã định danh (slug) của Block không hợp lệ.");

  const styleVariant = str(formData, "style_variant") || "emerald";
  const selectedPositions = formData.getAll("positions").map((x) => String(x).trim()).filter(Boolean);
  const positions = selectedPositions.length > 0 ? selectedPositions.join(",") : "manual";
  const targetPosts = formData.getAll("target_post_ids").map((x) => String(x).trim()).filter(Boolean).join(",");
  const targetProducts = formData.getAll("target_product_ids").map((x) => String(x).trim()).filter(Boolean).join(",");
  const contentHtml = String(formData.get("content_html") ?? "").trim();
  const active = str(formData, "active") === "0" ? 0 : 1;
  const sort = num(formData, "sort");

  try {
    if (id) {
      await run(
        `UPDATE content_blocks SET
          slug=?, title=?, style_variant=?, positions=?, target_post_ids=?, target_product_ids=?,
          content_html=?, active=?, sort=?
         WHERE id=?`,
        slug, title, styleVariant, positions, targetPosts, targetProducts, contentHtml, active, sort, id,
      );
    } else {
      await run(
        `INSERT INTO content_blocks (
          slug, title, style_variant, positions, target_post_ids, target_product_ids,
          content_html, active, sort
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        slug, title, styleVariant, positions, targetPosts, targetProducts, contentHtml, active, sort,
      );
    }
  } catch (e) {
    if (String(e).includes("UNIQUE")) back(here, "Mã định danh (slug) này đã được dùng cho một Block khác.");
    throw e;
  }
  refresh();
  redirect("/admin/blocks/?saved=1");
}

export async function toggleBlockAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_write);
  const id = num(formData, "id");
  const active = num(formData, "active") ? 1 : 0;
  await run("UPDATE content_blocks SET active = ? WHERE id = ?", active, id);
  refresh();
  redirect("/admin/blocks/?saved=1");
}

export async function deleteBlockAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.content_delete);
  await run("DELETE FROM content_blocks WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/blocks/?saved=1");
}
