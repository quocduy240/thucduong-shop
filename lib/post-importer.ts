import "server-only";
import { all, one, run } from "./db";
import { callGeminiGenerateContent, resolveGeminiApiKey } from "./gemini-key";
import { saveMediaAsset } from "./media-assets";
import {
  applyAndAuditCompliance,
  getCompliancePolicyConfig,
  isComplianceSyncDue,
  syncCompliancePolicyWeekly,
} from "./medical-compliance";
import { assertSafePublicHttpUrl } from "./security";
import { getSite } from "./settings";

export type PostImportStatus =
  | "queued"
  | "researching"
  | "writing"
  | "generating_images"
  | "ready_review"
  | "published"
  | "failed";

export type PostTonePreset = "expert_east_west" | "practical_senior" | "storytelling";

export type PostResearchBrief = {
  source_kind: "youtube" | "article";
  core_points: string[];
  western_medicine_view: string;
  eastern_macrobiotic_view: string;
  suggested_category_id: number;
  suggested_category_name: string;
  suggested_product_ids: number[];
  suggested_combo_title: string;
  image_prompts: { role: "cover" | "section"; heading: string; prompt: string }[];
};

export type PolicyAuditResult = {
  safe: boolean;
  score: number;
  status_label: string;
  policy_version?: string;
  fixed_issues: string[];
  warnings: string[];
};

export type PostDraftPayload = {
  title: string;
  excerpt: string;
  content_html: string;
  cover: string;
  images: string[];
  category_id: number;
  related_product_ids: number[];
  combo_title: string;
};

export type PostImportJobRow = {
  id: number;
  source_url: string;
  extra_urls: string;
  canonical_url: string;
  source_type: string;
  youtube_video_id: string;
  tone_preset: string;
  status: PostImportStatus;
  step_cursor: number;
  progress_pct: number;
  current_step: string;
  estimated_seconds: number;
  locked_until: string | null;
  raw_text: string;
  research_json: string;
  policy_audit_json: string;
  draft_json: string;
  images_target: number;
  images_done: number;
  post_id: number | null;
  source_cleared: number;
  error_message: string;
  created_at: string;
  updated_at: string;
  post_title?: string | null;
  post_slug?: string | null;
  category_slug?: string | null;
  section_slug?: string | null;
};

export type PostIdleWorkerSummary = {
  state: "idle" | "busy";
  activeJob: {
    id: number;
    title: string;
    status: PostImportStatus;
    progress_pct: number;
    current_step: string;
    estimated_seconds: number;
  } | null;
  queuedCount: number;
  totalEtaSeconds: number;
  readyReviewCount: number;
};

let ensuredPostImporterSchema: Promise<void> | null = null;

