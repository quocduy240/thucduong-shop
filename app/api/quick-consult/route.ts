import { generateQuickConsultReport } from "@/lib/quick-consult";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rl = checkRateLimit(getClientIp(req), {
    namespace: "quick-consult",
    limit: 6,
    windowMs: 5 * 60_000,
  });
  if (!rl.allowed) {
    return rateLimitResponse(
      rl.retryAfterSec,
      `Hệ thống tư vấn AI đang nhận nhiều yêu cầu từ thiết bị của bạn. Vui lòng thử lại sau ${rl.retryAfterSec} giây.`,
    );
  }

  try {
    const body = (await req.json()) as {
      customerName?: string;
      phone?: string;
      ageSex?: string;
      audience?: string;
      heightCm?: number | string;
      weightKg?: number | string;
      dietRecall?: { breakfast?: string; lunch?: string; dinner?: string; snacks?: string };
      needs?: string[];
      conditions?: string[];
      habits?: string[];
      motifId?: string;
      customNote?: string;
    };

    const needs = Array.isArray(body.needs) ? body.needs.slice(0, 20).map((x) => String(x).slice(0, 100)) : [];
    const conditions = Array.isArray(body.conditions)
      ? body.conditions.slice(0, 20).map((x) => String(x).slice(0, 100))
      : [];
    const habits = Array.isArray(body.habits) ? body.habits.slice(0, 20).map((x) => String(x).slice(0, 100)) : [];
    const customNote = String(body.customNote ?? "").trim().slice(0, 1500);
    const rawDiet = body.dietRecall ?? {};
    const dietRecall = {
      breakfast: String(rawDiet.breakfast ?? "").trim().slice(0, 300),
      lunch: String(rawDiet.lunch ?? "").trim().slice(0, 300),
      dinner: String(rawDiet.dinner ?? "").trim().slice(0, 300),
      snacks: String(rawDiet.snacks ?? "").trim().slice(0, 300),
    };

    if (needs.length === 0 && conditions.length === 0 && habits.length === 0 && !customNote) {
      return Response.json(
        { error: "Vui lòng chọn ít nhất một nhu cầu/tình trạng sức khoẻ hoặc nhập mô tả của bạn." },
        { status: 400 },
      );
    }

    const result = await generateQuickConsultReport({
      customerName: String(body.customerName ?? "").trim().slice(0, 100),
      phone: String(body.phone ?? "").trim().slice(0, 25),
      ageSex: String(body.ageSex ?? "").trim().slice(0, 50),
      audience: String(body.audience ?? "truong_thanh").trim().slice(0, 50),
      heightCm: Number(body.heightCm ?? 0) || 0,
      weightKg: Number(body.weightKg ?? 0) || 0,
      dietRecall,
      needs,
      conditions,
      habits,
      motifId: String(body.motifId ?? "").slice(0, 60),
      customNote,
    });

    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message || "Không thể phân tích tư vấn lúc này." },
      { status: 500 },
    );
  }
}
