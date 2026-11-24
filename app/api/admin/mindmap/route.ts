import { currentAdminForPath } from "@/lib/auth";
import { all, one, run } from "@/lib/db";
import { callGeminiGenerateContent, resolveGeminiApiKey } from "@/lib/gemini-key";
import { slugify } from "@/lib/uploads";

export type MindmapBranch = {
  title: string;
  icon: string;
  items: string[];
};

export type MindmapStructure = {
  centerTitle: string;
  centerSubtitle: string;
  branches: MindmapBranch[];
};

function generateBuiltinDeepResearch(topic: string): string {
  const cleanTopic = topic.trim() || "Phương pháp Thực Dưỡng Hiện Đại & Quân Bình Âm Dương";
  return `# Báo cáo Chuyên sâu (Deep Research): ${cleanTopic}

## 1. Bản chất & Cơ chế Sinh học - Quân bình Âm Dương
- Cơ thể con người hoạt động tối ưu khi môi trường nội môi (máu và dịch ngoại bào) duy trì độ pH kiềm nhẹ từ 7.35 – 7.45.
- Khi tiêu thụ quá nhiều thực phẩm Cực Âm (đường tinh luyện, hóa chất phụ gia, nước ngọt) hoặc Cực Dương (thịt đỏ, đạm động vật dư thừa), cơ thể rơi vào trạng thái axit hóa và tích tụ độc tố nội bào.
- Áp dụng ${cleanTopic} giúp tái lập trật tự Quân bình Âm Dương, kích hoạt cơ chế Tự thực tế bào (Autophagy - Giải Nobel Y sinh học 2016) để dọn dẹp tế bào hư tổn.

## 2. Trụ cột Dinh dưỡng Toàn phần (Ngũ cốc & Thực vật Sạch)
- Lấy hạt Gạo lứt nguyên cám (lớp cám và phôi giàu vitamin nhóm B, GABA, chất xơ hòa tan và khoáng chất vi lượng) làm nền tảng chính trong bữa ăn hàng ngày.
- Kết hợp hài hòa với các loại đậu hạt hữu cơ (đậu đỏ Azuki, đậu gà, đậu lăng, hạt sen) và rau củ theo mùa (ưu tiên củ cải trắng, cà rốt, ngưu bàng, bí đỏ).
- Sử dụng gia vị lên men tự nhiên lâu năm như Tương Tamari, Miso, Mơ muối lâu năm (Umeboshi) để bổ sung lợi khuẩn và enzyme tiêu hóa.

## 3. Quy trình Thực hành & Kỹ thuật Chế biến Chuẩn
- Nhai kỹ mỗi miếng ăn từ 50 – 100 lần để trộn đều thức ăn với enzyme Amylase trong nước bọt, giúp kiềm hóa thức ăn ngay từ khoang miệng và giảm tải 70% gánh nặng cho dạ dày.
- Nấu chín kỹ bằng nồi áp suất hoặc nồi đất với chút muối biển hầm để Dương hóa thực phẩm, giúp người có thể trạng yếu hoặc người lớn tuổi hấp thu dễ dàng.
- Ăn đúng giờ, dừng ăn trước 19h30 tối và chỉ ăn đạt khoảng 70% – 80% dung tích dạ dày.

## 4. Trợ phương Thực dưỡng & Chăm sóc Khi Cần Phục hồi
- Buổi sáng sớm có thể dùng trà Bình Minh (Bột sắn dây nguyên chất nấu chín với tương Tamari, mơ muối và vài giọt nước gừng) để làm ấm đường ruột và giải độc.
- Kết hợp Canh dưỡng sinh hoặc Trà Bancha 3 năm để hỗ trợ thanh lọc máu, giảm mỡ máu và ổn định đường huyết tự nhiên.
- Theo dõi phân và nước tiểu hàng ngày làm thước đo chính xác nhất để điều chỉnh tỷ lệ muối mè và lượng nước uống.

## 5. Chuyển hóa Lối sống, Vận động & Sức khỏe Tinh thần (Tâm An)
- Duy trì vận động nhẹ nhàng ngoài thiên nhiên (đi bộ chân trần, tập khí công, phơi nắng sớm 15–20 phút mỗi ngày) để tăng cường tuần hoàn khí huyết.
- Giữ tâm trí bình an, lòng biết ơn trước mỗi bữa ăn và ngủ sớm trước 22h30 để gan mật thực hiện chu trình thải độc sâu vào ban đêm.`;
}