export async function ensurePostImportSchema(): Promise<void> {
  if (!ensuredPostImporterSchema) {
    ensuredPostImporterSchema = (async () => {
      await run(`
        CREATE TABLE IF NOT EXISTS post_import_jobs (
          id INTEGER PRIMARY KEY,
          source_url TEXT NOT NULL,
          extra_urls TEXT NOT NULL DEFAULT '[]',
          canonical_url TEXT NOT NULL DEFAULT '',
          source_type TEXT NOT NULL DEFAULT 'article',
          youtube_video_id TEXT NOT NULL DEFAULT '',
          tone_preset TEXT NOT NULL DEFAULT 'expert_east_west',
          status TEXT NOT NULL DEFAULT 'queued',
          step_cursor INTEGER NOT NULL DEFAULT 0,
          progress_pct INTEGER NOT NULL DEFAULT 5,
          current_step TEXT NOT NULL DEFAULT 'Chờ Worker bắt đầu nghiên cứu',
          estimated_seconds INTEGER NOT NULL DEFAULT 45,
          locked_until TEXT,
          raw_text TEXT NOT NULL DEFAULT '',
          research_json TEXT NOT NULL DEFAULT '{}',
          policy_audit_json TEXT NOT NULL DEFAULT '{}',
          draft_json TEXT NOT NULL DEFAULT '{}',
          images_target INTEGER NOT NULL DEFAULT 4,
          images_done INTEGER NOT NULL DEFAULT 0,
          post_id INTEGER,
          source_cleared INTEGER NOT NULL DEFAULT 0,
          error_message TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      const cols = await all<{ name: string }>("PRAGMA table_info(posts)");
      const names = new Set(cols.map((c) => c.name));
      if (!names.has("source_url")) {
        await run("ALTER TABLE posts ADD COLUMN source_url TEXT");
      }
    })().catch((err) => {
      ensuredPostImporterSchema = null;
      throw err;
    });
  }
  await ensuredPostImporterSchema;
}

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "source",
  "si",
  "feature",
]);

export function extractYoutubeVideoId(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.trim());
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      return u.pathname.replace(/^\//, "").split("/")[0] || "";
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/\/(?:shorts|live|embed)\/([a-zA-Z0-9_-]{6,})/);
      if (m) return m[1];
    }
  } catch {
    /* ignore */
  }
  return "";
}

export function canonicalizePostUrl(rawUrl: string): string {
  const ytId = extractYoutubeVideoId(rawUrl);
  if (ytId) return `https://www.youtube.com/watch?v=${ytId}`;
  const safe = assertSafePublicHttpUrl(rawUrl);
  safe.hash = "";
  for (const key of [...safe.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase())) {
      safe.searchParams.delete(key);
    }
  }
  if (safe.pathname.length > 1 && safe.pathname.endsWith("/")) {
    safe.pathname = safe.pathname.slice(0, -1);
  }
  return safe.toString();
}

export async function checkDuplicatePostUrl(rawUrl: string): Promise<{
  canonicalUrl: string;
  isYoutube: boolean;
  youtubeVideoId: string;
  existingPost: { id: number; title: string; slug: string } | null;
  queuedJob: { id: number; status: PostImportStatus; progress_pct: number; current_step: string } | null;
}> {
  await ensurePostImportSchema();
  const safe = assertSafePublicHttpUrl(rawUrl);
  const exactUrl = safe.toString();
  const canonicalUrl = canonicalizePostUrl(rawUrl);
  const ytId = extractYoutubeVideoId(rawUrl);

  let existingPost = await one<{ id: number; title: string; slug: string }>(
    "SELECT id, title, slug FROM posts WHERE source_url = ? OR source_url = ? OR source_url = ? ORDER BY id DESC LIMIT 1",
    exactUrl,
    canonicalUrl,
    `${canonicalUrl}/`,
  );

  if (!existingPost && ytId) {
    const candidates = await all<{ id: number; title: string; slug: string; source_url: string }>(
      "SELECT id, title, slug, source_url FROM posts WHERE source_url IS NOT NULL AND INSTR(source_url, ?) > 0 LIMIT 20",
      ytId,
    );
    existingPost = candidates[0];
  }

  const queuedJob = await one<{
    id: number;
    status: PostImportStatus;
    progress_pct: number;
    current_step: string;
  }>(
    `SELECT id, status, progress_pct, current_step
     FROM post_import_jobs
     WHERE (canonical_url = ? OR source_url = ?)
       AND status IN ('queued', 'researching', 'writing', 'generating_images', 'ready_review')
     ORDER BY id DESC LIMIT 1`,
    canonicalUrl,
    exactUrl,
  );

  return {
    canonicalUrl,
    isYoutube: Boolean(ytId),
    youtubeVideoId: ytId,
    existingPost: existingPost ?? null,
    queuedJob: queuedJob ?? null,
  };
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchYoutubeTranscriptAndMeta(videoId: string): Promise<{
  title: string;
  text: string;
  hasTranscript: boolean;
}> {
  let title = `Video YouTube (${videoId})`;
  let description = "";
  let transcript = "";

  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
    );
    if (oembedRes.ok) {
      const o = (await oembedRes.json()) as { title?: string };
      if (o.title) title = o.title.trim();
    }
  } catch {
    /* ignore */
  }

  try {
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=vi`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
      },
    });
    if (watchRes.ok) {
      const html = await watchRes.text();
      const descMatch = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
      if (descMatch) {
        try {
          description = JSON.parse(`"${descMatch[1]}"`) as string;
        } catch {
          description = descMatch[1];
        }
      }

      const tracksMatch = html.match(/"captionTracks":(\[[\s\S]*?\])/);
      if (tracksMatch) {
        const tracks = JSON.parse(tracksMatch[1]) as { baseUrl?: string; languageCode?: string }[];
        const preferred =
          tracks.find((t) => t.languageCode === "vi") ||
          tracks.find((t) => t.languageCode?.startsWith("vi")) ||
          tracks.find((t) => t.languageCode === "en") ||
          tracks[0];

        if (preferred?.baseUrl) {
          const capRes = await fetch(preferred.baseUrl);
          if (capRes.ok) {
            const xml = await capRes.text();
            const parts = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/gi)].map((m) =>
              decodeXmlEntities(m[1]),
            );
            transcript = parts.join(" ").replace(/\s+/g, " ").trim();
          }
        }
      }
    }
  } catch {
    /* fallback to title + description */
  }

  const combined = [
    `Tiêu đề video: ${title}`,
    description ? `Mô tả video: ${description.slice(0, 1500)}` : "",
    transcript ? `Nội dung lời nói (Transcript): ${transcript.slice(0, 12000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    title,
    text: combined,
    hasTranscript: transcript.length > 50,
  };
}

async function fetchArticleText(urlStr: string): Promise<{ title: string; text: string }> {
  const safe = assertSafePublicHttpUrl(urlStr);
  const res = await fetch(safe.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Không thể tải bài viết nguồn (HTTP ${res.status}). Hãy dùng ô "Nội dung / HTML dự phòng".`);
  }
  const html = await res.text();
  const h1Match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = stripHtmlTags(h1Match?.[1] || titleMatch?.[1] || "Bài viết mới").slice(0, 200);

  const mainMatch =
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) ||
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) ||
    html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const rawBody = stripHtmlTags(mainMatch?.[1] || html);

  // Strip source phone numbers, emails, domain mentions
  const domain = safe.hostname.replace(/^www\./, "");
  const cleanedText = rawBody
    .replace(/(?:\+84|0)\d[\d.\s-]{7,12}\d/g, "")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "")
    .replace(new RegExp(domain.replace(/\./g, "\\."), "gi"), "")
    .slice(0, 14000);

  return { title, text: `Tiêu đề nguồn: ${title}\n\nNội dung: ${cleanedText}` };
}

export async function createPostImportJob(opts: {
  sourceUrl: string;
  extraUrls?: string[];
  rawTextOverride?: string;
  tonePreset?: PostTonePreset;
  imagesCount?: number;
}): Promise<PostImportJobRow> {
  await ensurePostImportSchema();
  const safe = assertSafePublicHttpUrl(opts.sourceUrl);
  const sourceUrl = safe.toString();
  const canonicalUrl = canonicalizePostUrl(sourceUrl);
  const ytId = extractYoutubeVideoId(sourceUrl);
  const sourceType = ytId ? "youtube" : "article";
  const imgTarget = Math.min(5, Math.max(3, Number(opts.imagesCount) || 4));
  const tone: PostTonePreset =
    opts.tonePreset === "practical_senior" || opts.tonePreset === "storytelling"
      ? opts.tonePreset
      : "expert_east_west";

  const extraClean: string[] = [];
  for (const u of (opts.extraUrls ?? []).slice(0, 2)) {
    const t = u.trim();
    if (!t) continue;
    try {
      extraClean.push(assertSafePublicHttpUrl(t).toString());
    } catch {
      /* ignore bad extra url */
    }
  }

  const r = await run(
    `INSERT INTO post_import_jobs
     (source_url, extra_urls, canonical_url, source_type, youtube_video_id, tone_preset,
      status, step_cursor, progress_pct, current_step, estimated_seconds, raw_text, images_target)
     VALUES (?, ?, ?, ?, ?, ?, 'queued', 0, 5, ?, ?, ?, ?)`,
    sourceUrl,
    JSON.stringify(extraClean),
    canonicalUrl,
    sourceType,
    ytId,
    tone,
    ytId
      ? "Chờ Worker lấy Transcript lời nói từ video YouTube..."
      : "Chờ Worker trích xuất nội dung & nghiên cứu...",
    20 + imgTarget * 8,
    (opts.rawTextOverride ?? "").trim().slice(0, 15000),
    imgTarget,
  );

  return (await getPostImportJobById(Number(r.lastInsertRowid)))!;
}

export async function getPostImportJobById(id: number): Promise<PostImportJobRow | undefined> {
  await ensurePostImportSchema();
  return one<PostImportJobRow>(
    `SELECT j.*, p.title AS post_title, p.slug AS post_slug, c.slug AS category_slug, c.section_slug
     FROM post_import_jobs j
     LEFT JOIN posts p ON p.id = j.post_id
     LEFT JOIN post_categories c ON c.id = p.category_id
     WHERE j.id = ?`,
    id,
  );
}

export async function listPostImportJobs(limit = 40): Promise<PostImportJobRow[]> {
  await ensurePostImportSchema();
  return all<PostImportJobRow>(
    `SELECT j.*, p.title AS post_title, p.slug AS post_slug, c.slug AS category_slug, c.section_slug
     FROM post_import_jobs j
     LEFT JOIN posts p ON p.id = j.post_id
     LEFT JOIN post_categories c ON c.id = p.category_id
     ORDER BY j.id DESC
     LIMIT ?`,
    limit,
  );
}

export async function getPostIdleWorkerSummary(): Promise<PostIdleWorkerSummary> {
  await ensurePostImportSchema();
  const [active, queuedRows, readyRow] = await Promise.all([
    one<PostImportJobRow>(
      `SELECT * FROM post_import_jobs
       WHERE status IN ('queued', 'researching', 'writing', 'generating_images')
       ORDER BY CASE status
         WHEN 'generating_images' THEN 0
         WHEN 'writing' THEN 1
         WHEN 'researching' THEN 2
         ELSE 3
       END ASC, id ASC
       LIMIT 1`,
    ),
    all<{ id: number; estimated_seconds: number }>(
      `SELECT id, estimated_seconds FROM post_import_jobs
       WHERE status IN ('queued', 'researching', 'writing', 'generating_images')`,
    ),
    one<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM post_import_jobs WHERE status = 'ready_review'",
    ),
  ]);

  let activeTitle = active ? `Phiên #${active.id}` : "";
  if (active?.draft_json && active.draft_json !== "{}") {
    try {
      const d = JSON.parse(active.draft_json) as Partial<PostDraftPayload>;
      if (d.title) activeTitle = d.title;
    } catch {
      /* ignore */
    }
  }

  return {
    state: active ? "busy" : "idle",
    activeJob: active
      ? {
          id: active.id,
          title: activeTitle,
          status: active.status,
          progress_pct: active.progress_pct,
          current_step: active.current_step,
          estimated_seconds: active.estimated_seconds,
        }
      : null,
    queuedCount: queuedRows.length,
    totalEtaSeconds: queuedRows.reduce((s, r) => s + (r.estimated_seconds || 20), 0),
    readyReviewCount: readyRow?.cnt ?? 0,
  };
}

function checkMedicalPolicyCompliance(htmlOrText: string): PolicyAuditResult {
  const riskyPatterns: { re: RegExp; note: string }[] = [
    { re: /chữa\s*(?:khỏi|dứt\s*điểm)\s*(?:100%|hoàn\s*toàn|ung\s*thư|tiểu\s*đường)/gi, note: "Khẳng định chữa khỏi hoàn toàn bệnh mạn tính" },
    { re: /bỏ\s*(?:hẳn\s*)?thuốc\s*(?:tây|bác\s*sĩ)/gi, note: "Khuyên bệnh nhân tự ý bỏ thuốc bác sĩ" },
    { re: /thần\s*dược|trị\s*bách\s*bệnh/gi, note: "Từ ngữ thổi phồng công dụng y tế" },
    { re: /cam\s*kết\s*khỏi\s*bệnh/gi, note: "Cam kết điều trị vi phạm chính sách Google/YouTube YMYL" },
  ];

  const fixedIssues: string[] = [];
  for (const p of riskyPatterns) {
    if (p.re.test(htmlOrText)) {
      fixedIssues.push(p.note);
    }
  }

  return {
    safe: fixedIssues.length === 0,
    score: fixedIssues.length === 0 ? 98 : Math.max(70, 95 - fixedIssues.length * 10),
    status_label:
      fixedIssues.length === 0
        ? "✓ Đạt chuẩn Chính sách Y tế Google & YouTube (YMYL)"
        : "⚠️ Đã phát hiện & khuyến nghị làm dịu câu từ y khoa",
    fixed_issues: fixedIssues,
    warnings: [
      "Luôn giữ khung miễn trừ trách nhiệm y tế: thông tin mang tính tham khảo dinh dưỡng, không thay thế chẩn đoán bác sĩ.",
    ],
  };
}

async function generateBrandImageWithGemini(
  apiKey: string,
  prompt: string,
): Promise<{ base64: string; mimeType: string } | null> {
  const models = ["gemini-2.5-flash-image", "gemini-2.0-flash-exp-image-generation"];
  const styledPrompt = `${prompt}. Phong cách nhiếp ảnh biên tập cho website Thực Dưỡng Phúc Thọ: ánh sáng tự nhiên ấm áp buổi sáng, tông màu xanh lá mộc dịu mắt kết hợp gỗ và gốm thủ công, thực phẩm toàn phần thuần khiết, bố cục tinh tế chuẩn tạp chí sức khoẻ. TUYỆT ĐỐI KHÔNG chèn chữ, KHÔNG watermark, KHÔNG số điện thoại, KHÔNG logo.`;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: styledPrompt }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        },
      );
      if (!res.ok) continue;
      const json = (await res.json()) as {
        candidates?: {
          content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] };
        }[];
      };
      for (const part of json.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          return {
            base64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || "image/png",
          };
        }
      }
    } catch {
      /* fallback model */
    }
  }
  return null;
}

