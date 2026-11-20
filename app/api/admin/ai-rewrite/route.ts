import crypto from "node:crypto";
import { loadAiMotifs } from "@/lib/ai-motifs";
import { currentAdmin } from "@/lib/auth";
import { all, one, run } from "@/lib/db";
import { callGeminiGenerateContent, resolveGeminiApiKey } from "@/lib/gemini-key";
import { extractWebArticleFromHtml, extractYoutubeCaptionChunks } from "@/lib/html-extract";
import { vnd } from "@/lib/site";
import { saveGeneratedMedia, slugify } from "@/lib/uploads";

type ScrapedArticle = {
  sourceType: "web" | "youtube" | "gdocs" | "deep_research";
  sourceUrl: string;
  rawTitle: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  images: string[];
  youtubeId?: string;
  keyFindings?: string[];
};

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractYoutubeId(raw: string): string | null {
  const s = (raw || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m =
    s.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
    s.match(/youtube\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function extractGoogleDocId(raw: string): string | null {
  const s = (raw || "").trim();
  const m =
    s.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]{15,})/) ||
    s.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{15,})/) ||
    s.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  return m ? m[1] : null;
}

/** 1. Extract content from a YouTube Video URL (Metadata + Description + Captions + Local DB) */
async function scrapeYoutubeVideo(url: string, videoId: string): Promise<ScrapedArticle> {
  let rawTitle = "";
  let description = "";
  const headings: string[] = [];
  const paragraphs: string[] = [];
  const images = [`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`];

  // Check local DB first (318 Duy Vo channel videos)
  const dbVideo = await one<{
    title: string;
    topic: string;
    playlist_title: string;
    description: string;
  }>("SELECT title, topic, playlist_title, description FROM videos WHERE video_id = ?", videoId);

  if (dbVideo) {
    rawTitle = dbVideo.title;
    description = dbVideo.description || `Bài giảng chuyên đề ${dbVideo.topic} (${dbVideo.playlist_title}) trên kênh Duy Vo.`;
    if (dbVideo.topic) headings.push(`Chuyên đề: ${dbVideo.topic}`);
    if (dbVideo.playlist_title) headings.push(`Danh sách phát: ${dbVideo.playlist_title}`);
  }

  // Try YouTube oEmbed for accurate title & author
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
    const oRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
    if (oRes.ok) {
      const oData = (await oRes.json()) as { title?: string; author_name?: string };
      if (oData.title && !rawTitle) rawTitle = oData.title;
      if (oData.author_name) {
        paragraphs.push(
          `Nội dung được phân tích và biên tập từ video bài giảng "${rawTitle || oData.title}" trên kênh YouTube ${oData.author_name}.`,
        );
      }
    }
  } catch {
    /* ignore */
  }

  // Fetch watch page HTML to extract full shortDescription and captions if available
  try {
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (watchRes.ok) {
      const html = await watchRes.text();
      if (!rawTitle) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) rawTitle = titleMatch[1].replace(/\s*-\s*YouTube$/i, "").trim();
      }
      const descMatch = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
      if (descMatch && descMatch[1]) {
        const decodedDesc = JSON.parse(`"${descMatch[1]}"`) as string;
        if (decodedDesc.length > description.length) {
          description = decodedDesc.slice(0, 300).replace(/\s+/g, " ").trim();
        }
        const descLines = decodedDesc
          .split(/\n+/)
          .map((l) => l.trim())
          .filter((l) => l.length >= 25 && !/^https?:\/\//i.test(l));
        for (const line of descLines.slice(0, 20)) {
          if (/^\d{1,2}:\d{2}/.test(line) || line.length < 85) {
            headings.push(line);
          } else {
            paragraphs.push(line);
          }
        }
      }

      // Extract caption track XML if available
      const capMatch = html.match(/"captionTracks":\[\{"baseUrl":"([^"]+)"/);
      if (capMatch && capMatch[1]) {
        const capUrl = JSON.parse(`"${capMatch[1]}"`) as string;
        const capRes = await fetch(capUrl, { signal: AbortSignal.timeout(6000) });
        if (capRes.ok) {
          const capXml = await capRes.text();
          for (const chunk of extractYoutubeCaptionChunks(capXml, 18)) {
            paragraphs.push(chunk);
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  if (!rawTitle) rawTitle = `Bài giảng Thực Dưỡng Video #${videoId}`;
  if (paragraphs.length === 0) {
    paragraphs.push(
      `Video bài giảng "${rawTitle}" chia sẻ kiến thức thực tế về cách chăm sóc sức khỏe chủ động, điều chỉnh chế độ ăn uống quân bình Âm Dương và lắng nghe cơ thể mỗi ngày.`,
      `Việc kết hợp ngũ cốc nguyên cám (gạo lứt), rau củ hữu cơ theo mùa, nhai kỹ và giữ tinh thần bình an giúp kích hoạt cơ chế tự chữa lành tự nhiên từ cấp độ tế bào.`,
    );
  }

  return {
    sourceType: "youtube",
    sourceUrl: url || `https://www.youtube.com/watch?v=${videoId}`,
    rawTitle,
    description: description || paragraphs[0] || rawTitle,
    headings: headings.slice(0, 8),
    paragraphs: paragraphs.slice(0, 30),
    images,
    youtubeId: videoId,
  };
}

/** 2. Extract content from a Google Docs / Google Drive Document URL */
async function scrapeGoogleDoc(url: string, docId: string): Promise<ScrapedArticle> {
  // Try plain text export endpoint first (works for any public/shared Google Doc)
  const txtExportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  try {
    const res = await fetch(txtExportUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const txt = (await res.text()).replace(/^\uFEFF/, "");
      const lines = txt
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length > 0 && !lines[0].startsWith("<!DOCTYPE")) {
        const rawTitle = lines[0].replace(/^#+\s*/, "").slice(0, 140) || "Tài liệu Thực Dưỡng Google Docs";
        const headings = lines
          .slice(1)
          .filter((l) => l.length >= 8 && l.length <= 100 && (/^(#+\s|[IVX]+\.|[0-9]+\.|Phần|Chương|Mục)/i.test(l) || !l.endsWith(".")))
          .map((l) => l.replace(/^#+\s*/, ""))
          .slice(0, 10);
        const paragraphs = lines
          .slice(1)
          .filter((l) => l.length >= 45)
          .slice(0, 35);
        return {
          sourceType: "gdocs",
          sourceUrl: url,
          rawTitle,
          description: paragraphs[0]?.slice(0, 220) || `Tài liệu hướng dẫn chuyên sâu: ${rawTitle}`,
          headings,
          paragraphs,
          images: [],
        };
      }
    }
  } catch {
    /* fallback to web scrape below */
  }

  // Fallback to scraping the public HTML view
  const webScraped = await scrapeWebArticle(url);
  return { ...webScraped, sourceType: "gdocs" };
}

/** 3. Parse a Gemini Deep Research Report (Markdown / Text / Shared URL) */
function parseDeepResearchText(rawText: string, sourceUrl = ""): ScrapedArticle {
  const clean = rawText.replace(/\r\n/g, "\n").trim();
  const lines = clean
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const firstHeading =
    lines.find((l) => /^#\s+/.test(l))?.replace(/^#+\s*/, "") ||
    lines[0]?.replace(/^#+\s*|\*\*/g, "").slice(0, 140) ||
    "Báo cáo Phân tích Chuyên sâu Thực Dưỡng & Y Học";

  const headings: string[] = [];
  const paragraphs: string[] = [];
  const keyFindings: string[] = [];

  for (const line of lines.slice(1)) {
    if (/^#{1,3}\s+/.test(line)) {
      const h = line.replace(/^#{1,3}\s+/, "").replace(/\*\*/g, "").trim();
      if (h.length >= 5 && !headings.includes(h)) headings.push(h);
    } else if (/^([-*•]|\d+\.)\s+/.test(line)) {
      const bullet = line.replace(/^([-*•]|\d+\.)\s+/, "").replace(/\*\*/g, "").trim();
      if (bullet.length >= 25) {
        if (keyFindings.length < 6) keyFindings.push(bullet);
        paragraphs.push(bullet);
      }
    } else if (line.length >= 40) {
      paragraphs.push(line.replace(/\*\*/g, ""));
    }
  }

  return {
    sourceType: "deep_research",
    sourceUrl,
    rawTitle: firstHeading,
    description:
      paragraphs[0]?.slice(0, 220) ||
      `Tổng hợp báo cáo phân tích chuyên sâu (Deep Research) về ${firstHeading}.`,
    headings: headings.slice(0, 10),
    paragraphs: paragraphs.slice(0, 40),
    images: [],
    keyFindings,
  };
}

/** 4. Scrape standard Web Article */
async function scrapeWebArticle(url: string): Promise<ScrapedArticle> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Không thể truy cập đường dẫn (HTTP ${res.status}).`);
  const html = await res.text();
  const extracted = extractWebArticleFromHtml(html, url);

  return {
    sourceType: "web",
    sourceUrl: url,
    rawTitle: extracted.rawTitle,
    description: extracted.description,
    headings: extracted.headings,
    paragraphs: extracted.paragraphs,
    images: extracted.images,
  };
}

/** Generate an SVG Mindmap summarizing the article's core topic & branches */
function buildMindmapHtml(centralTitle: string, branches: { heading: string; summary: string }[]): string {
  const bList = branches.slice(0, 4);
  while (bList.length < 4) {
    bList.push({
      heading: `Trụ cột thực hành #${bList.length + 1}`,
      summary: "Cân bằng dinh dưỡng tự nhiên & lối sống tỉnh thức mỗi ngày",
    });
  }

  const shortCenter = centralTitle.length > 48 ? centralTitle.slice(0, 45) + "..." : centralTitle;
  const branchColors = [
    { bg: "#ecfdf5", border: "#10b981", title: "#065f46" },
    { bg: "#fffbeb", border: "#f59e0b", title: "#92400e" },
    { bg: "#eff6ff", border: "#3b82f6", title: "#1e40af" },
    { bg: "#fdf2f8", border: "#ec4899", title: "#9d174d" },
  ];

  const cardsHtml = bList
    .map((b, i) => {
      const c = branchColors[i % branchColors.length];
      return `
      <div style="background:${c.bg};border:2px solid ${c.border};border-radius:14px;padding:12px 14px;position:relative;">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:${c.border};letter-spacing:0.04em;">
          Nhánh 0${i + 1}
        </div>
        <div style="font-size:14px;font-weight:700;color:${c.title};margin-top:2px;">
          ${escHtml(b.heading)}
        </div>
        <div style="font-size:12px;color:#374151;margin-top:4px;line-height:1.5;">
          ${escHtml(b.summary)}
        </div>
      </div>`;
    })
    .join("");

  return `
<div class="my-6 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-green-50/50 p-5 shadow-sm" style="border:2px solid #a7f3d0;background:#f8fafc;border-radius:18px;padding:20px;margin:24px 0;">
  <div style="text-align:center;margin-bottom:16px;">
    <span style="background:#2f7d32;color:#ffffff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;">
      🧠 Sơ Đồ Tư Duy (Mindmap) Tóm Tắt Bài Viết
    </span>
    <div style="margin:12px auto 0;max-width:460px;background:linear-gradient(135deg,#1f5a22,#2f7d32);color:#ffffff;padding:12px 20px;border-radius:16px;font-weight:800;font-size:16px;box-shadow:0 4px 12px rgba(47,125,50,0.2);">
      🌱 ${escHtml(shortCenter)}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
    ${cardsHtml}
  </div>
</div>`;
}

/** Generate a contextual SVG Cover Banner and save it to public/uploads/posts/ */
async function generateContextualCoverSvg(title: string, subtitle: string): Promise<string> {
  const cleanTitle = title.length > 72 ? title.slice(0, 69) + "..." : title;
  const words = cleanTitle.split(" ");
  const mid = Math.ceil(words.length / 2);
  const line1 = escHtml(words.slice(0, mid).join(" "));
  const line2 = escHtml(words.slice(mid).join(" "));
  const sub = escHtml(subtitle.slice(0, 70));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14532d" />
      <stop offset="55%" stop-color="#2f7d32" />
      <stop offset="100%" stop-color="#15803d" />
    </linearGradient>
    <linearGradient id="card" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.14" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.05" />
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)" />
  <circle cx="1080" cy="110" r="210" fill="#ffffff" fill-opacity="0.06" />
  <circle cx="120" cy="580" r="240" fill="#fbbf24" fill-opacity="0.08" />
  <rect x="64" y="64" width="1072" height="547" rx="32" fill="url(#card)" stroke="#ffffff" stroke-opacity="0.22" stroke-width="2" />
  <rect x="110" y="118" width="340" height="44" rx="22" fill="#fbbf24" />
  <text x="280" y="147" font-family="sans-serif" font-size="18" font-weight="800" fill="#14532d" text-anchor="middle">THỰC DƯỠNG PHÚC THỌ</text>
  <text x="110" y="265" font-family="sans-serif" font-size="44" font-weight="800" fill="#ffffff">${line1}</text>
  <text x="110" y="330" font-family="sans-serif" font-size="44" font-weight="800" fill="#fef08a">${line2}</text>
  <text x="110" y="410" font-family="sans-serif" font-size="23" font-weight="500" fill="#dcfce7">${sub}</text>
  <line x1="110" y1="465" x2="1090" y2="465" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5" />
  <text x="110" y="520" font-family="sans-serif" font-size="20" font-weight="600" fill="#ffffff" fill-opacity="0.9">🌿 Ăn lành · Hưởng phúc · Sống thọ | Hotline: 0767.518.592 - 0858.816.070</text>
</svg>`;

  const name = `ai-cover-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}.svg`;
  return saveGeneratedMedia("posts", name, "image/svg+xml", svg);
}

export async function POST(req: Request) {
  if (!(await currentAdmin())) {
    return Response.json({ error: "Chưa đăng nhập quản trị." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    sourceType?: "auto" | "web" | "youtube" | "gdocs" | "deep_research";
    url?: string;
    rawText?: string;
    motif?: string;
    customPrompt?: string;
    includeMindmap?: boolean;
    includeProducts?: boolean;
    includeReferences?: boolean;
    generateCover?: boolean;
    geminiApiKey?: string;
  };

  const sourceUrl = String(body.url ?? "").trim();
  const rawText = String(body.rawText ?? "").trim();
  if (!sourceUrl && !rawText) {
    return Response.json(
      { error: "Vui lòng nhập đường dẫn (Website / YouTube / Google Docs) hoặc dán nội dung Báo cáo Deep Research." },
      { status: 400 },
    );
  }

  // Save Gemini API key if provided
  let savedKey = "";
  try {
    savedKey = await resolveGeminiApiKey(body.geminiApiKey);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }

  const motifs = await loadAiMotifs();
  const motif = motifs.find((m) => m.id === body.motif) ?? motifs[0];

  // 1. Auto-detect source type & extract structured content
  let scraped: ScrapedArticle;
  const ytId = extractYoutubeId(sourceUrl);
  const gdocId = extractGoogleDocId(sourceUrl);

  try {
    if ((body.sourceType === "deep_research" || (!sourceUrl && rawText)) && rawText) {
      scraped = parseDeepResearchText(rawText, sourceUrl);
    } else if (ytId || body.sourceType === "youtube") {
      if (!ytId) throw new Error("Đường dẫn video YouTube không hợp lệ.");
      scraped = await scrapeYoutubeVideo(sourceUrl, ytId);
    } else if (gdocId || body.sourceType === "gdocs") {
      if (!gdocId) throw new Error("Đường dẫn Google Docs / Drive không hợp lệ.");
      scraped = await scrapeGoogleDoc(sourceUrl, gdocId);
    } else if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) {
      scraped = await scrapeWebArticle(sourceUrl);
      if (rawText) {
        // Combine web URL with additional pasted Deep Research notes if both provided
        const extra = parseDeepResearchText(rawText, sourceUrl);
        scraped.headings = [...new Set([...scraped.headings, ...extra.headings])].slice(0, 10);
        scraped.paragraphs = [...extra.paragraphs, ...scraped.paragraphs].slice(0, 40);
        scraped.keyFindings = extra.keyFindings;
      }
    } else {
      scraped = parseDeepResearchText(rawText || sourceUrl, "");
    }
  } catch (e) {
    return Response.json({ error: `Không thể trích xuất dữ liệu nguồn: ${(e as Error).message}` }, { status: 400 });
  }

  // 2. Match relevant Products, Videos & Documents in our DB
  const fullCorpus = [scraped.rawTitle, scraped.description, ...scraped.headings, ...scraped.paragraphs.slice(0, 10)]
    .join(" ")
    .toLowerCase();

  const allProducts = await all<{
    id: number;
    name: string;
    slug: string;
    category_slug: string;
    price: number;
    sale_price: number | null;
    image: string | null;
    brand: string;
    unit: string;
    summary: string;
  }>(
    `SELECT p.id, p.name, p.slug, c.slug AS category_slug, p.price, p.sale_price, p.image, p.brand, p.unit, p.summary
     FROM products p JOIN product_categories c ON c.id = p.category_id
     WHERE p.price > 0 AND p.stock > 0 ORDER BY p.featured DESC, p.id ASC`,
  );

  const scoredProducts = allProducts
    .map((p) => {
      const words = p.name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3);
      let score = 0;
      for (const w of words) {
        if (fullCorpus.includes(w)) score += 2;
      }
      if (fullCorpus.includes("tiểu đường") && p.name.toLowerCase().includes("gạo lứt")) score += 5;
      if (fullCorpus.includes("dạ dày") && (p.name.toLowerCase().includes("mơ") || p.name.toLowerCase().includes("sắn dây")))
        score += 5;
      if (fullCorpus.includes("kiềm") && p.name.toLowerCase().includes("canh dưỡng sinh")) score += 6;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  const matchedProducts = scoredProducts.slice(0, 3).map((x) => x.p);

  const matchedVideos = (
    await all<{ video_id: string; title: string; topic: string; youtube_url: string }>(
      "SELECT video_id, title, topic, youtube_url FROM videos ORDER BY sort ASC LIMIT 60",
    )
  )
    .filter((v) => {
      const kws = v.title.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
      return kws.some((w) => fullCorpus.includes(w));
    })
    .slice(0, 2);

  // 3. Try Gemini API if API Key is available, otherwise use built-in Vietnamese SEO Synthesizer
  let seoTitle = `${scraped.rawTitle} — ${motif.introPrefix}`;
  let seoExcerpt =
    scraped.description ||
    scraped.paragraphs[0]?.slice(0, 200) ||
    `Tìm hiểu chi tiết về ${scraped.rawTitle} theo góc nhìn Thực Dưỡng Hiện Đại giúp chủ động chăm sóc sức khỏe tự nhiên.`;
  let sections: { heading: string; bodyHtml: string; summary: string }[] = [];
  let usedGemini = false;

  const sourceLabel =
    scraped.sourceType === "youtube"
      ? "Video bài giảng YouTube"
      : scraped.sourceType === "gdocs"
        ? "Tài liệu Google Docs trên Google Drive"
        : scraped.sourceType === "deep_research"
          ? "Báo cáo chuyên sâu Gemini Deep Research"
          : "Bài viết Website";

  if (savedKey) {
    try {
      const prompt = `Bạn là biên tập viên trưởng của Cửa hàng Thực Dưỡng Phúc Thọ và kênh YouTube Duy Vo (@quocduy2401).
Hãy phân tích dữ liệu từ [${sourceLabel}] dưới đây và biên soạn thành một bài viết mới 100%, chuẩn SEO, sâu sắc, dễ đọc.
Yêu cầu văn phong (Mô-típ "${motif.name}"): ${motif.promptInstruction}
${body.customPrompt ? `Yêu cầu bổ sung từ biên tập viên: ${body.customPrompt}` : ""}

Dữ liệu nguồn (${sourceLabel}):
- Tiêu đề gốc: ${scraped.rawTitle}
- Mô tả gốc: ${scraped.description}
- Các tiêu đề/luận điểm phụ: ${scraped.headings.join(" | ")}
- Nội dung chi tiết:
${scraped.paragraphs.slice(0, 20).join("\n")}

Hãy trả về kết quả dưới dạng JSON thuần túy (không bọc markdown) theo đúng cấu trúc:
{
  "title": "Tiêu đề mới chuẩn SEO hấp dẫn (60-85 ký tự)",
  "excerpt": "Đoạn tóm tắt chuẩn Meta Description (140-200 ký tự)",
  "sections": [
    {
      "heading": "Tiêu đề mục H2",
      "summary": "Tóm tắt ngắn 1 câu (dưới 80 ký tự) để đưa vào Sơ đồ tư duy Mindmap",
      "bodyHtml": "<p>Nội dung chi tiết của mục này (2-3 đoạn văn giàu giá trị, có thể dùng <ul><li>...</li></ul> và <strong>...</strong>)</p>"
    }
  ]
}
(Tạo từ 4 đến 5 sections).`;

      const geminiRes = await callGeminiGenerateContent(
        savedKey,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
        },
        undefined,
        22000,
      );
      if (geminiRes.ok) {
        const gJson = await geminiRes.json();
        const textOut = gJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = JSON.parse(textOut.replace(/^```json\s*|\s*```$/g, ""));
        if (parsed.title && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
          seoTitle = parsed.title;
          seoExcerpt = parsed.excerpt || seoExcerpt;
          sections = parsed.sections;
          usedGemini = true;
        }
      }
    } catch {
      /* fallback to built-in synthesizer below */
    }
  }

  // Built-in Vietnamese Macrobiotic SEO Synthesizer fallback
  if (sections.length === 0) {
    const pChunks = scraped.paragraphs.length > 0 ? scraped.paragraphs : [seoExcerpt];
    const hList =
      scraped.headings.length >= 3
        ? scraped.headings.slice(0, 4)
        : [
            `1. Tổng quan & Bản chất cốt lõi từ ${sourceLabel}`,
            `2. Phân tích Cơ chế Dinh dưỡng & Tác động đối với Cơ thể`,
            `3. Hướng dẫn Thực hành Chuẩn theo Thực Dưỡng Hiện Đại`,
            `4. Những Lưu ý Quan trọng để Đạt Hiệu quả Bền vững`,
          ];

    const chunkSize = Math.max(1, Math.ceil(pChunks.length / hList.length));
    sections = hList.map((h, idx) => {
      const slice = pChunks.slice(idx * chunkSize, (idx + 1) * chunkSize);
      const bodyParas =
        slice.length > 0
          ? slice.map((p) => `<p>${escHtml(p)}</p>`).join("\n")
          : `<p>${escHtml(motif.perspectiveBody)}</p>`;
      return {
        heading: h,
        summary: (slice[0] || motif.perspectiveBody).slice(0, 85) + "...",
        bodyHtml: bodyParas,
      };
    });

    sections.push({
      heading: motif.perspectiveTitle,
      summary: "Kết hợp thực phẩm toàn phần, nhai kỹ và giữ tâm trí an lạc.",
      bodyHtml: `<p>${escHtml(motif.perspectiveBody)}</p>
<blockquote><p>💡 <strong>Nguyên tắc vàng trong Thực dưỡng:</strong> Ưu tiên ngũ cốc nguyên cám (gạo lứt), đậu hạt hữu cơ, rau củ theo mùa và nhai kỹ mỗi miếng từ 50 – 100 lần để cơ thể hấp thu trọn vẹn dưỡng chất.</p></blockquote>`,
    });
  }

  // 4. Assemble Final SEO HTML with Source-specific Rich Widgets (YouTube Embed / Deep Research Executive Summary / Mindmap / Products)
  const htmlParts: string[] = [];

  // Intro lead paragraph
  htmlParts.push(`<p><strong>${escHtml(seoExcerpt)}</strong></p>`);

  // If source is a YouTube video, embed the responsive YouTube player right after the intro!
  if (scraped.youtubeId) {
    htmlParts.push(`
<div style="margin:22px 0;border-radius:16px;overflow:hidden;border:2px solid #bbf7d0;background:#0f172a;box-shadow:0 4px 14px rgba(0,0,0,0.08);">
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
    <iframe src="https://www.youtube.com/embed/${escHtml(scraped.youtubeId)}" title="${escHtml(seoTitle)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
  <div style="background:#f0fdf4;padding:10px 16px;font-size:12px;color:#166534;font-weight:600;display:flex;align-items:center;justify-content:space-between;">
    <span>🎬 Video bài giảng gốc: ${escHtml(scraped.rawTitle)}</span>
    <a href="https://www.youtube.com/watch?v=${escHtml(scraped.youtubeId)}" target="_blank" rel="noopener noreferrer" style="color:#15803d;text-decoration:underline;">Xem trên YouTube ↗</a>
  </div>
</div>`);
  }

  // If source is Deep Research or Google Docs with key findings, render an Executive Summary box
  if ((scraped.sourceType === "deep_research" || scraped.sourceType === "gdocs") && scraped.keyFindings && scraped.keyFindings.length > 0) {
    const findingsLi = scraped.keyFindings.map((f) => `<li style="margin-bottom:6px;">${escHtml(f)}</li>`).join("\n    ");
    htmlParts.push(`
<div style="border-left:4px solid #2563eb;background:#eff6ff;border-radius:0 14px 14px 0;padding:16px 20px;margin:20px 0;">
  <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#1d4ed8;letter-spacing:0.04em;margin-bottom:6px;">
    🔬 Tóm tắt Luận điểm Cốt lõi từ ${sourceLabel}
  </div>
  <ul style="margin:0;padding-left:18px;font-size:14px;color:#1e3a8a;line-height:1.6;">
    ${findingsLi}
  </ul>
</div>`);
  }

  // Mindmap block
  if (body.includeMindmap !== false) {
    htmlParts.push(
      buildMindmapHtml(
        seoTitle,
        sections.map((s) => ({ heading: s.heading, summary: s.summary })),
      ),
    );
  }

  // Sections + Inline Product Block after section 2
  sections.forEach((sec, idx) => {
    htmlParts.push(`<h2>${escHtml(sec.heading)}</h2>`);
    htmlParts.push(sec.bodyHtml);

    if (idx === 0 && scraped.images[0] && !scraped.youtubeId) {
      htmlParts.push(
        `<figure><img src="${escHtml(scraped.images[0])}" alt="${escHtml(seoTitle)}" /><figcaption>Hình minh họa: ${escHtml(seoTitle)}</figcaption></figure>`,
      );
    }

    if (idx === 1 && body.includeProducts !== false && matchedProducts[0]) {
      const mp = matchedProducts[0];
      const href = `/san-pham/${mp.category_slug}/${mp.slug}.html`;
      const effPrice = mp.sale_price ?? mp.price;
      htmlParts.push(`
<div data-shop-product-id="${mp.id}" style="border:2px solid #86efac;background:#f0fdf4;border-radius:16px;padding:16px;margin:20px 0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;">
  <div style="flex:1;min-width:220px;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#15803d;">🌱 Sản phẩm Thực dưỡng Gợi ý Theo Bài Viết</div>
    <div style="font-size:16px;font-weight:800;color:#111827;margin-top:3px;">
      <a href="${href}" style="color:#111827;text-decoration:none;">${escHtml(mp.name)}</a>
    </div>
    <div style="font-size:15px;font-weight:800;color:#c62828;margin-top:4px;">${effPrice > 0 ? vnd(effPrice) : "Liên hệ"}</div>
    ${mp.summary ? `<p style="font-size:13px;color:#4b5563;margin:4px 0 0;">${escHtml(mp.summary)}</p>` : ""}
  </div>
  <div>
    <a href="${href}" data-add-product-id="${mp.id}" style="display:inline-block;background:#2f7d32;color:#ffffff;font-weight:700;font-size:13px;padding:10px 18px;border-radius:12px;text-decoration:none;">
      🛒 Thêm vào giỏ / Xem chi tiết →
    </a>
  </div>
</div>`);
    }
  });

  // Conclusion & References Block
  if (body.includeReferences !== false) {
    const refLinks: string[] = [];
    for (const v of matchedVideos) {
      refLinks.push(
        `<li>🎬 <strong>Video bài giảng liên quan (Kênh Duy Vo):</strong> <a href="${escHtml(v.youtube_url)}" target="_blank" rel="noopener noreferrer">${escHtml(v.title)} (${escHtml(v.topic)}) ↗</a></li>`,
      );
    }
    refLinks.push(
      `<li>📚 <strong>Thư viện Tài liệu &amp; Sách Thực dưỡng:</strong> <a href="/thu-vien/tai-lieu-thuc-duong/">Xem &amp; tải các phác đồ thực dưỡng miễn phí tại đây →</a></li>`,
    );
    if (scraped.sourceUrl) {
      refLinks.push(
        `<li>🔗 <strong>Nguồn tư liệu (${escHtml(sourceLabel)}):</strong> <a href="${escHtml(scraped.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escHtml(scraped.rawTitle)} ↗</a></li>`,
      );
    }

    htmlParts.push(`<h2>${escHtml(motif.conclusionTitle)}</h2>`);
    htmlParts.push(
      `<p>Hy vọng bài viết đã mang đến cho bạn cái nhìn hệ thống, rõ ràng và dễ áp dụng. Nếu cần tư vấn chi tiết hơn về chế độ ăn thực dưỡng phù hợp với thể trạng riêng, đừng ngần ngại liên hệ với <strong>Cửa hàng Thực Dưỡng Phúc Thọ</strong> qua Hotline/Zalo <strong>0767.518.592 - 0858.816.070</strong>.</p>`,
    );
    htmlParts.push(`
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin-top:20px;">
  <h3 style="margin-top:0;font-size:15px;color:#1e293b;">📌 Tài liệu, Video Bài giảng &amp; Liên kết Tham khảo</h3>
  <ul style="margin-bottom:0;font-size:13px;">
    ${refLinks.join("\n    ")}
  </ul>
</div>`);
  }

  // 5. Generate Contextual Cover Image if requested
  let coverUrl = "";
  if (body.generateCover !== false) {
    coverUrl = await generateContextualCoverSvg(seoTitle, motif.introPrefix);
  } else if (scraped.images[0]) {
    coverUrl = scraped.images[0];
  }

  return Response.json({
    ok: true,
    usedGemini,
    sourceType: scraped.sourceType,
    sourceLabel,
    motifName: motif.name,
    title: seoTitle,
    slug: slugify(seoTitle),
    excerpt: seoExcerpt,
    contentHtml: htmlParts.join("\n\n"),
    coverUrl,
    comboIds: matchedProducts.map((p) => p.id),
    comboTitle: `Combo Thực Dưỡng Gợi Ý Cho: ${scraped.rawTitle.slice(0, 45)}`,
  });
}