function parseReportIntoMindmap(topic: string, reportText: string): MindmapStructure {
  const lines = reportText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let centerTitle = topic.trim();
  if (!centerTitle) {
    const h1 = lines.find((l) => /^#\s+/.test(l))?.replace(/^#\s+/, "");
    centerTitle = h1 || "Sơ Đồ Tư Duy Thực Dưỡng";
  }
  centerTitle = centerTitle.replace(/^Báo cáo Chuyên sâu\s*(\(Deep Research\))?:\s*/i, "").trim();

  const icons = ["🌱", "🍚", "🥣", "🍵", "🧘", "🔬", "💡", "🌿"];
  const branches: MindmapBranch[] = [];
  let currentBranch: MindmapBranch | null = null;

  for (const line of lines) {
    if (/^#{2,3}\s+/.test(line)) {
      const title = line
        .replace(/^#{2,3}\s+/, "")
        .replace(/^\d+[\.\)]\s*/, "")
        .replace(/\*\*/g, "")
        .trim();
      if (title) {
        currentBranch = {
          title,
          icon: icons[branches.length % icons.length],
          items: [],
        };
        branches.push(currentBranch);
      }
    } else if (/^([-*•]|\d+\.)\s+/.test(line)) {
      const item = line
        .replace(/^([-*•]|\d+\.)\s+/, "")
        .replace(/\*\*/g, "")
        .trim();
      if (item.length >= 8) {
        if (!currentBranch) {
          currentBranch = {
            title: "Luận điểm cốt lõi",
            icon: icons[branches.length % icons.length],
            items: [],
          };
          branches.push(currentBranch);
        }
        // Keep concise summary for mindmap readability while preserving full points
        const concise = item.length > 140 ? item.slice(0, 137) + "..." : item;
        currentBranch.items.push(concise);
      }
    } else if (line.length >= 30 && !/^#\s+/.test(line)) {
      if (!currentBranch) {
        currentBranch = {
          title: "Nội dung trọng tâm",
          icon: icons[branches.length % icons.length],
          items: [],
        };
        branches.push(currentBranch);
      }
      if (currentBranch.items.length < 6) {
        const concise = line.length > 140 ? line.slice(0, 137) + "..." : line;
        currentBranch.items.push(concise);
      }
    }
  }

  if (branches.length === 0) {
    return {
      centerTitle,
      centerSubtitle: "Tổng hợp từ Báo cáo Chuyên sâu Thực Dưỡng Phúc Thọ",
      branches: [
        {
          title: "Nguyên lý & Cơ chế Cốt lõi",
          icon: "🔬",
          items: [
            "Quân bình Âm Dương & kiềm hóa môi trường nội môi (pH 7.35 - 7.45)",
            "Kích hoạt cơ chế tự chữa lành và tự thực tế bào (Autophagy)",
          ],
        },
        {
          title: "Thực phẩm Chủ đạo Khuyên dùng",
          icon: "🌾",
          items: [
            "Gạo lứt nguyên cám, hạt kê, đậu đỏ Azuki, đậu hạt hữu cơ",
            "Rau củ theo mùa: củ cải trắng, cà rốt, ngưu bàng, bí đỏ",
          ],
        },
        {
          title: "Kỹ thuật Chế biến & Ăn uống",
          icon: "🥣",
          items: [
            "Nhai kỹ 50 - 100 lần mỗi miếng để trộn đều enzyme nước bọt",
            "Sử dụng muối biển hầm, tương Tamari, Miso, mơ muối lâu năm",
          ],
        },
        {
          title: "Trợ phương & Lối sống Tâm An",
          icon: "🧘",
          items: [
            "Trà Bình Minh buổi sáng, Canh dưỡng sinh & Trà Bancha 3 năm",
            "Vận động nhẹ nhàng, phơi nắng sớm, ngủ trước 22h30 & giữ tâm bình an",
          ],
        },
      ],
    };
  }

  return {
    centerTitle,
    centerSubtitle: "Sơ đồ tư duy đúc kết từ Nghiên cứu Chuyên sâu (Deep Research)",
    branches: branches.slice(0, 8),
  };
}

export async function POST(req: Request) {
  if (!(await currentAdminForPath("/admin/posts/", "/admin/products/"))) {
    return Response.json({ error: "Chưa đăng nhập quản trị." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "deep_research" | "summarize_nodes" | "save_block";
    topic?: string;
    contextText?: string;
    reportText?: string;
    geminiApiKey?: string;
    // For save_block
    blockTitle?: string;
    blockSlug?: string;
    blockPositions?: string;
    blockContentHtml?: string;
  };

  let savedKey = "";
  try {
    savedKey = await resolveGeminiApiKey(body.geminiApiKey);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }

  // STEP 1: Deep Research for a topic using Gemini AI (with built-in expert fallback)
  if (body.action === "deep_research") {
    const topic = String(body.topic ?? "").trim();
    if (!topic) {
      return Response.json({ error: "Vui lòng nhập chủ đề cần thực hiện Deep Research." }, { status: 400 });
    }

    let report = "";
    let usedGemini = false;

    if (savedKey) {
      try {
        const prompt = `Bạn là chuyên gia nghiên cứu cao cấp về Thực Dưỡng Hiện Đại, Y học Cổ truyền Đông Phương và Dinh dưỡng Toàn phần (WFPB) tại Thực Dưỡng Phúc Thọ (kênh YouTube Duy Vo).
Hãy thực hiện một báo cáo nghiên cứu chuyên sâu (Deep Research Report) toàn diện, có hệ thống về chủ đề: "${topic}".
${body.contextText ? `Tư liệu bổ sung: ${body.contextText}` : ""}

Yêu cầu cấu trúc báo cáo bằng định dạng Markdown:
- Tiêu đề chính (# Báo cáo Chuyên sâu: ...)
- Chia thành 5 đến 6 chương mục lớn (## 1. ..., ## 2. ..., v.v.) bao gồm:
  1. Bản chất khoa học & Góc nhìn Quân bình Âm Dương
  2. Nguyên nhân gốc rễ & Cơ chế tác động đối với cơ thể
  3. Nhóm thực phẩm chủ đạo nên ăn & Nhóm thực phẩm cần tránh
  4. Quy trình thực hành & Cách chế biến chuẩn Thực dưỡng
  5. Các trợ phương thảo dược / thực dưỡng hỗ trợ
  6. Lối sống, vận động & Chăm sóc Thân - Tâm - Trí
- Trong mỗi mục dùng các gạch đầu dòng (-) trình bày súc tích, giàu thông tin định lượng và dễ hiểu.`;

        const geminiRes = await callGeminiGenerateContent(
          savedKey,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.65 },
          },
          undefined,
          22000,
        );
        if (geminiRes.ok) {
          const gJson = await geminiRes.json();
          const textOut = gJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (textOut.trim().length > 100) {
            report = textOut.trim();
            usedGemini = true;
          }
        }
      } catch {
        /* fallback below */
      }
    }

    if (!report) {
      report = generateBuiltinDeepResearch(topic);
    }

    return Response.json({
      ok: true,
      usedGemini,
      topic,
      report,
    });
  }

  // STEP 2: Summarize the Deep Research report into structured Mindmap nodes
  if (body.action === "summarize_nodes") {
    const topic = String(body.topic ?? "").trim() || "Chuyên đề Thực Dưỡng Phúc Thọ";
    const reportText = String(body.reportText ?? "").trim();
    if (!reportText) {
      return Response.json({ error: "Chưa có nội dung báo cáo từ Bước 1 để tóm tắt ý chính." }, { status: 400 });
    }

    let structure: MindmapStructure | null = null;
    let usedGemini = false;

    if (savedKey) {
      try {
        const prompt = `Từ báo cáo chuyên sâu dưới đây, hãy tóm tắt tất cả các ý chính quan trọng nhất để vẽ Sơ đồ tư duy (Mindmap).
Chủ đề: "${topic}"
Báo cáo:
${reportText.slice(0, 12000)}

Hãy trả về JSON thuần túy (không bọc markdown) theo đúng cấu trúc:
{
  "centerTitle": "Chủ đề trung tâm ngắn gọn (dưới 55 ký tự)",
  "centerSubtitle": "Mô tả phụ 1 câu ngắn dưới chủ đề trung tâm",
  "branches": [
    {
      "title": "Tên nhánh chính (dưới 45 ký tự)",
      "icon": "1 emoji phù hợp như 🌱, 🔬, 🍚, 🥣, 🍵, 🧘",
      "items": [
        "Ý chính 1 súc tích, rõ ràng (40 - 110 ký tự)",
        "Ý chính 2 súc tích, rõ ràng",
        "Ý chính 3 súc tích, rõ ràng"
      ]
    }
  ]
}
(Tạo từ 4 đến 6 nhánh chính, mỗi nhánh từ 3 đến 4 ý chính để bao quát hết nội dung báo cáo).`;

        const geminiRes = await callGeminiGenerateContent(
          savedKey,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
          },
          undefined,
          20000,
        );
        if (geminiRes.ok) {
          const gJson = await geminiRes.json();
          const textOut = gJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const parsed = JSON.parse(textOut.replace(/^```json\s*|\s*```$/g, ""));
          if (parsed.centerTitle && Array.isArray(parsed.branches) && parsed.branches.length > 0) {
            structure = parsed;
            usedGemini = true;
          }
        }
      } catch {
        /* fallback below */
      }
    }

    if (!structure) {
      structure = parseReportIntoMindmap(topic, reportText);
    }

    return Response.json({
      ok: true,
      usedGemini,
      structure,
    });
  }

  // STEP 3 ACTION: Save generated Mindmap as a Reusable Content Block (`content_blocks`)
  if (body.action === "save_block") {
    const title = String(body.blockTitle ?? "").trim() || "🧠 Sơ đồ tư duy Mindmap Thực Dưỡng";
    const baseSlug = slugify(body.blockSlug || title) || `mindmap-${Date.now().toString(36)}`;
    const positions = String(body.blockPositions ?? "manual").trim() || "manual";
    const contentHtml = String(body.blockContentHtml ?? "").trim();

    if (!contentHtml) {
      return Response.json({ error: "Chưa có nội dung sơ đồ tư duy để lưu thành Block." }, { status: 400 });
    }

    let finalSlug = baseSlug;
    const existing = await one<{ id: number }>("SELECT id FROM content_blocks WHERE slug = ?", finalSlug);
    if (existing) {
      finalSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    const r = await run(
      `INSERT INTO content_blocks (slug, title, style_variant, positions, target_post_ids, target_product_ids, content_html, active, sort)
       VALUES (?, ?, 'raw', ?, '', '', ?, 1, 1)`,
      finalSlug,
      title,
      positions,
      contentHtml,
    );

    const blocks = await all<{
      id: number;
      slug: string;
      title: string;
      style_variant: string;
      positions: string;
      content_html: string;
    }>(
      "SELECT id, slug, title, style_variant, positions, content_html FROM content_blocks WHERE active = 1 ORDER BY sort ASC, id ASC",
    );

    return Response.json({
      ok: true,
      blockId: Number(r.lastInsertRowid),
      slug: finalSlug,
      title,
      shortcode: `[[block:${finalSlug}]]`,
      blocks,
    });
  }

  return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
}