function injectImagesIntoSections(html: string, sectionImages: string[]): string {
  if (sectionImages.length === 0) return html;
  const parts = html.split(/(?=<h2[\s>])/i);
  if (parts.length <= 1) {
    const imgsHtml = sectionImages
      .map(
        (src, i) =>
          `<figure class="my-5"><img src="${src}" alt="Minh hoạ thực dưỡng ${i + 1}" class="w-full rounded-xl" /></figure>`,
      )
      .join("\n");
    return `${html}\n${imgsHtml}`;
  }

  let imgIdx = 0;
  const rebuilt = parts.map((chunk, idx) => {
    if (idx === 0 || imgIdx >= sectionImages.length) return chunk;
    const src = sectionImages[imgIdx++];
    const h2End = chunk.indexOf("</h2>");
    const fig = `\n<figure class="my-4"><img src="${src}" alt="Minh hoạ chuyên sâu ${imgIdx}" class="w-full rounded-xl" /></figure>\n`;
    if (h2End !== -1) {
      return chunk.slice(0, h2End + 5) + fig + chunk.slice(h2End + 5);
    }
    return chunk + fig;
  });
  return rebuilt.join("");
}

/**
 * Step-by-step idle worker for Post Research, Unique Synthesis, Policy Audit & AI Image Generation.
 */
