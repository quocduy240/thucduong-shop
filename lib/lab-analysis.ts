import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { all, one, run } from "./db";
import { callGeminiGenerateContent, resolveGeminiApiKey } from "./gemini-key";

export type LabJobStatus = "pending" | "processing" | "done" | "error";

export type LabAnalysisRow = {
  id: number;
  patient_name: string;
  patient_age_sex: string;
  symptoms_note: string;
  file_name: string;
  file_mime: string;
  file_url: string;
  raw_text: string;
  status: LabJobStatus;
  summary: string;
  analysis_html: string;
  error_message: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type LabAnalysisInternalRow = LabAnalysisRow & {
  file_base64: string;
};

let tableReady = false;

export async function ensureLabAnalysesTable(): Promise<void> {
  if (tableReady) return;
  await run(`
    CREATE TABLE IF NOT EXISTS lab_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL DEFAULT '',
      patient_age_sex TEXT NOT NULL DEFAULT '',
      symptoms_note TEXT NOT NULL DEFAULT '',
      file_name TEXT NOT NULL DEFAULT '',
      file_mime TEXT NOT NULL DEFAULT '',
      file_url TEXT NOT NULL DEFAULT '',
      file_base64 TEXT NOT NULL DEFAULT '',
      raw_text TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      summary TEXT NOT NULL DEFAULT '',
      analysis_html TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT
    )
  `);
  tableReady = true;
}

const PUBLIC_COLS = `
  id, patient_name, patient_age_sex, symptoms_note,
  file_name, file_mime, file_url, raw_text,
  status, summary, analysis_html, error_message,
  created_at, started_at, completed_at
`;

export async function listLabAnalyses(limit = 30): Promise<LabAnalysisRow[]> {
  await ensureLabAnalysesTable();
  return all<LabAnalysisRow>(
    `SELECT ${PUBLIC_COLS} FROM lab_analyses ORDER BY id DESC LIMIT ?`,
    limit,
  );
}

export async function getLabAnalysisById(id: number): Promise<LabAnalysisRow | undefined> {
  await ensureLabAnalysesTable();
  return one<LabAnalysisRow>(`SELECT ${PUBLIC_COLS} FROM lab_analyses WHERE id = ?`, id);
}

export async function createLabAnalysis(input: {
  patient_name?: string;
  patient_age_sex?: string;
  symptoms_note?: string;
  file_name?: string;
  file_mime?: string;
  file_url?: string;
  file_base64?: string;
  raw_text?: string;
}): Promise<number> {
  await ensureLabAnalysesTable();
  const res = await run(
    `INSERT INTO lab_analyses (
      patient_name, patient_age_sex, symptoms_note,
      file_name, file_mime, file_url, file_base64, raw_text, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    input.patient_name?.trim() ?? "",
    input.patient_age_sex?.trim() ?? "",
    input.symptoms_note?.trim() ?? "",
    input.file_name?.trim() ?? "",
    input.file_mime?.trim() ?? "",
    input.file_url?.trim() ?? "",
    input.file_base64 ?? "",
    input.raw_text?.trim() ?? "",
  );
  return res.lastInsertRowid;
}

export async function deleteLabAnalysis(id: number): Promise<void> {
  await ensureLabAnalysesTable();
  await run("DELETE FROM lab_analyses WHERE id = ?", id);
}

async function getGeminiApiKey(): Promise<string> {
  return resolveGeminiApiKey();
}

function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```(?:html|json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function analyzeLabJobWithGemini(job: LabAnalysisInternalRow): Promise<{
  summary: string;
  analysisHtml: string;
}> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "Chưa cấu hình GEMINI_API_KEY. Vui lòng nhập API Key trong mục AI Gemini hoặc biến môi trường server.",
    );
  }

  const prompt = `Bạn là Bác sĩ Chuyên khoa Nội Tổng quát & Y học Chứng cứ (Evidence-Based Medicine) với kiến thức y khoa hiện đại cập nhật theo các hướng dẫn quốc tế (WHO, AHA/ACC, ADA, KDIGO, EASL).

Hãy đọc và phân tích kết quả xét nghiệm được cung cấp (từ hình ảnh/PDF đính kèm hoặc văn bản chỉ số) bằng **tiếng Việt** chuẩn xác, khách quan, dễ hiểu cho bệnh nhân và nhân viên tư vấn.

Thông tin bổ sung:
- Họ tên / Mã hồ sơ: ${job.patient_name || "Chưa cung cấp"}
- Tuổi / Giới tính: ${job.patient_age_sex || "Chưa cung cấp"}
- Triệu chứng / Ghi chú lâm sàng: ${job.symptoms_note || "Không có"}
${job.raw_text ? `- Dữ liệu chỉ số nhập tay / OCR:\n${job.raw_text}` : ""}

Yêu cầu cấu trúc đầu ra — CHỈ trả về một JSON object hợp lệ (không bọc markdown fence) với đúng 2 trường:
{
  "summary": "Tóm tắt 1-2 câu ngắn gọn các điểm đáng chú ý nhất (ví dụ: Đường huyết lúc đói và HbA1c tăng nhẹ, mỡ máu LDL cao; chức năng gan thận bình thường).",
  "analysisHtml": "<div class='lab-report'>...HTML phân tích chi tiết...</div>"
}

Trong "analysisHtml", hãy trình bày rõ ràng bằng HTML sạch (h3, table, ul/li, p, div) gồm 5 phần:
1. <h3>1. Bảng tổng hợp &amp; Đối chiếu chỉ số xét nghiệm</h3>
   - Dùng <table> có viền rõ ràng (Chỉ số | Kết quả | Khoảng tham chiếu chuẩn | Đánh giá: Bình thường / Cao / Thấp / Cần lưu ý).
   - Nếu ảnh mờ hoặc thiếu giá trị nào, ghi rõ "Chưa đủ dữ liệu / Cần đối chiếu bản gốc", tuyệt đối KHÔNG bịa số liệu.
2. <h3>2. Giải thích ý nghĩa lâm sàng theo Y học Hiện đại</h3>
   - Phân tích nguyên nhân thường gặp và mối liên hệ giữa các chỉ số (ví dụ: hội chứng chuyển hoá, đề kháng insulin, men gan, chức năng lọc cầu thận eGFR, thiếu máu...).
3. <h3>3. Dấu hiệu cảnh báo (Red Flags) &amp; Khuyến nghị thăm khám</h3>
   - Khi nào cần đi khám bác sĩ chuyên khoa ngay; các xét nghiệm cận lâm sàng bổ sung thường được bác sĩ cân nhắc.
4. <h3>4. Gợi ý Dinh dưỡng &amp; Lối sống khoa học (hài hoà thực dưỡng cân bằng)</h3>
   - Dựa trên y học dinh dưỡng hiện đại kết hợp ăn uống tự nhiên lành mạnh (ngũ cốc nguyên hạt, cân bằng đạm-xơ, hạn chế đường tinh luyện, vận động, giấc ngủ).
5. <div style="background:#fef3c7;border-left:4px solid #d97706;padding:12px 14px;border-radius:8px;margin-top:16px;"><strong>Lưu ý y khoa:</strong> Kết quả phân tích bằng AI chỉ mang tính tham khảo giáo dục sức khỏe, không thay thế chẩn đoán và phác đồ điều trị trực tiếp của bác sĩ chuyên khoa.</div>`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (job.file_base64 && job.file_mime) {
    parts.push({
      inlineData: {
        mimeType: job.file_mime,
        data: job.file_base64,
      },
    });
  }
  parts.push({ text: prompt });

  const res = await callGeminiGenerateContent(
    apiKey,
    {
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    },
    ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-flash-latest"],
    90_000,
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API lỗi (${res.status}): ${errText.slice(0, 240)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const rawOut = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!rawOut) {
    throw new Error("Gemini không trả về nội dung phân tích.");
  }

  const cleaned = stripMarkdownFences(rawOut);
  try {
    const parsed = JSON.parse(cleaned) as { summary?: string; analysisHtml?: string };
    if (parsed.analysisHtml) {
      return {
        summary: (parsed.summary || "Đã hoàn tất phân tích kết quả xét nghiệm.").slice(0, 500),
        analysisHtml: parsed.analysisHtml,
      };
    }
  } catch {
    /* Fallback to raw HTML if Gemini didn't wrap in JSON */
  }

  return {
    summary: "Đã hoàn tất phân tích kết quả xét nghiệm theo y học hiện đại.",
    analysisHtml: cleaned,
  };
}

/**
 * Processes at most ONE pending (or stale >3m processing) job when the server is idle.
 * Returns { processed: boolean, jobId?: number, status?: string }.
 */
export async function processNextIdleLabJob(targetJobId?: number): Promise<{
  processed: boolean;
  jobId?: number;
  status?: LabJobStatus;
  error?: string;
}> {
  await ensureLabAnalysesTable();

  const job = targetJobId
    ? await one<LabAnalysisInternalRow>(
        `SELECT * FROM lab_analyses WHERE id = ? AND status IN ('pending', 'error')`,
        targetJobId,
      )
    : await one<LabAnalysisInternalRow>(
        `SELECT * FROM lab_analyses
         WHERE status = 'pending'
            OR (status = 'processing' AND started_at IS NOT NULL AND datetime(started_at, '+3 minutes') < datetime('now'))
         ORDER BY id ASC
         LIMIT 1`,
      );

  if (!job) {
    return { processed: false };
  }

  // Claim job exclusively: only pending/error rows, or processing rows stale for > 3 minutes
  const claim = await run(
    `UPDATE lab_analyses
     SET status = 'processing', started_at = datetime('now'), error_message = ''
     WHERE id = ? AND (
       status IN ('pending', 'error')
       OR (status = 'processing' AND (started_at IS NULL OR datetime(started_at, '+3 minutes') < datetime('now')))
     )`,
    job.id,
  );
  if (claim.changes === 0) {
    return { processed: false };
  }

  try {
    const { summary, analysisHtml } = await analyzeLabJobWithGemini(job);
    // Clear file_base64 after successful analysis to keep D1 compact
    await run(
      `UPDATE lab_analyses
       SET status = 'done',
           summary = ?,
           analysis_html = ?,
           error_message = '',
           file_base64 = '',
           completed_at = datetime('now')
       WHERE id = ?`,
      summary,
      analysisHtml,
      job.id,
    );
    return { processed: true, jobId: job.id, status: "done" };
  } catch (e) {
    const msg = (e as Error).message || "Lỗi phân tích AI.";
    await run(
      `UPDATE lab_analyses
       SET status = 'error',
           error_message = ?,
           completed_at = datetime('now')
       WHERE id = ?`,
      msg.slice(0, 600),
      job.id,
    );
    return { processed: true, jobId: job.id, status: "error", error: msg };
  }
}

/**
 * Schedules background/idle execution using Cloudflare Workers ctx.waitUntil()
 * (or non-blocking setTimeout on local dev) so the upload API returns immediately.
 */
export async function scheduleIdleLabProcessing(targetJobId?: number): Promise<void> {
  const work = (async () => {
    try {
      await processNextIdleLabJob(targetJobId);
    } catch {
      /* errors are recorded inside lab_analyses.error_message */
    }
  })();

  try {
    const ctx = await getCloudflareContext({ async: true });
    if (ctx?.ctx && typeof ctx.ctx.waitUntil === "function") {
      ctx.ctx.waitUntil(work);
      return;
    }
  } catch {
    /* Fallback for environments without ExecutionContext */
  }

  setTimeout(() => {
    void work;
  }, 600);
}
