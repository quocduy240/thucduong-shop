import "server-only";
import { all, one, run } from "./db";
import {
  getDocuments,
  getProductCategories,
  getProducts,
  getVideos,
  url,
  type DocumentItem,
  type Product,
  type VideoItem,
} from "./data";
import { CONSULT_MOTIFS, type ConsultMotifOption } from "./quick-consult-options";

export type QuickConsultInput = {
  customerName: string;
  phone: string;
  ageSex: string;
  needs: string[];
  conditions: string[];
  habits: string[];
  motifId: string;
  customNote: string;
};

export type MatchedProductCard = {
  id: number;
  name: string;
  price: number;
  sale_price: number | null;
  image: string | null;
  category_name: string;
  category_slug: string;
  href: string;
  summary: string;
};

export type MatchedProductGroup = {
  groupKey: "thuc_an" | "tro_phuong" | "duoc_thao" | "khac";
  groupTitle: string;
  groupSubtitle: string;
  items: MatchedProductCard[];
};

export type MatchedVideoCard = {
  id: number;
  title: string;
  topic: string;
  youtube_id: string;
  youtube_url: string;
  description: string;
};

export type MatchedDocumentCard = {
  id: number;
  title: string;
  category: string;
  author: string;
  file_url: string;
  summary: string;
};

export type QuickConsultRow = {
  id: number;
  customer_name: string;
  phone: string;
  age_sex: string;
  needs_json: string;
  conditions_json: string;
  habits_json: string;
  motif_id: string;
  custom_note: string;
  article_html: string;
  followup_choice: string;
  followup_email: string;
  followup_note: string;
  created_at: string;
};

let tableReady = false;