export async function processNextIdlePostImportJob(targetJobId?: number): Promise<{
  processed: boolean;
  jobId?: number;
  status?: string;
}> {
  await ensurePostImportSchema();
  const job = targetJobId
    ? await one<PostImportJobRow>("SELECT * FROM post_import_jobs WHERE id = ?", targetJobId)
    : await one<PostImportJobRow>(
        `SELECT * FROM post_import_jobs
         WHERE status IN ('queued', 'researching', 'writing', 'generating_images')
           AND (locked_until IS NULL OR locked_until < datetime('now'))
         ORDER BY CASE status
           WHEN 'generating_images' THEN 0
           WHEN 'writing' THEN 1
           WHEN 'researching' THEN 2
           ELSE 3
         END ASC, id ASC
         LIMIT 1`,
      );

  if (!job) return { processed: false };

  const lock = await run(
    `UPDATE post_import_jobs
     SET locked_until = datetime('now', '+40 seconds'), updated_at = datetime('now')
     WHERE id = ? AND (locked_until IS NULL OR locked_until < datetime('now'))`,
    job.id,
  );
  if (lock.changes === 0) return { processed: false };

  try {
    const apiKey = await resolveGeminiApiKey();
    const site = await getSite();
    const categories = await all<{ id: number; slug: string; section_slug: string; name: string }>(
      "SELECT id, slug, section_slug, name FROM post_categories ORDER BY section_slug, id",
    );
    const products = await all<{ id: number; name: string }>(
      "SELECT id, name FROM products ORDER BY featured DESC, id DESC LIMIT 40",
    );

    // STEP 0: Extract text (YouTube transcript or Web articles) + Intermediate Research Brief
    if (job.step_cursor === 0) {
      await run(
        "UPDATE post_import_jobs SET status = 'researching', current_step = 'Đang lấy nội dung & nghiên cứu Đông–Tây Y...', progress_pct = 15 WHERE id = ?",
        job.id,
      );

      let combinedRaw = job.raw_text.trim();
      if (!combinedRaw) {
        const chunks: string[] = [];
        if (job.source_type === "youtube" && job.youtube_video_id) {
          const yt = await fetchYoutubeTranscriptAndMeta(job.youtube_video_id);
          chunks.push(yt.text);
        } else {
          const mainArt = await fetchArticleText(job.source_url);
          chunks.push(mainArt.text);
        }
        let extras: string[] = [];
        try {
          extras = JSON.parse(job.extra_urls || "[]") as string[];
        } catch {
          extras = [];
        }
        for (const exUrl of extras) {
          try {
            const ytEx = extractYoutubeVideoId(exUrl);
            if (ytEx) {
              const y = await fetchYoutubeTranscriptAndMeta(ytEx);
              chunks.push(`--- TÀI LIỆU THAM KHẢO THÊM ---\n${y.text}`);
            } else {
              const a = await fetchArticleText(exUrl);
              chunks.push(`--- TÀI LIỆU THAM KHẢO THÊM ---\n${a.text}`);
            }
          } catch {
            /* ignore optional extra source error */
          }
        }
        combinedRaw = chunks.join("\n\n").slice(0, 16000);
      }

      let research: PostResearchBrief = {
        source_kind: job.source_type === "youtube" ? "youtube" : "article",
        core_points: ["Kiến thức chăm sóc sức khoẻ chủ động từ thực phẩm toàn phần"],
        western_medicine_view: "Phân tích cơ chế chuyển hoá, dinh dưỡng tế bào và cân bằng vi sinh đường ruột.",
        eastern_macrobiotic_view: "Quân bình âm dương, dưỡng tỳ vị và thuận theo nhịp sinh học tự nhiên.",
        suggested_category_id: categories[0]?.id ?? 1,
        suggested_category_name: categories[0]?.name ?? "Thực dưỡng căn bản",
        suggested_product_ids: [],
        suggested_combo_title: "Sản phẩm Thực dưỡng hỗ trợ đồng hành",
        image_prompts: Array.from({ length: job.images_target || 4 }).map((_, idx) => ({
          role: idx === 0 ? ("cover" as const) : ("section" as const),
          heading: idx === 0 ? "Ảnh bìa bài viết" : `Minh hoạ phần ${idx}`,
          prompt:
            idx === 0
              ? "Bàn gỗ mộc bày trí bữa ăn thực dưỡng thanh đạm với cơm gạo lứt, rau củ hữu cơ hấp và ấm trà Bancha nóng"
              : `Thực phẩm thực dưỡng tự nhiên, hạt ngũ cốc nguyên cám và thảo mộc tươi sạch minh hoạ chủ đề sức khoẻ phần ${idx}`,
        })),
      };

      if (apiKey) {
        const catListStr = categories.map((c) => `${c.id}: ${c.section_slug}/${c.name}`).join("\n");
        const prodListStr = products.map((p) => `${p.id}: ${p.name}`).join("\n");
        const researchPrompt = `Bạn là Tiến sĩ Dinh dưỡng & Chuyên gia Thực Dưỡng Hiện Đại – Đông Tây Y kết hợp.
Hãy phân tích tài liệu nguồn dưới đây để lập BẢN NGHIÊN CỨU TRUNG GIAN trước khi viết bài độc bản (TUYỆT ĐỐI không sao chép văn bản gốc, loại bỏ mọi thông tin shop cũ).
Trả về DUY NHẤT 1 JSON object hợp lệ:
{
  "core_points": string[] (4-6 luận điểm khoa học cốt lõi),
  "western_medicine_view": string (phân tích cơ chế Tây y: chuyển hoá, enzyme, vi sinh, chống oxy hoá...),
  "eastern_macrobiotic_view": string (phân tích Đông y & Thực dưỡng hiện đại: âm dương, tạng phủ, quân bình...),
  "suggested_category_id": number (chọn 1 ID phù hợp nhất từ danh sách chuyên mục bên dưới),
  "suggested_product_ids": number[] (chọn 0-3 ID sản phẩm phù hợp nhất từ kho bên dưới),
  "suggested_combo_title": string (tiêu đề ngắn gợi ý sản phẩm đồng hành),
  "image_prompts": [
    { "role": "cover", "heading": "Ảnh bìa", "prompt": "Mô tả chi tiết ảnh bìa thực dưỡng bằng tiếng Việt" },
    { "role": "section", "heading": "Tên mục 1", "prompt": "Mô tả ảnh minh hoạ 1" },
    ... tổng cộng đúng ${job.images_target || 4} ảnh (1 cover + ${(job.images_target || 4) - 1} section)
  ]
}

DANH SÁCH CHUYÊN MỤC:
${catListStr}

DANH SÁCH SẢN PHẨM CỦA SHOP:
${prodListStr}

NỘI DUNG NGUỒN:
${combinedRaw.slice(0, 12000)}`;

        try {
          const rRes = await callGeminiGenerateContent(apiKey, {
            contents: [{ role: "user", parts: [{ text: researchPrompt }] }],
            generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
          });
          const rJson = (await rRes.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const txt = (rJson.candidates?.[0]?.content?.parts?.[0]?.text ?? "")
            .replace(/^```json\s*/i, "")
            .replace(/```$/i, "")
            .trim();
          const parsed = JSON.parse(txt) as Partial<PostResearchBrief>;
          const matchedCat = categories.find((c) => c.id === Number(parsed.suggested_category_id));
          research = {
            source_kind: job.source_type === "youtube" ? "youtube" : "article",
            core_points: Array.isArray(parsed.core_points) && parsed.core_points.length ? parsed.core_points : research.core_points,
            western_medicine_view: String(parsed.western_medicine_view || research.western_medicine_view),
            eastern_macrobiotic_view: String(parsed.eastern_macrobiotic_view || research.eastern_macrobiotic_view),
            suggested_category_id: matchedCat?.id ?? research.suggested_category_id,
            suggested_category_name: matchedCat?.name ?? research.suggested_category_name,
            suggested_product_ids: Array.isArray(parsed.suggested_product_ids)
              ? parsed.suggested_product_ids.map(Number).filter((id) => products.some((p) => p.id === id)).slice(0, 4)
              : [],
            suggested_combo_title: String(parsed.suggested_combo_title || research.suggested_combo_title),
            image_prompts:
              Array.isArray(parsed.image_prompts) && parsed.image_prompts.length >= 3
                ? parsed.image_prompts.slice(0, 5)
                : research.image_prompts,
          };
        } catch {
          /* keep default structured research */
        }
      }

      await run(
        `UPDATE post_import_jobs
         SET status = 'writing',
             step_cursor = 1,
             progress_pct = 35,
             current_step = 'Đã hoàn tất nghiên cứu · Chuẩn bị viết bài độc bản...',
             estimated_seconds = ?,
             raw_text = ?,
             research_json = ?,
             images_target = ?,
             locked_until = NULL,
             updated_at = datetime('now')
         WHERE id = ?`,
        8 + research.image_prompts.length * 7,
        combinedRaw,
        JSON.stringify(research),
        research.image_prompts.length,
        job.id,
      );
      return { processed: true, jobId: job.id, status: "writing" };
    }

    // STEP 1: Write Unique Expert Article + Check YouTube/Google Medical Policy
    if (job.step_cursor === 1) {
      const research = JSON.parse(job.research_json || "{}") as PostResearchBrief;
      const toneGuide =
        job.tone_preset === "practical_senior"
          ? "Giọng văn gần gũi, chữ rõ ý, giải thích thực tế dễ áp dụng cho cô chú lớn tuổi."
          : job.tone_preset === "storytelling"
            ? "Giọng văn kể chuyện truyền cảm hứng, ấm áp nhưng vẫn giữ dẫn chứng khoa học."
            : "Giọng văn chuyên gia Thực Dưỡng Hiện Đại – Đông Tây Y kết hợp, sâu sắc, có dẫn chứng sinh học & thực hành.";

      let draft: PostDraftPayload = {
        title: "Bài viết Thực dưỡng Chuyên sâu",
        excerpt: "Tổng hợp kiến thức Thực dưỡng hiện đại kết hợp Đông – Tây y an toàn, khoa học.",
        content_html: `<h2>🌿 Đặt vấn đề &amp; Góc nhìn Thực dưỡng hiện đại</h2><p>${research.eastern_macrobiotic_view}</p><h2>🔬 Cơ chế khoa học theo Tây y</h2><p>${research.western_medicine_view}</p><h2>🥣 Hướng dẫn thực hành an toàn</h2><ul>${(research.core_points || []).map((p) => `<li>${p}</li>`).join("")}</ul>`,
        cover: "",
        images: [],
        category_id: research.suggested_category_id || 1,
        related_product_ids: research.suggested_product_ids || [],
        combo_title: research.suggested_combo_title || "Sản phẩm Thực dưỡng hỗ trợ",
      };

      if (apiKey) {
        const writePrompt = `Bạn là Chuyên gia Thực Dưỡng Hiện Đại – Đông Tây Y kết hợp của "${site.name}".
Dựa trên BẢN NGHIÊN CỨU TRUNG GIAN bên dưới, hãy viết lại thành một bài viết MỚI HOÀN TOÀN 100% (độc bản SEO, KHÔNG sao chép câu chữ nguồn cũ, KHÔNG nhắc tên shop/tác giả cũ).

TUÂN THỦ NGHIÊM NGẶT CHÍNH SÁCH Y TẾ GOOGLE (YMYL) & CỘNG ĐỒNG YOUTUBE:
1. KHÔNG khẳng định chữa khỏi bệnh 100%, không gọi là "thần dược", không khuyên bệnh nhân tự ý bỏ thuốc/phác đồ của bác sĩ.
2. Dùng ngôn từ khoa học chuẩn mực: "hỗ trợ cải thiện", "góp phần cân bằng", "theo nhiều nghiên cứu dinh dưỡng", "nên tham khảo ý kiến bác sĩ điều trị khi có bệnh nền".
3. ${toneGuide}
4. Cấu trúc HTML rõ ràng với 3-4 thẻ <h2>, đoạn văn mạch lạc, có danh sách <ul><li> thực hành cụ thể và cuối bài có 1 hộp <blockquote>Lưu ý chuyên môn: Nội dung nhằm mục đích giáo dục dinh dưỡng, không thay thế tư vấn, chẩn đoán hay điều trị y khoa chuyên nghiệp.</blockquote>.

Trả về DUY NHẤT 1 JSON object hợp lệ:
{
  "title": string (tiêu đề SEO hấp dẫn, chuẩn y khoa),
  "excerpt": string (tóm tắt 2 câu <= 240 ký tự),
  "content_html": string (bài viết HTML hoàn chỉnh 800-1400 từ, chưa cần chèn thẻ img)
}

BẢN NGHIÊN CỨU:
- Luận điểm: ${JSON.stringify(research.core_points)}
- Góc nhìn Tây y: ${research.western_medicine_view}
- Góc nhìn Đông y & Thực dưỡng: ${research.eastern_macrobiotic_view}
- Dữ liệu gốc tham khảo thêm: ${job.raw_text.slice(0, 6000)}`;

        try {
          const wRes = await callGeminiGenerateContent(apiKey, {
            contents: [{ role: "user", parts: [{ text: writePrompt }] }],
            generationConfig: { temperature: 0.45, responseMimeType: "application/json" },
          });
          const wJson = (await wRes.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const txt = (wJson.candidates?.[0]?.content?.parts?.[0]?.text ?? "")
            .replace(/^```json\s*/i, "")
            .replace(/```$/i, "")
            .trim();
          const parsed = JSON.parse(txt) as Partial<PostDraftPayload>;
          if (parsed.title && parsed.content_html) {
            draft.title = String(parsed.title).trim().slice(0, 220);
            draft.excerpt = String(parsed.excerpt || draft.excerpt).trim().slice(0, 300);
            draft.content_html = String(parsed.content_html).trim();
          }
        } catch {
          /* fallback draft */
        }
      }

      let policy = await getCompliancePolicyConfig();
      if (isComplianceSyncDue(policy)) {
        const synced = await syncCompliancePolicyWeekly(false).catch(() => null);
        if (synced?.config) policy = synced.config;
      }

      const { sanitizedHtml, audit: policyAudit } = applyAndAuditCompliance(
        draft.title,
        draft.content_html,
        policy,
      );
      draft.content_html = sanitizedHtml;
      const totalImgs = Math.max(3, Math.min(5, research.image_prompts?.length || job.images_target || 4));

      await run(
        `UPDATE post_import_jobs
         SET status = 'generating_images',
             step_cursor = 2,
             progress_pct = 55,
             current_step = ?,
             estimated_seconds = ?,
             policy_audit_json = ?,
             draft_json = ?,
             images_target = ?,
             images_done = 0,
             locked_until = NULL,
             updated_at = datetime('now')
         WHERE id = ?`,
        `Đã viết bài độc bản · Bắt đầu tạo ảnh AI 1/${totalImgs}`,
        totalImgs * 7,
        JSON.stringify(policyAudit),
        JSON.stringify(draft),
        totalImgs,
        job.id,
      );
      return { processed: true, jobId: job.id, status: "generating_images" };
    }

    // STEP >= 2: Generate 1 AI brand-styled image per step (3..5 images total)
    const research = JSON.parse(job.research_json || "{}") as PostResearchBrief;
    const draft = JSON.parse(job.draft_json || "{}") as PostDraftPayload;
    const imgIdx = job.step_cursor - 2;
    const prompts = research.image_prompts || [];
    const targetTotal = Math.max(3, Math.min(5, prompts.length || job.images_target || 4));

    if (imgIdx < targetTotal && apiKey) {
      const promptObj = prompts[imgIdx] ?? {
        role: imgIdx === 0 ? "cover" : "section",
        heading: draft.title,
        prompt: `Ảnh minh hoạ thực dưỡng hiện đại cho bài viết "${draft.title}"`,
      };
      const generated = await generateBrandImageWithGemini(apiKey, promptObj.prompt);
      if (generated) {
        const slug = `post-ai-${job.id}-${imgIdx + 1}-${Date.now().toString(36)}`;
        const mediaUrl = await saveMediaAsset(slug, generated.mimeType, generated.base64);
        if (imgIdx === 0 && !draft.cover) {
          draft.cover = mediaUrl;
        } else {
          draft.images = [...(draft.images || []), mediaUrl];
        }
      }
    }

    const doneCount = imgIdx + 1;
    const allDone = doneCount >= targetTotal;

    if (allDone) {
      if (draft.images && draft.images.length > 0) {
        draft.content_html = injectImagesIntoSections(draft.content_html, draft.images);
      }
      await run(
        `UPDATE post_import_jobs
         SET status = 'ready_review',
             step_cursor = ?,
             progress_pct = 100,
             current_step = '✓ Hoàn tất nghiên cứu, viết bài & tạo bộ ảnh — Chờ bạn Review & Xuất bản',
             estimated_seconds = 0,
             draft_json = ?,
             images_done = ?,
             locked_until = NULL,
             updated_at = datetime('now')
         WHERE id = ?`,
        job.step_cursor + 1,
        JSON.stringify(draft),
        doneCount,
        job.id,
      );
      return { processed: true, jobId: job.id, status: "ready_review" };
    }

    const remaining = targetTotal - doneCount;
    const pct = Math.min(96, Math.round(55 + (doneCount / targetTotal) * 40));
    await run(
      `UPDATE post_import_jobs
       SET status = 'generating_images',
           step_cursor = ?,
           progress_pct = ?,
           current_step = ?,
           estimated_seconds = ?,
           draft_json = ?,
           images_done = ?,
           locked_until = NULL,
           updated_at = datetime('now')
       WHERE id = ?`,
      job.step_cursor + 1,
      pct,
      `Đang tạo ảnh minh hoạ AI ${doneCount + 1}/${targetTotal}...`,
      remaining * 7,
      JSON.stringify(draft),
      doneCount,
      job.id,
    );
    return { processed: true, jobId: job.id, status: "generating_images" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi xử lý AI.";
    await run(
      `UPDATE post_import_jobs
       SET status = 'failed', error_message = ?, locked_until = NULL, current_step = 'Lỗi xử lý', estimated_seconds = 0, updated_at = datetime('now')
       WHERE id = ?`,
      msg.slice(0, 300),
      job.id,
    );
    return { processed: true, jobId: job.id, status: "failed" };
  }
}

function slugifyVi(raw: string): string {
  return (
    raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || `bai-viet-${Date.now().toString(36)}`
  );
}

export async function publishPostFromImportJob(opts: {
  jobId: number;
  title: string;
  excerpt: string;
  content_html: string;
  categoryId: number;
  cover?: string;
  relatedProductIds?: number[];
  comboTitle?: string;
  keepSourceUrl?: boolean;
}): Promise<{ postId: number; job: PostImportJobRow }> {
  await ensurePostImportSchema();
  const job = await getPostImportJobById(opts.jobId);
  if (!job) throw new Error("Không tìm thấy phiên biên tập.");
  if (job.post_id) return { postId: job.post_id, job };

  const baseSlug = slugifyVi(opts.title || "bai-viet-moi");
  let slug = baseSlug;
  if (await one("SELECT 1 FROM posts WHERE slug = ?", slug)) {
    slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
  }

  const relatedCsv = (opts.relatedProductIds ?? []).filter((n) => Number.isInteger(n) && n > 0).join(",");
  const srcUrl = opts.keepSourceUrl === false ? null : job.source_url;

  const res = await run(
    `INSERT INTO posts
     (slug, category_id, title, excerpt, content, cover, source_url, related_product_ids, combo_title)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    slug,
    opts.categoryId,
    opts.title.trim() || "Bài viết mới",
    opts.excerpt.trim(),
    opts.content_html.trim(),
    opts.cover?.trim() || null,
    srcUrl,
    relatedCsv,
    (opts.comboTitle ?? "").trim(),
  );

  const postId = Number(res.lastInsertRowid);
  await run(
    `UPDATE post_import_jobs
     SET status = 'published',
         post_id = ?,
         source_cleared = ?,
         progress_pct = 100,
         current_step = '✓ Đã xuất bản vào chủ đề bài viết',
         updated_at = datetime('now')
     WHERE id = ?`,
    postId,
    opts.keepSourceUrl === false ? 1 : 0,
    job.id,
  );

  return { postId, job: (await getPostImportJobById(job.id))! };
}

export async function clearPostSourceTrace(postId: number): Promise<void> {
  await ensurePostImportSchema();
  await run("UPDATE posts SET source_url = NULL WHERE id = ?", postId);
  await run(
    "UPDATE post_import_jobs SET source_cleared = 1, updated_at = datetime('now') WHERE post_id = ?",
    postId,
  );
}

export async function savePostImportReviewDraft(opts: {
  jobId: number;
  title: string;
  excerpt: string;
  content_html: string;
  categoryId: number;
  cover?: string;
  relatedProductIds?: number[];
  comboTitle?: string;
}): Promise<{ job: PostImportJobRow; policyAudit: PolicyAuditResult }> {
  await ensurePostImportSchema();
  const job = await getPostImportJobById(opts.jobId);
  if (!job) throw new Error("Không tìm thấy phiên biên tập.");

  let prevDraft: Partial<PostDraftPayload> = {};
  try {
    prevDraft = JSON.parse(job.draft_json || "{}") as Partial<PostDraftPayload>;
  } catch {
    prevDraft = {};
  }

  const nextDraft: PostDraftPayload = {
    title: opts.title.trim() || prevDraft.title || "Bài viết mới",
    excerpt: opts.excerpt.trim(),
    content_html: opts.content_html,
    cover: (opts.cover ?? prevDraft.cover ?? "").trim(),
    images: prevDraft.images ?? [],
    category_id: opts.categoryId || prevDraft.category_id || 1,
    related_product_ids: opts.relatedProductIds ?? prevDraft.related_product_ids ?? [],
    combo_title: (opts.comboTitle ?? prevDraft.combo_title ?? "").trim(),
  };

  const policy = await getCompliancePolicyConfig();
  const { sanitizedHtml, audit: policyAudit } = applyAndAuditCompliance(
    nextDraft.title,
    nextDraft.content_html,
    policy,
  );
  nextDraft.content_html = sanitizedHtml;
  await run(
    `UPDATE post_import_jobs
     SET draft_json = ?, policy_audit_json = ?, updated_at = datetime('now')
     WHERE id = ?`,
    JSON.stringify(nextDraft),
    JSON.stringify(policyAudit),
    job.id,
  );

  return { job: (await getPostImportJobById(job.id))!, policyAudit };
}

export async function autoDistributeImagesInDraft(
  jobId: number,
  currentHtml: string,
): Promise<{ job: PostImportJobRow; content_html: string; insertedCount: number }> {
  await ensurePostImportSchema();
  const job = await getPostImportJobById(jobId);
  if (!job) throw new Error("Không tìm thấy phiên biên tập.");
  const draft = JSON.parse(job.draft_json || "{}") as PostDraftPayload;
  const missing = (draft.images || []).filter((u) => u && !currentHtml.includes(u));
  if (missing.length === 0) {
    return { job, content_html: currentHtml, insertedCount: 0 };
  }
  const updatedHtml = injectImagesIntoSections(currentHtml, missing);
  draft.content_html = updatedHtml;
  await run(
    "UPDATE post_import_jobs SET draft_json = ?, updated_at = datetime('now') WHERE id = ?",
    JSON.stringify(draft),
    job.id,
  );
  return { job: (await getPostImportJobById(job.id))!, content_html: updatedHtml, insertedCount: missing.length };
}

export async function rewriteDraftWithCustomStandard(opts: {
  jobId: number;
  standardPrompt: string;
  currentTitle: string;
  currentExcerpt: string;
  currentContentHtml: string;
  categoryId: number;
}): Promise<{ job: PostImportJobRow; draft: PostDraftPayload; policyAudit: PolicyAuditResult }> {
  await ensurePostImportSchema();
  const job = await getPostImportJobById(opts.jobId);
  if (!job) throw new Error("Không tìm thấy phiên biên tập.");
  const apiKey = await resolveGeminiApiKey();
  if (!apiKey) throw new Error("Chưa cấu hình Gemini API Key trong Cài đặt.");

  const site = await getSite();
  let policy = await getCompliancePolicyConfig();
  if (isComplianceSyncDue(policy)) {
    const synced = await syncCompliancePolicyWeekly(false).catch(() => null);
    if (synced?.config) policy = synced.config;
  }

  const prevDraft = JSON.parse(job.draft_json || "{}") as PostDraftPayload;
  const research = JSON.parse(job.research_json || "{}") as Partial<PostResearchBrief>;
  const prompts = research.image_prompts || [];

  const availableImages = [
    ...(prevDraft.cover ? [{ url: prevDraft.cover, desc: prompts[0]?.heading || "Ảnh bìa chính" }] : []),
    ...(prevDraft.images || []).map((url, idx) => ({
      url,
      desc: prompts[idx + 1]?.heading || `Ảnh minh hoạ #${idx + 1}`,
    })),
  ];

  const sectionImgList = (prevDraft.images || []).map((url, idx) => ({
    url,
    heading: prompts[idx + 1]?.heading || `Minh hoạ phần ${idx + 1}`,
  }));

  const rewritePrompt = `Bạn là Chuyên gia Thực Dưỡng Hiện Đại – Đông Tây Y kết hợp của "${site.name}".
Hãy VIẾT LẠI TOÀN BỘ BÀI VIẾT dựa trên:
1. Nội dung hiện tại đang review bên dưới.
2. Bản nghiên cứu khoa học trung gian (Đông – Tây Y).
3. CHUẨN / YÊU CẦU RIÊNG DO QUẢN TRỊ VIÊN ĐỀ NGHỊ: "${opts.standardPrompt}"
4. BỘ TÀI NGUYÊN ẢNH AI ĐÃ TẠO CHO BÀI NÀY (chỉ dùng đúng URL nội bộ bên dưới, TUYỆT ĐỐI không bịa URL ngoài, chèn thẻ <figure class="my-4"><img src="URL" alt="Mô tả phù hợp" class="w-full rounded-xl" /></figure> vào đúng các mục <h2> tương ứng ngữ nghĩa trong bài):
${sectionImgList.map((im, i) => `- Ảnh ${i + 1} (${im.heading}): ${im.url}`).join("\n") || "(Chưa có ảnh minh hoạ phụ)"}

5. TUÂN THỦ NGHIÊM NGẶT PHÁP LUẬT VIỆT NAM, GOOGLE YMYL & YOUTUBE Y TẾ (${policy.version}):
${policy.vn_law_summary.map((s) => `- ${s}`).join("\n")}
${policy.youtube_policy_summary.map((s) => `- ${s}`).join("\n")}

Trả về DUY NHẤT 1 JSON object hợp lệ:
{
  "title": string (tiêu đề mới chuẩn SEO & pháp luật),
  "excerpt": string (tóm tắt 2 câu <= 240 ký tự),
  "content_html": string (bài viết HTML mới hoàn toàn đã lồng ghép các ảnh AI vào vị trí thích hợp)
}

NỘI DUNG ĐANG REVIEW HIỆN TẠI:
- Tiêu đề: ${opts.currentTitle}
- Tóm tắt: ${opts.currentExcerpt}
- Nội dung: ${opts.currentContentHtml.slice(0, 9000)}

BẢN NGHIÊN CỨU TRUNG GIAN:
- Luận điểm: ${JSON.stringify(research.core_points || [])}
- Tây y: ${research.western_medicine_view || ""}
- Đông y & Thực dưỡng: ${research.eastern_macrobiotic_view || ""}`;

  const res = await callGeminiGenerateContent(apiKey, {
    contents: [{ role: "user", parts: [{ text: rewritePrompt }] }],
    generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
  });
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const txt = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "")
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(txt) as Partial<PostDraftPayload>;

  let nextHtml = String(parsed.content_html || opts.currentContentHtml).trim();
  // Ensure every section AI image appears at least once in an appropriate section if missed by LLM
  const missingImgs = (prevDraft.images || []).filter((u) => u && !nextHtml.includes(u));
  if (missingImgs.length > 0) {
    nextHtml = injectImagesIntoSections(nextHtml, missingImgs);
  }

  const nextTitle = String(parsed.title || opts.currentTitle).trim().slice(0, 220);
  const { sanitizedHtml, audit: policyAudit } = applyAndAuditCompliance(nextTitle, nextHtml, policy);

  const nextDraft: PostDraftPayload = {
    ...prevDraft,
    title: nextTitle,
    excerpt: String(parsed.excerpt || opts.currentExcerpt).trim().slice(0, 300),
    content_html: sanitizedHtml,
    category_id: opts.categoryId || prevDraft.category_id || 1,
    images: prevDraft.images || availableImages.slice(1).map((a) => a.url),
  };

  await run(
    `UPDATE post_import_jobs
     SET draft_json = ?, policy_audit_json = ?, updated_at = datetime('now')
     WHERE id = ?`,
    JSON.stringify(nextDraft),
    JSON.stringify(policyAudit),
    job.id,
  );

  return { job: (await getPostImportJobById(job.id))!, draft: nextDraft, policyAudit };
}

