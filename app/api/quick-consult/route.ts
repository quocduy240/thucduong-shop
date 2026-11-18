import { generateQuickConsultReport } from "@/lib/quick-consult";

export async function POST(req: Request) {
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

    const needs = Array.isArray(body.needs) ? body.needs.map(String) : [];
    const conditions = Array.isArray(body.conditions) ? body.conditions.map(String) : [];
    const habits = Array.isArray(body.habits) ? body.habits.map(String) : [];
    const customNote = String(body.customNote ?? "").trim();

    if (needs.length === 0 && conditions.length === 0 && habits.length === 0 && !customNote) {
      return Response.json(
        { error: "Vui lòng chọn ít nhất một nhu cầu/tình trạng sức khoẻ hoặc nhập mô tả của bạn." },
        { status: 400 },
      );
    }

    const result = await generateQuickConsultReport({
      customerName: String(body.customerName ?? "").trim(),
      phone: String(body.phone ?? "").trim(),
      ageSex: String(body.ageSex ?? "").trim(),
      audience: String(body.audience ?? "truong_thanh").trim(),
      heightCm: Number(body.heightCm ?? 0) || 0,
      weightKg: Number(body.weightKg ?? 0) || 0,
      dietRecall: body.dietRecall ?? {},
      needs,
      conditions,
      habits,
      motifId: String(body.motifId ?? ""),
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
