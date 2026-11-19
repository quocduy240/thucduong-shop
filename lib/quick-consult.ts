import "server-only";
import crypto from "node:crypto";
import { all, one, run } from "./db";
import type { DisclaimerPosition, DisclaimerStyleId } from "./medical-disclaimer";
import { escapeHtml, guardUserPromptInput, sanitizeAiHtml } from "./security";
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

export type DietRecall24h = {
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  snacks?: string;
};

export type QuickConsultInput = {
  customerName: string;
  phone: string;
  ageSex: string;
  audience?: string;
  heightCm?: number;
  weightKg?: number;
  dietRecall?: DietRecall24h;
  needs: string[];
  conditions: string[];
  habits: string[];
  motifId: string;
  customNote: string;
};

export type ExpertProfileConfig = {
  expertName: string;
  expertTitle: string;
  schoolOfThought: string;
  focusAreas: string;
  customDirective: string;
  disclaimerStyle?: DisclaimerStyleId;
  disclaimerPosition?: DisclaimerPosition;
  disclaimerCustomText?: string;
};

export const DEFAULT_EXPERT_CONFIG: ExpertProfileConfig = {
  expertName: "Chuyên gia Thực dưỡng Phúc Thọ",
  expertTitle: "Cố vấn Dinh dưỡng Thực dưỡng & Chăm sóc Sức khoẻ Tự nhiên",
  schoolOfThought:
    "Thực dưỡng Quân bình Âm – Dương (Ohsawa) kết hợp Dinh dưỡng Y học Hiện đại (Evidence-Based Nutrition)",
  focusAreas:
    "Đánh giá chỉ số BMI, chuyển hoá đường-mỡ, hệ tiêu hoá, giấc ngủ và phối hợp Thức ăn – Trợ phương – Dược thảo",
  customDirective:
    "Luôn phân tích sát với chiều cao, cân nặng, chỉ số BMI, độ tuổi và bệnh lý nền; đưa ra thực đơn sáng/trưa/tối cụ thể, thói quen sinh hoạt theo giờ và liệt kê rõ từng sản phẩm cần bổ sung.",
  disclaimerStyle: "gemini_standard",
  disclaimerPosition: "bottom",
  disclaimerCustomText: "",
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
  audience: string;
  height_cm: number;
  weight_kg: number;
  diet_recall_json: string;
  needs_json: string;
  conditions_json: string;
  habits_json: string;
  motif_id: string;
  custom_note: string;
  article_html: string;
  followup_choice: string;
  followup_email: string;
  followup_note: string;
  booking_package: string;
  booking_mode: string;
  booking_date: string;
  booking_slot: string;
  booking_expert: string;
  share_token: string;
  expert_report_html: string;
  expert_config_json: string;
  expert_analyzed_at: string | null;
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
      height_cm REAL NOT NULL DEFAULT 0,
      weight_kg REAL NOT NULL DEFAULT 0,
      needs_json TEXT NOT NULL DEFAULT '[]',
      conditions_json TEXT NOT NULL DEFAULT '[]',
      habits_json TEXT NOT NULL DEFAULT '[]',
      motif_id TEXT NOT NULL DEFAULT '',
      custom_note TEXT NOT NULL DEFAULT '',
      article_html TEXT NOT NULL DEFAULT '',
      followup_choice TEXT NOT NULL DEFAULT '',
      followup_email TEXT NOT NULL DEFAULT '',
      followup_note TEXT NOT NULL DEFAULT '',
      share_token TEXT NOT NULL DEFAULT '',
      expert_report_html TEXT NOT NULL DEFAULT '',
      expert_config_json TEXT NOT NULL DEFAULT '{}',
      expert_analyzed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Additive column migration for existing databases
  const cols = await all<{ name: string }>(`PRAGMA table_info(quick_consultations)`);
  const existing = new Set(cols.map((c) => c.name));
  const migrations: [string, string][] = [
    ["height_cm", "ALTER TABLE quick_consultations ADD COLUMN height_cm REAL NOT NULL DEFAULT 0"],
    ["weight_kg", "ALTER TABLE quick_consultations ADD COLUMN weight_kg REAL NOT NULL DEFAULT 0"],
    ["share_token", "ALTER TABLE quick_consultations ADD COLUMN share_token TEXT NOT NULL DEFAULT ''"],
    ["expert_report_html", "ALTER TABLE quick_consultations ADD COLUMN expert_report_html TEXT NOT NULL DEFAULT ''"],
    ["expert_config_json", "ALTER TABLE quick_consultations ADD COLUMN expert_config_json TEXT NOT NULL DEFAULT '{}'"],
    ["expert_analyzed_at", "ALTER TABLE quick_consultations ADD COLUMN expert_analyzed_at TEXT"],
    ["audience", "ALTER TABLE quick_consultations ADD COLUMN audience TEXT NOT NULL DEFAULT 'truong_thanh'"],
    ["diet_recall_json", "ALTER TABLE quick_consultations ADD COLUMN diet_recall_json TEXT NOT NULL DEFAULT '{}'"],
    ["booking_package", "ALTER TABLE quick_consultations ADD COLUMN booking_package TEXT NOT NULL DEFAULT ''"],
    ["booking_mode", "ALTER TABLE quick_consultations ADD COLUMN booking_mode TEXT NOT NULL DEFAULT ''"],
    ["booking_date", "ALTER TABLE quick_consultations ADD COLUMN booking_date TEXT NOT NULL DEFAULT ''"],
    ["booking_slot", "ALTER TABLE quick_consultations ADD COLUMN booking_slot TEXT NOT NULL DEFAULT ''"],
    ["booking_expert", "ALTER TABLE quick_consultations ADD COLUMN booking_expert TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [col, sql] of migrations) {
    if (!existing.has(col)) {
      await run(sql);
    }
  }
  tableReady = true;
}

export function computeBmi(heightCm: number, weightKg: number): { bmi: number | null; label: string } {
  if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) {
    return { bmi: null, label: "Chưa đủ dữ liệu" };
  }
  const hM = heightCm / 100;
  const bmi = Math.round((weightKg / (hM * hM)) * 10) / 10;
  let label = "Bình thường";
  if (bmi < 18.5) label = "Thiếu cân";
  else if (bmi >= 25) label = "Thừa cân / Béo phì (chuẩn châu Á)";
  else if (bmi >= 23) label = "Tiền thừa cân (chuẩn châu Á)";
  return { bmi, label };
}