export async function regenerateSinglePostImage(opts: {
  jobId: number;
  role: "cover" | "section";
  sectionIndex?: number;
  customPrompt?: string;
}): Promise<{ job: PostImportJobRow; newImageUrl: string }> {
  await ensurePostImportSchema();
  const job = await getPostImportJobById(opts.jobId);
  if (!job) throw new Error("Không tìm thấy phiên biên tập.");
  const apiKey = await resolveGeminiApiKey();
  if (!apiKey) throw new Error("Chưa cấu hình Gemini API Key.");

  const draft = JSON.parse(job.draft_json || "{}") as PostDraftPayload;
  const research = JSON.parse(job.research_json || "{}") as Partial<PostResearchBrief>;
  const prompts = research.image_prompts || [];

  const promptIndex = opts.role === "cover" ? 0 : (opts.sectionIndex ?? 0) + 1;
  const promptText =
    (opts.customPrompt || "").trim() ||
    prompts[promptIndex]?.prompt ||
    `Ảnh minh hoạ thực dưỡng hiện đại tinh tế cho chủ đề "${draft.title}"`;

  const generated = await generateBrandImageWithGemini(apiKey, promptText);
  if (!generated) {
    throw new Error("Không thể tạo ảnh AI lúc này, vui lòng thử lại.");
  }

  const slug = `post-ai-${job.id}-regen-${Date.now().toString(36)}`;
  const newUrl = await saveMediaAsset(slug, generated.mimeType, generated.base64);

  if (opts.role === "cover") {
    draft.cover = newUrl;
  } else {
    const idx = Math.max(0, opts.sectionIndex ?? 0);
    const oldUrl = draft.images?.[idx];
    const nextImgs = [...(draft.images || [])];
    nextImgs[idx] = newUrl;
    draft.images = nextImgs;
    if (oldUrl && draft.content_html.includes(oldUrl)) {
      draft.content_html = draft.content_html.split(oldUrl).join(newUrl);
    }
  }

  await run(
    "UPDATE post_import_jobs SET draft_json = ?, updated_at = datetime('now') WHERE id = ?",
    JSON.stringify(draft),
    job.id,
  );
  return { job: (await getPostImportJobById(job.id))!, newImageUrl: newUrl };
}