export async function ensureQuickConsultTable(): Promise<void> {
  if (tableReady) return;
  await run(`
    CREATE TABLE IF NOT EXISTS quick_consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      age_sex TEXT NOT NULL DEFAULT '',
      needs_json TEXT NOT NULL DEFAULT '[]',
      conditions_json TEXT NOT NULL DEFAULT '[]',
      habits_json TEXT NOT NULL DEFAULT '[]',
      motif_id TEXT NOT NULL DEFAULT '',
      custom_note TEXT NOT NULL DEFAULT '',
      article_html TEXT NOT NULL DEFAULT '',
      followup_choice TEXT NOT NULL DEFAULT '',
      followup_email TEXT NOT NULL DEFAULT '',
      followup_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  tableReady = true;
}

export async function listQuickConsultations(limit = 50): Promise<QuickConsultRow[]> {
  await ensureQuickConsultTable();
  return all<QuickConsultRow>(
    `SELECT * FROM quick_consultations ORDER BY id DESC LIMIT ?`,
    limit,
  );
}

export async function updateQuickConsultFollowup(input: {
  id: number;
  followupChoice: "hotline" | "advanced_free" | "advanced_paid";
  phone?: string;
  email?: string;
  note?: string;
}): Promise<void> {
  await ensureQuickConsultTable();
  await run(
    `UPDATE quick_consultations
     SET followup_choice = ?,
         phone = CASE WHEN ? <> '' THEN ? ELSE phone END,
         followup_email = ?,
         followup_note = ?
     WHERE id = ?`,
    input.followupChoice,
    input.phone?.trim() ?? "",
    input.phone?.trim() ?? "",
    input.email?.trim() ?? "",
    input.note?.trim() ?? "",
    input.id,
  );
}

function normalizeVn(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function extractTokens(input: QuickConsultInput): string[] {
  const joined = [
    ...input.needs,
    ...input.conditions,
    ...input.habits,
    input.customNote,
  ].join(" ");
  const norm = normalizeVn(joined);
  const stop = new Set([
    "cho", "voi", "cua", "nhu", "cau", "tinh", "trang", "suc", "khoe",
    "hay", "dang", "muon", "can", "thuc", "duong", "co", "the", "va", "hoac",
  ]);
  return Array.from(
    new Set(
      norm
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && !stop.has(w)),
    ),
  );
}

function scoreText(haystack: string, tokens: string[]): number {
  if (!haystack) return 0;
  const norm = normalizeVn(haystack);
  let score = 0;
  for (const t of tokens) {
    if (norm.includes(t)) score += 2;
  }
  return score;
}

function classifyProductGroup(catName: string, catSlug: string, prodName: string): MatchedProductGroup["groupKey"] {
  const hay = normalizeVn(`${catName} ${catSlug} ${prodName}`);
  if (
    hay.includes("duoc thao") ||
    hay.includes("thao duoc") ||
    hay.includes("tra ") ||
    hay.includes("canh duong sinh") ||
    hay.includes("hoi sinh") ||
    hay.includes("dong trung") ||
    hay.includes("linh chi")
  ) {
    return "duoc_thao";
  }
  if (
    hay.includes("tro phuong") ||
    hay.includes("tuong") ||
    hay.includes("miso") ||
    hay.includes("tamari") ||
    hay.includes("tekka") ||
    hay.includes("mo muoi") ||
    hay.includes("chanh muoi") ||
    hay.includes("dau me") ||
    hay.includes("dentie") ||
    hay.includes("bot san day")
  ) {
    return "tro_phuong";
  }
  if (
    hay.includes("thuc an") ||
    hay.includes("thuc pham") ||
    hay.includes("gao lut") ||
    hay.includes("ngu coc") ||
    hay.includes("bun") ||
    hay.includes("pho") ||
    hay.includes("mi ") ||
    hay.includes("hat") ||
    hay.includes("dau ")
  ) {
    return "thuc_an";
  }
  return "khac";
}

function toProductCard(p: Product): MatchedProductCard {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    sale_price: p.sale_price,
    image: p.image,
    category_name: p.category_name,
    category_slug: p.category_slug,
    href: url.product(p),
    summary: p.summary,
  };
}

async function matchResources(input: QuickConsultInput): Promise<{
  productGroups: MatchedProductGroup[];
  videos: MatchedVideoCard[];
  documents: MatchedDocumentCard[];
}> {
  const tokens = extractTokens(input);
  const [products, categories, videosRaw, docsRaw] = await Promise.all([
    getProducts(400),
    getProductCategories(),
    getVideos(),
    getDocuments(),
  ]);

  const activeProducts = products.filter((p) => p.price > 0 && p.stock > 0);
  const scoredProducts = activeProducts
    .map((p) => ({
      p,
      score:
        scoreText(`${p.name} ${p.summary} ${p.category_name}`, tokens) +
        (p.featured ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const buckets: Record<MatchedProductGroup["groupKey"], MatchedProductCard[]> = {
    thuc_an: [],
    tro_phuong: [],
    duoc_thao: [],
    khac: [],
  };

  for (const { p } of scoredProducts) {
    const g = classifyProductGroup(p.category_name, p.category_slug, p.name);
    if (buckets[g].length < 4) {
      buckets[g].push(toProductCard(p));
    }
  }

  // Ensure each main pillar (Thức ăn, Trợ phương, Dược thảo) has items if available in DB
  if (buckets.thuc_an.length === 0 && scoredProducts.length > 0) {
    buckets.thuc_an = scoredProducts.slice(0, 3).map((x) => toProductCard(x.p));
  }

  const groupMeta: Record<MatchedProductGroup["groupKey"], { title: string; subtitle: string }> = {
    thuc_an: {
      title: "🍚 Nhóm 1: Thức Ăn Nền Tảng Thực Dưỡng",
      subtitle: "Ngũ cốc nguyên cám, gạo lứt, thực phẩm quân bình Âm Dương dùng hằng ngày.",
    },
    tro_phuong: {
      title: "🫙 Nhóm 2: Trợ Phương Thực Dưỡng Chuyên Biệt",
      subtitle: "Tương Tamari, Miso, Tekka, Bột sắn dây, Chanh/Mơ muối lâu năm hỗ trợ tiêu hoá & kiềm hoá.",
    },
    duoc_thao: {
      title: "🌿 Nhóm 3: Dược Thảo & Trà Thảo Mộc Hỗ Trợ",
      subtitle: "Canh dưỡng sinh, trà thảo mộc, dược thảo tự nhiên giúp thanh lọc và phục hồi thể trạng.",
    },
    khac: {
      title: `✨ Nhóm Bổ Sung (${categories.slice(0, 2).map((c) => c.name).join(", ")})`,
      subtitle: "Các sản phẩm chăm sóc sức khoẻ phù hợp thêm theo nhu cầu của bạn.",
    },
  };

  const productGroups: MatchedProductGroup[] = (["thuc_an", "tro_phuong", "duoc_thao", "khac"] as const)
    .filter((k) => buckets[k].length > 0)
    .map((k) => ({
      groupKey: k,
      groupTitle: groupMeta[k].title,
      groupSubtitle: groupMeta[k].subtitle,
      items: buckets[k],
    }));

  const videos: MatchedVideoCard[] = (videosRaw as VideoItem[])
    .map((v) => ({
      v,
      score: scoreText(`${v.title} ${v.topic} ${v.description}`, tokens),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ v }) => ({
      id: v.id,
      title: v.title,
      topic: v.topic,
      youtube_id: v.video_id,
      youtube_url: v.youtube_url,
      description: v.description,
    }));

  const documents: MatchedDocumentCard[] = (docsRaw as DocumentItem[])
    .map((d) => ({
      d,
      score: scoreText(`${d.title} ${d.folder_path} ${d.doc_type} ${d.summary}`, tokens),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ d }) => ({
      id: d.id,
      title: d.title,
      category: d.folder_path || d.doc_type.toUpperCase(),
      author: d.author,
      file_url: d.drive_url,
      summary: d.summary,
    }));

  return { productGroups, videos, documents };
}

function buildFallbackArticle(
  input: QuickConsultInput,
  motif: ConsultMotifOption,
  groups: MatchedProductGroup[],
): string {
  const name = input.customerName || "Quý khách";
  const goalsText = input.needs.length ? input.needs.join("; ") : "Nâng cao sức khoẻ và quân bình cơ thể";
  const condText = input.conditions.length ? input.conditions.join("; ") : "Chưa ghi nhận triệu chứng đặc biệt";
  const habitText = input.habits.length ? input.habits.join("; ") : "Đang tìm hiểu lộ trình thực dưỡng phù hợp";

  const productBullets = groups
    .map(
      (g) =>
        `<li><strong>${g.groupTitle}:</strong> ${g.items
          .slice(0, 3)
          .map((it) => it.name)
          .join(", ")}</li>`,
    )
    .join("");

  return `
<div class="quick-consult-article">
  <p>Thân gửi <strong>${name}</strong>,</p>
  <p>Dựa trên hồ sơ bạn vừa khai báo theo mô hình <strong>${motif.name}</strong>, chúng tôi tổng hợp phân tích và lộ trình gợi ý dành riêng cho bạn như sau:</p>

  <h3>1. Đánh giá tổng quan thể trạng &amp; Nguyên lý Quân bình</h3>
  <ul>
    <li><strong>Mục tiêu ưu tiên:</strong> ${goalsText}</li>
    <li><strong>Tình trạng đang gặp phải:</strong> ${condText}</li>
    <li><strong>Thói quen hiện tại:</strong> ${habitText}</li>
    ${input.customNote ? `<li><strong>Ghi chú thêm của bạn:</strong> ${input.customNote}</li>` : ""}
  </ul>
  <p>Theo nguyên lý Thực dưỡng quân bình Âm – Dương kết hợp dinh dưỡng hiện đại, bước đầu tiên quan trọng nhất là giảm tải thực phẩm tinh chế nhiều đường/dầu công nghiệp, chuyển sang ngũ cốc nguyên cám nhai kỹ (20–30 lần/miếng) để ổn định đường huyết và làm dịu hệ tiêu hoá.</p>

  <h3>2. Nguyên tắc ăn uống &amp; Thực đơn gợi ý hằng ngày</h3>
  <ul>
    <li><strong>Bữa sáng ấm bụng:</strong> Cháo gạo lứt hoặc súp miso rau củ ấm giúp khởi động tỳ vị nhẹ nhàng.</li>
    <li><strong>Bữa trưa quân bình:</strong> 50% ngũ cốc lứt (cơm gạo lứt muối mè / bún lứt), 30% rau củ hấp/xào ít dầu mè, 20% đạm thực vật (đậu hũ, tương tamari, hạt).</li>
    <li><strong>Bữa tối thanh nhẹ:</strong> Ăn trước 19h00, ưu tiên món dễ tiêu, hạn chế đồ lạnh và đường ngọt vào buổi tối để cải thiện giấc ngủ.</li>
  </ul>

  <h3>3. Phối hợp Thức ăn – Trợ phương – Dược thảo</h3>
  <ul>
    ${productBullets || "<li>Kết hợp gạo lứt hữu cơ làm nền tảng cùng trợ phương lên men tự nhiên và trà thảo mộc hỗ trợ.</li>"}
  </ul>

  <h3>4. Lưu ý an toàn &amp; Đồng hành chuyên sâu</h3>
  <p>Lộ trình trên mang tính hướng dẫn thực hành thực dưỡng và chăm sóc lối sống. Nếu bạn đang có bệnh lý nền hoặc đang dùng thuốc điều trị, hãy giữ liên lạc với bác sĩ điều trị và chọn một trong 2 hình thức tư vấn bên dưới để chuyên gia của chúng tôi đồng hành chi tiết hơn.</p>
</div>`;
}

async function callGeminiExpertConsult(
  input: QuickConsultInput,
  motif: ConsultMotifOption,
  groups: MatchedProductGroup[],
  videos: MatchedVideoCard[],
  documents: MatchedDocumentCard[],
): Promise<string | null> {
  const row = await one<{ value: string }>("SELECT value FROM settings WHERE key = 'gemini_api_key'");
  const apiKey = row?.value?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
  if (!apiKey) return null;

  const productListText = groups
    .map((g) => `- ${g.groupTitle}: ${g.items.map((i) => i.name).join(", ")}`)
    .join("\n");
  const videoText = videos.map((v) => `- ${v.title}`).join("\n");
  const docText = documents.map((d) => `- ${d.title}`).join("\n");

  const prompt = `${motif.systemTone}

Hãy viết một **Bài viết Tư vấn Thực dưỡng Cá nhân hoá** bằng tiếng Việt dành riêng cho khách hàng có thông tin sau:
- Họ tên: ${input.customerName || "Quý khách"}
- Tuổi / Giới tính: ${input.ageSex || "Chưa cung cấp"}
- Nhu cầu chính: ${input.needs.join(", ") || "Cải thiện sức khoẻ tổng thể"}
- Tình trạng sức khoẻ: ${input.conditions.join(", ") || "Không ghi nhận đặc biệt"}
- Thói quen ăn uống: ${input.habits.join(", ") || "Chưa ghi nhận"}
- Ghi chú thêm: ${input.customNote || "Không có"}

Danh sách tài nguyên thực tế của cửa hàng để lồng ghép khéo léo vào lời khuyên (chỉ nhắc đúng tên nếu phù hợp, không bịa tên khác):
Sản phẩm theo nhóm:
${productListText || "(Chưa có)"}

Video bài giảng liên quan:
${videoText || "(Chưa có)"}

Tài liệu tham khảo:
${docText || "(Chưa có)"}

Yêu cầu đầu ra:
- Trả về **HTML sạch** (chỉ dùng thẻ p, h3, ul, li, strong, em, blockquote; KHÔNG bọc markdown \`\`\`html).
- Gồm 4 mục h3 rõ ràng:
  1. Đánh giá tổng quan thể trạng & Góc nhìn Quân bình Âm – Dương
  2. Thực đơn & Nguyên tắc ăn uống thực dưỡng hằng ngày
  3. Phác đồ phối hợp Thức ăn – Trợ phương – Dược thảo
  4. Lộ trình 7 ngày đầu & Lưu ý an toàn y khoa (nhấn mạnh không thay thế chẩn đoán bác sĩ nếu có bệnh lý nền).
- Giọng văn ấm áp, chuyên nghiệp, chuẩn chuyên gia thực dưỡng, độ dài khoảng 450–650 từ.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.45 },
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text.trim()) return null;
    return text.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
  } catch {
    return null;
  }
}

export async function generateQuickConsultReport(input: QuickConsultInput): Promise<{
  id: number;
  motif: ConsultMotifOption;
  articleHtml: string;
  productGroups: MatchedProductGroup[];
  videos: MatchedVideoCard[];
  documents: MatchedDocumentCard[];
}> {
  await ensureQuickConsultTable();
  const motif = CONSULT_MOTIFS.find((m) => m.id === input.motifId) ?? CONSULT_MOTIFS[0];
  const { productGroups, videos, documents } = await matchResources(input);

  const aiHtml = await callGeminiExpertConsult(input, motif, productGroups, videos, documents);
  const articleHtml = aiHtml || buildFallbackArticle(input, motif, productGroups);

  const res = await run(
    `INSERT INTO quick_consultations (
      customer_name, phone, age_sex,
      needs_json, conditions_json, habits_json,
      motif_id, custom_note, article_html
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.customerName.trim(),
    input.phone.trim(),
    input.ageSex.trim(),
    JSON.stringify(input.needs),
    JSON.stringify(input.conditions),
    JSON.stringify(input.habits),
    motif.id,
    input.customNote.trim(),
    articleHtml,
  );

  return {
    id: res.lastInsertRowid,
    motif,
    articleHtml,
    productGroups,
    videos,
    documents,
  };
}
