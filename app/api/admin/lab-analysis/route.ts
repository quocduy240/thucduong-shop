import { currentAdminForPath } from "@/lib/auth";
import {
  createLabAnalysis,
  deleteLabAnalysis,
  listLabAnalyses,
  processNextIdleLabJob,
  scheduleIdleLabProcessing,
} from "@/lib/lab-analysis";

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
]);

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function GET() {
  const admin = await currentAdminForPath("/admin/lab-analysis/");
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const items = await listLabAnalyses(30);
  return Response.json({ ok: true, items });
}

export async function POST(req: Request) {
  const admin = await currentAdminForPath("/admin/lab-analysis/");
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const fd = await req.formData();
    const patient_name = String(fd.get("patient_name") ?? "").trim();
    const patient_age_sex = String(fd.get("patient_age_sex") ?? "").trim();
    const symptoms_note = String(fd.get("symptoms_note") ?? "").trim();
    let raw_text = String(fd.get("raw_text") ?? "").trim();
    const mode = String(fd.get("mode") ?? "idle") === "now" ? "now" : "idle";
    const file = fd.get("file");

    let file_name = "";
    let file_mime = "";
    let file_base64 = "";

    if (file instanceof File && file.size > 0) {
      if (file.size > 6 * 1024 * 1024) {
        return Response.json(
          { error: "Tệp kết quả xét nghiệm tối đa 6MB để tối ưu xử lý AI." },
          { status: 400 },
        );
      }
      const mime = file.type || "application/octet-stream";
      if (!ALLOWED_MIMES.has(mime)) {
        return Response.json(
          { error: "Chỉ hỗ trợ ảnh (JPG, PNG, WEBP), PDF hoặc file TXT kết quả xét nghiệm." },
          { status: 400 },
        );
      }
      file_name = file.name;
      if (mime === "text/plain") {
        const txt = await file.text();
        raw_text = raw_text ? `${raw_text}\n\n${txt}` : txt;
      } else {
        file_mime = mime;
        const buf = await file.arrayBuffer();
        file_base64 = arrayBufferToBase64(buf);
      }
    }

    if (!file_base64 && !raw_text) {
      return Response.json(
        { error: "Vui lòng tải lên tệp kết quả xét nghiệm (Ảnh/PDF) hoặc nhập chỉ số xét nghiệm." },
        { status: 400 },
      );
    }

    const jobId = await createLabAnalysis({
      patient_name,
      patient_age_sex,
      symptoms_note,
      file_name,
      file_mime,
      file_base64,
      raw_text,
    });

    if (mode === "now") {
      const result = await processNextIdleLabJob(jobId);
      return Response.json({ ok: true, id: jobId, mode: "now", ...result });
    }

    // Chế độ chạy nền khi server rỗi (Cloudflare waitUntil / non-blocking background queue)
    await scheduleIdleLabProcessing(jobId);
    return Response.json(
      {
        ok: true,
        id: jobId,
        mode: "idle",
        status: "pending",
        message: "Đã đưa kết quả xét nghiệm vào hàng đợi. Server sẽ tự động phân tích AI Gemini khi rỗi.",
      },
      { status: 202 },
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message || "Lỗi tải lên kết quả xét nghiệm." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await currentAdminForPath("/admin/lab-analysis/");
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id") ?? "0");
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "ID không hợp lệ." }, { status: 400 });
  }
  await deleteLabAnalysis(id);
  return Response.json({ ok: true });
}