export async function getQuickConsultById(id: number): Promise<QuickConsultRow | undefined> {
  await ensureQuickConsultTable();
  return one<QuickConsultRow>(`SELECT * FROM quick_consultations WHERE id = ?`, id);
}

export async function getQuickConsultByToken(token: string): Promise<QuickConsultRow | undefined> {
  await ensureQuickConsultTable();
  if (!token.trim()) return undefined;
  return one<QuickConsultRow>(`SELECT * FROM quick_consultations WHERE share_token = ?`, token.trim());
}

export async function getExpertProfileConfig(): Promise<ExpertProfileConfig> {
  const row = await one<{ value: string }>(`SELECT value FROM settings WHERE key = 'expert_consult_config'`);
  if (!row?.value) return DEFAULT_EXPERT_CONFIG;
  try {
    return { ...DEFAULT_EXPERT_CONFIG, ...(JSON.parse(row.value) as Partial<ExpertProfileConfig>) };
  } catch {
    return DEFAULT_EXPERT_CONFIG;
  }
}

export async function saveExpertProfileConfig(cfg: ExpertProfileConfig): Promise<void> {
  await run(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('expert_consult_config', ?)`,
    JSON.stringify(cfg),
  );
}

export async function listQuickConsultations(limit = 50): Promise<QuickConsultRow[]> {
  await ensureQuickConsultTable();
  return all<QuickConsultRow>(
    `SELECT * FROM quick_consultations ORDER BY id DESC LIMIT ?`,
    limit,
  );
}

export async function getPatientHistoryByPhone(phone: string): Promise<
  {
    id: number;
    customer_name: string;
    audience: string;
    height_cm: number;
    weight_kg: number;
    share_token: string;
    created_at: string;
  }[]
> {
  await ensureQuickConsultTable();
  const clean = phone.replace(/\s+/g, "").trim();
  if (clean.length < 7) return [];
  return all(
    `SELECT id, customer_name, audience, height_cm, weight_kg, share_token, created_at
     FROM quick_consultations
     WHERE REPLACE(phone, ' ', '') = ?
     ORDER BY id ASC
     LIMIT 20`,
    clean,
  );
}

export async function updateQuickConsultFollowup(input: {
  id: number;
  followupChoice: "hotline" | "advanced_free" | "advanced_paid";
  phone?: string;
  email?: string;
  note?: string;
  bookingPackage?: string;
  bookingMode?: string;
  bookingDate?: string;
  bookingSlot?: string;
  bookingExpert?: string;
}): Promise<void> {
  await ensureQuickConsultTable();
  await run(
    `UPDATE quick_consultations
     SET followup_choice = ?,
         phone = CASE WHEN ? <> '' THEN ? ELSE phone END,
         followup_email = ?,
         followup_note = ?,
         booking_package = ?,
         booking_mode = ?,
         booking_date = ?,
         booking_slot = ?,
         booking_expert = ?
     WHERE id = ?`,
    input.followupChoice,
    input.phone?.trim() ?? "",
    input.phone?.trim() ?? "",
    input.email?.trim() ?? "",
    input.note?.trim() ?? "",
    input.bookingPackage?.trim() ?? "",
    input.bookingMode?.trim() ?? "",
    input.bookingDate?.trim() ?? "",
    input.bookingSlot?.trim() ?? "",
    input.bookingExpert?.trim() ?? "",
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
  <p>Thân gửi <strong>${escapeHtml(name)}</strong>,</p>
  <p>Dựa trên hồ sơ bạn vừa khai báo theo mô hình <strong>${escapeHtml(motif.name)}</strong>, chúng tôi tổng hợp phân tích và lộ trình gợi ý dành riêng cho bạn như sau:</p>

  <h3>1. Đánh giá tổng quan thể trạng &amp; Nguyên lý Quân bình</h3>
  <ul>
    <li><strong>Mục tiêu ưu tiên:</strong> ${escapeHtml(goalsText)}</li>
    <li><strong>Tình trạng đang gặp phải:</strong> ${escapeHtml(condText)}</li>
    <li><strong>Thói quen hiện tại:</strong> ${escapeHtml(habitText)}</li>
    ${input.customNote ? `<li><strong>Ghi chú thêm của bạn:</strong> ${escapeHtml(input.customNote)}</li>` : ""}
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

  const { bmi, label: bmiLabel } = computeBmi(Number(input.heightCm) || 0, Number(input.weightKg) || 0);
  const audienceLabels: Record<string, string> = {
    tre_em: "Trẻ em & Tuổi dậy thì (đánh giá theo chuẩn tăng trưởng WHO)",
    truong_thanh: "Người trưởng thành",
    benh_ly: "Người có bệnh lý mạn tính / chuyển hoá",
    cao_tuoi: "Người cao tuổi",
  };
  const audienceDesc = audienceLabels[input.audience || "truong_thanh"] ?? "Người trưởng thành";
  const dr = input.dietRecall ?? {};
  const hasDietRecall = Boolean(dr.breakfast || dr.lunch || dr.dinner || dr.snacks);

  const prompt = `${motif.systemTone}

Hãy đóng vai **Hội đồng Chuyên gia Y khoa Hiện đại – Thực dưỡng Ohsawa – Đông Tây y Kết hợp** để viết một **Bài viết Tư vấn Sức khoẻ Cá nhân hoá** bằng tiếng Việt dành riêng cho khách hàng có thông tin sau:
- Họ tên: ${input.customerName || "Quý khách"}
- Nhóm đối tượng: ${audienceDesc}
- Tuổi / Giới tính: ${input.ageSex || "Chưa cung cấp"}
- Chiều cao: ${input.heightCm ? `${input.heightCm} cm` : "Chưa nhập"} | Cân nặng: ${input.weightKg ? `${input.weightKg} kg` : "Chưa nhập"} ${bmi ? `(BMI: ${bmi} - ${bmiLabel})` : ""}
- Nhu cầu chính: ${input.needs.join(", ") || "Cải thiện sức khoẻ tổng thể"}
- Tình trạng sức khoẻ: ${input.conditions.join(", ") || "Không ghi nhận đặc biệt"}
- Thói quen ăn uống: ${input.habits.join(", ") || "Chưa ghi nhận"}
${hasDietRecall ? `- Khẩu phần ăn thực tế 24h gần nhất:\n  + Bữa sáng: ${dr.breakfast || "Chưa ghi"}\n  + Bữa trưa: ${dr.lunch || "Chưa ghi"}\n  + Bữa tối: ${dr.dinner || "Chưa ghi"}\n  + Bữa phụ / Đồ uống: ${dr.snacks || "Không có"}` : ""}
- Ghi chú thêm: ${guardUserPromptInput(input.customNote, 800) || "Không có"}

Danh sách tài nguyên thực tế của cửa hàng để lồng ghép khéo léo vào lời khuyên (chỉ nhắc đúng tên nếu phù hợp, không bịa tên khác):
Sản phẩm theo nhóm:
${productListText || "(Chưa có)"}

Video bài giảng liên quan:
${videoText || "(Chưa có)"}

Tài liệu tham khảo:
${docText || "(Chưa có)"}

Yêu cầu đầu ra:
- Trả về **HTML sạch** (chỉ dùng thẻ p, h3, ul, li, strong, em, blockquote; KHÔNG bọc markdown \`\`\`html).
- Gồm 5 mục h3 rõ ràng:
  1. Đánh giá tổng quan theo Y khoa Hiện đại, Đông Tây y & Quân bình Âm – Dương (có nhận xét BMI / chuẩn đối tượng ${audienceDesc})
  2. Phân tích Khẩu phần 24h & Hướng dẫn Đổi món hằng ngày (chỉ rõ điểm cần điều chỉnh từ bữa ăn hiện tại và thực đơn Sáng/Trưa/Tối thay thế)
  3. Phác đồ phối hợp Thức ăn – Trợ phương – Dược thảo (Đông Tây y hỗ trợ)
  4. Lộ trình sinh hoạt 7 ngày đầu & Dấu hiệu cần đi khám chuyên khoa
  5. Lưu ý an toàn y khoa (nhấn mạnh phối hợp song song, không tự ý bỏ thuốc bác sĩ điều trị).
- Giọng văn ấm áp, chuẩn mực y khoa, độ dài khoảng 550–750 từ.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
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
  shareToken: string;
  motif: ConsultMotifOption;
  articleHtml: string;
  productGroups: MatchedProductGroup[];
  videos: MatchedVideoCard[];
  documents: MatchedDocumentCard[];
}> {
  await ensureQuickConsultTable();
  const motif = CONSULT_MOTIFS.find((m) => m.id === input.motifId) ?? CONSULT_MOTIFS[0];
  const { productGroups, videos, documents } = await matchResources(input);

  const hasDietRecall = Object.values(input.dietRecall ?? {}).some((v) => String(v ?? "").trim().length > 0);
  const canUseCache = !(input.customNote || "").trim() && !hasDietRecall;
  const { bmi } = computeBmi(Number(input.heightCm) || 0, Number(input.weightKg) || 0);
  const bmiBand = !bmi ? "none" : bmi < 18.5 ? "under" : bmi < 23 ? "normal" : bmi < 25 ? "over" : "obese";
  const cacheKey = canUseCache
    ? crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            audience: input.audience || "truong_thanh",
            needs: [...input.needs].sort(),
            conditions: [...input.conditions].sort(),
            habits: [...input.habits].sort(),
            motifId: motif.id,
            bmiBand,
          }),
        )
        .digest("hex")
        .slice(0, 32)
    : "";

  let aiHtml: string | null = null;
  if (cacheKey) {
    try {
      await run(`
        CREATE TABLE IF NOT EXISTS quick_consult_cache (
          cache_key TEXT PRIMARY KEY,
          article_html TEXT NOT NULL,
          hit_count INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      const cached = await one<{ article_html: string }>(
        "SELECT article_html FROM quick_consult_cache WHERE cache_key = ? AND created_at >= datetime('now', '-14 days')",
        cacheKey,
      );
      if (cached?.article_html) {
        aiHtml = cached.article_html;
        await run("UPDATE quick_consult_cache SET hit_count = hit_count + 1 WHERE cache_key = ?", cacheKey);
      }
    } catch {
      /* ignore cache errors */
    }
  }

  if (!aiHtml) {
    aiHtml = await callGeminiExpertConsult(input, motif, productGroups, videos, documents);
    if (aiHtml && cacheKey) {
      await run(
        "INSERT OR REPLACE INTO quick_consult_cache (cache_key, article_html, hit_count, created_at) VALUES (?, ?, 1, datetime('now'))",
        cacheKey,
        aiHtml,
      ).catch(() => {});
    }
  }

  const articleHtml = sanitizeAiHtml(aiHtml || buildFallbackArticle(input, motif, productGroups));

  const res = await run(
    `INSERT INTO quick_consultations (
      customer_name, phone, age_sex, audience, height_cm, weight_kg,
      diet_recall_json, needs_json, conditions_json, habits_json,
      motif_id, custom_note, article_html
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.customerName.trim(),
    input.phone.trim(),
    input.ageSex.trim(),
    input.audience?.trim() || "truong_thanh",
    Number(input.heightCm) || 0,
    Number(input.weightKg) || 0,
    JSON.stringify(input.dietRecall ?? {}),
    JSON.stringify(input.needs),
    JSON.stringify(input.conditions),
    JSON.stringify(input.habits),
    motif.id,
    input.customNote.trim(),
    articleHtml,
  );

  const shareToken = `hs-${res.lastInsertRowid}-${crypto.randomBytes(6).toString("hex")}`;
  await run(`UPDATE quick_consultations SET share_token = ? WHERE id = ?`, shareToken, res.lastInsertRowid);

  return {
    id: res.lastInsertRowid,
    shareToken,
    motif,
    articleHtml,
    productGroups,
    videos,
    documents,
  };
}

function parseJsonArray(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function buildBackendExpertFallback(
  row: QuickConsultRow,
  cfg: ExpertProfileConfig,
  groups: MatchedProductGroup[],
): string {
  const { bmi, label } = computeBmi(row.height_cm, row.weight_kg);
  const needs = parseJsonArray(row.needs_json);
  const conditions = parseJsonArray(row.conditions_json);
  const habits = parseJsonArray(row.habits_json);

  const prodRows = groups
    .map(
      (g) =>
        `<li><strong>${g.groupTitle}:</strong> ${g.items
          .slice(0, 3)
          .map((it) => `${it.name} (${new Intl.NumberFormat("vi-VN").format(it.sale_price ?? it.price)}đ)`)
          .join(" · ")}</li>`,
    )
    .join("");

  return `
<div class="expert-pdf-report">
  <h3>1. Tóm tắt Tình trạng Sức khoẻ &amp; Chỉ số Cơ thể</h3>
  <ul>
    <li><strong>Họ tên:</strong> ${row.customer_name || "Quý khách"} ${row.age_sex ? `(${row.age_sex})` : ""}</li>
    <li><strong>Chiều cao / Cân nặng:</strong> ${row.height_cm ? `${row.height_cm} cm` : "Chưa nhập"} · ${row.weight_kg ? `${row.weight_kg} kg` : "Chưa nhập"} ${bmi ? `— <strong>BMI: ${bmi} (${label})</strong>` : ""}</li>
    <li><strong>Nhu cầu ưu tiên:</strong> ${needs.join("; ") || "Cân bằng sức khoẻ"}</li>
    <li><strong>Tình trạng sức khoẻ:</strong> ${conditions.join("; ") || "Chưa ghi nhận triệu chứng đặc biệt"}</li>
    <li><strong>Thói quen hiện tại:</strong> ${habits.join("; ") || "Đang tìm hiểu thực dưỡng"}</li>
    ${row.custom_note ? `<li><strong>Ghi chú bệnh nhân:</strong> ${row.custom_note}</li>` : ""}
  </ul>

  <h3>2. Hướng Ăn Uống Thực Dưỡng Cá Nhân Hoá</h3>
  <ul>
    <li><strong>Nguyên tắc nền tảng:</strong> Áp dụng theo trường phái <em>${cfg.schoolOfThought}</em>. Ưu tiên ngũ cốc nguyên cám (gạo lứt, hạt kê, yến mạch), nhai kỹ 25–30 lần/miếng để hỗ trợ men tiêu hoá và ổn định đường huyết.</li>
    <li><strong>Thực đơn mẫu trong ngày:</strong>
      <ul>
        <li><em>Sáng (6h30–7h30):</em> Cháo gạo lứt đậu đỏ hoặc súp Miso rau củ ấm.</li>
        <li><em>Trưa (11h30–12h30):</em> 50% cơm gạo lứt muối mè, 30% rau củ theo mùa hấp/luộc, 20% đạm thực vật (đậu hũ, tương Tamari lâu năm).</li>
        <li><em>Tối (trước 19h00):</em> Ăn nhẹ bằng bún/phở lứt hoặc canh dưỡng sinh rau củ, hạn chế trái cây lạnh và đường tinh luyện buổi tối.</li>
      </ul>
    </li>
  </ul>

  <h3>3. Lối Sống, Vận Động &amp; Điều Chỉnh Thói Quen</h3>
  <ul>
    <li>Ngủ trước 22h30, giữ ấm vùng bụng và bàn chân, tránh tắm đêm muộn.</li>
    <li>Đi bộ nhẹ hoặc tập hít thở sâu 20–30 phút mỗi sáng để kích thích tuần hoàn và trao đổi chất.</li>
    <li>Uống nước ấm từng ngụm nhỏ thay vì uống nhiều nước đá trong bữa ăn.</li>
  </ul>

  <h3>4. Sản Phẩm Cần Bổ Sung (Thức Ăn – Trợ Phương – Dược Thảo)</h3>
  <ul>
    ${prodRows || "<li>Kết hợp gạo lứt hữu cơ, tương Tamari/Miso và trà thảo mộc phù hợp thể trạng.</li>"}
  </ul>

  <blockquote>
    <strong>Lời dặn của ${cfg.expertName}:</strong> ${cfg.customDirective}
  </blockquote>
</div>`;
}

export async function runBackendExpertAnalysis(
  id: number,
  overrideConfig?: Partial<ExpertProfileConfig>,
): Promise<QuickConsultRow> {
  const row = await getQuickConsultById(id);
  if (!row) throw new Error("Không tìm thấy hồ sơ bệnh nhân.");

  const baseCfg = await getExpertProfileConfig();
  const cfg: ExpertProfileConfig = { ...baseCfg, ...overrideConfig };
  const needs = parseJsonArray(row.needs_json);
  const conditions = parseJsonArray(row.conditions_json);
  const habits = parseJsonArray(row.habits_json);
  const { bmi, label } = computeBmi(row.height_cm, row.weight_kg);

  const { productGroups } = await matchResources({
    customerName: row.customer_name,
    phone: row.phone,
    ageSex: row.age_sex,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    needs,
    conditions,
    habits,
    motifId: row.motif_id,
    customNote: row.custom_note,
  });

  const apiRow = await one<{ value: string }>(`SELECT value FROM settings WHERE key = 'gemini_api_key'`);
  const apiKey = apiRow?.value?.trim() || process.env.GEMINI_API_KEY?.trim() || "";

  let reportHtml = "";
  if (apiKey) {
    const prodList = productGroups
      .map(
        (g) =>
          `${g.groupTitle}: ${g.items
            .map((i) => `${i.name} (${new Intl.NumberFormat("vi-VN").format(i.sale_price ?? i.price)}đ)`)
            .join(", ")}`,
      )
      .join("\n");

    const prompt = `Bạn là ${cfg.expertName} (${cfg.expertTitle}).
Trường phái & phương pháp: ${cfg.schoolOfThought}.
Trọng tâm phân tích: ${cfg.focusAreas}.
Chỉ dẫn chuyên môn riêng: ${cfg.customDirective}.

Hãy phân tích hồ sơ bệnh nhân dưới đây và lập **Bản Hồ Sơ Tư Vấn Sức Khoẻ Cá Nhân Hoá (dùng để xuất PDF gửi bệnh nhân)**:
- Họ tên: ${row.customer_name || "Quý khách"}
- SĐT: ${row.phone || "Chưa cung cấp"}
- Tuổi / Giới tính: ${row.age_sex || "Chưa cung cấp"}
- Chiều cao: ${row.height_cm ? `${row.height_cm} cm` : "Chưa nhập"} | Cân nặng: ${row.weight_kg ? `${row.weight_kg} kg` : "Chưa nhập"} | BMI: ${bmi ? `${bmi} (${label})` : "Chưa tính được"}
- Nhu cầu: ${needs.join(", ") || "Không ghi nhận"}
- Tình trạng sức khoẻ: ${conditions.join(", ") || "Không ghi nhận"}
- Thói quen: ${habits.join(", ") || "Không ghi nhận"}
- Ghi chú thêm của bệnh nhân: ${row.custom_note || "Không có"}
- Ghi chú tư vấn nâng cao: ${row.followup_note || "Không có"}

Danh sách sản phẩm hiện có trong cửa hàng để chỉ định bổ sung (chọn đúng tên phù hợp nhất):
${prodList || "(Chưa có)"}

Yêu cầu đầu ra:
- Trả về **HTML sạch** (chỉ dùng thẻ h3, p, ul, li, strong, em, table, tr, th, td, blockquote; KHÔNG bọc markdown fence).
- Bắt buộc có đúng 4 phần rõ ràng:
  1. <h3>1. Tóm tắt Tình trạng Sức khoẻ &amp; Chỉ số Cơ thể (BMI)</h3>
  2. <h3>2. Hướng Ăn Uống Thực Dưỡng Cá Nhân Hoá</h3> (gồm nguyên tắc + gợi ý thực đơn Sáng/Trưa/Tối)
  3. <h3>3. Lối Sống, Vận Động &amp; Điều Chỉnh Thói Quen</h3>
  4. <h3>4. Sản Phẩm Cần Bổ Sung (Thức Ăn – Trợ Phương – Dược Thảo)</h3> (nêu rõ công dụng và cách dùng gợi ý từng món).
- Kết thúc bằng 1 đoạn lưu ý an toàn y khoa (không thay thế chẩn đoán bác sĩ điều trị).`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.35 },
          }),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (raw.trim()) {
          reportHtml = raw.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
        }
      }
    } catch {
      /* fallback below */
    }
  }

  if (!reportHtml) {
    reportHtml = buildBackendExpertFallback(row, cfg, productGroups);
  }

  const shareToken =
    row.share_token || `hs-${row.id}-${Math.random().toString(36).slice(2, 8)}`;

  await run(
    `UPDATE quick_consultations
     SET expert_report_html = ?,
         expert_config_json = ?,
         share_token = ?,
         expert_analyzed_at = datetime('now')
     WHERE id = ?`,
    reportHtml,
    JSON.stringify(cfg),
    shareToken,
    row.id,
  );

  return (await getQuickConsultById(row.id))!;
}
