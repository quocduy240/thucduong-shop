import { currentAdminForPath } from "@/lib/auth";
import { callGeminiGenerateContent, resolveGeminiApiKey } from "@/lib/gemini-key";

const TONE_PROMPTS: Record<string, string> = {
  chuyen_gia_thuc_duong:
    "Viết lại theo văn phong Chuyên gia Thực dưỡng Ohsawa: ấm áp, sâu sắc, nhấn mạnh sự quân bình Âm – Dương và lối sống thuận tự nhiên.",
  y_khoa_khoa_hoc:
    "Viết lại theo văn phong Y khoa Hiện đại & Dinh dưỡng Chứng cứ: khách quan, chính xác, mạch lạc và đáng tin cậy.",
  ban_hang_thuyet_phuc:
    "Viết lại theo văn phong Copywriting Bán hàng Chuyên nghiệp: làm nổi bật lợi ích thực tế cho khách hàng, lời văn lôi cuốn và thuyết phục tự nhiên.",
  suc_tich_de_hieu:
    "Viết lại thật súc tích, ngắn gọn, chia ý rõ ràng (có thể dùng thẻ ul/li hoặc strong ở từ khoá chính) để người đọc lướt nhanh vẫn nắm trọn ý.",
  ke_chuyen_gan_gui:
    "Viết lại theo văn phong kể chuyện gần gũi, chân thành, tạo sự đồng cảm với người đang gặp vấn đề sức khoẻ.",
  custom: "Viết lại linh hoạt theo đúng chỉ dẫn tuỳ chỉnh của biên tập viên.",
};

export async function POST(req: Request) {
  const admin = await currentAdminForPath("/admin/posts/");
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as {
      selectedText?: string;
      tone?: string;
      customInstruction?: string;
      contextTitle?: string;
      geminiApiKey?: string;
    };

    const selectedText = String(body.selectedText ?? "").trim();
    if (!selectedText) {
      return Response.json({ error: "Vui lòng tô chọn đoạn văn bản cần viết lại." }, { status: 400 });
    }

    const toneKey = body.tone && body.tone in TONE_PROMPTS ? body.tone : "chuyen_gia_thuc_duong";
    const toneDesc = TONE_PROMPTS[toneKey];
    const customInstruction = String(body.customInstruction ?? "").trim();
    const contextTitle = String(body.contextTitle ?? "").trim();

    const apiKey = await resolveGeminiApiKey(body.geminiApiKey);

    if (!apiKey) {
      // Clean fallback when Gemini API key is not configured
      const fallbackHtml = `<p>${selectedText}</p>`;
      return Response.json({
        ok: true,
        rewrittenHtml: fallbackHtml,
        fallback: true,
        note: "Chưa cấu hình GEMINI_API_KEY trong phần AI Gemini nên hệ thống giữ nguyên nội dung.",
      });
    }

    const prompt = `Bạn là Biên tập viên Nội dung Cao cấp chuyên về Sức khoẻ, Y khoa và Thực dưỡng.
${contextTitle ? `Ngữ cảnh bài viết/sản phẩm: "${contextTitle}".\n` : ""}
Yêu cầu văn phong: ${toneDesc}
${customInstruction ? `Chỉ dẫn tuỳ chỉnh thêm từ người viết: ${customInstruction}\n` : ""}
Đoạn văn bản gốc cần viết lại:
"""
${selectedText}
"""

Quy tắc đầu ra:
- Chỉ trả về đoạn HTML sạch đã viết lại bằng tiếng Việt (chỉ dùng thẻ p, strong, em, ul, li, h3 nếu phù hợp; KHÔNG bọc markdown \`\`\`html, KHÔNG giải thích thừa).
- Giữ nguyên sự trung thực về số liệu/tên sản phẩm nếu có trong đoạn gốc.`;

    const res = await callGeminiGenerateContent(apiKey, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.55 },
    });

    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      throw new Error(`Gemini API lỗi (${res.status}): ${errTxt.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const rewrittenHtml = raw.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!rewrittenHtml) {
      throw new Error("AI không trả về nội dung viết lại.");
    }

    return Response.json({ ok: true, rewrittenHtml });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message || "Không thể viết lại đoạn văn bản." },
      { status: 500 },
    );
  }
}
