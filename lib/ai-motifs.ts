import "server-only";
import { one, run } from "./db";

export type AiMotifPreset = {
  id: string;
  name: string;
  badge: string;
  introPrefix: string;
  perspectiveTitle: string;
  perspectiveBody: string;
  conclusionTitle: string;
  promptInstruction: string;
  defaultMindmap: boolean;
  defaultCover: boolean;
  defaultProducts: boolean;
  defaultRefs: boolean;
  isBuiltin?: boolean;
};

export const DEFAULT_AI_MOTIFS: AiMotifPreset[] = [
  {
    id: "duyvo",
    name: "🌿 Chuyên gia Thực Dưỡng Hiện Đại (Phong cách Kênh Duy Vo)",
    badge: "Thực Dưỡng Hiện Đại",
    introPrefix: "Góc nhìn Thực Dưỡng Hiện Đại & Chữa Lành Tự Nhiên",
    perspectiveTitle: "Góc nhìn Thực Dưỡng Hiện Đại: Lắng nghe và trao đúng nguyên liệu cho cơ thể",
    perspectiveBody:
      "Theo nguyên lý Thực Dưỡng Hiện Đại được chia sẻ xuyên suốt trên kênh Duy Vo (@quocduy2401), cơ thể con người vốn sở hữu khả năng tự chữa lành kỳ diệu. Khi chúng ta giảm bớt độc tố đầu vào, ưu tiên thực phẩm toàn phần từ thực vật (gạo lứt, đậu hạt, rau củ hữu cơ) và giữ tinh thần bình an, từng tế bào sẽ tự động phục hồi từ gốc.",
    conclusionTitle: "Lời nhắn nhủ trên hành trình Sống Khỏe Tự Thân",
    promptInstruction:
      "Viết theo văn phong chuyên gia Thực Dưỡng Hiện Đại (như kênh YouTube Duy Vo): gần gũi, thấu cảm, khoa học, giải thích rõ nguyên nhân gốc rễ của vấn đề sức khỏe và hướng dẫn cách ăn uống quân bình Âm Dương kết hợp lối sống tự nhiên.",
    defaultMindmap: true,
    defaultCover: true,
    defaultProducts: true,
    defaultRefs: true,
    isBuiltin: true,
  },
  {
    id: "deep_research",
    name: "🔬 Tổng hợp Báo cáo Chuyên sâu (Gemini Deep Research & Y học Thực chứng)",
    badge: "Deep Research",
    introPrefix: "Báo cáo Phân tích Chuyên sâu & Dẫn chứng Khoa học",
    perspectiveTitle: "Tổng hợp Cơ chế Sinh học, Nghiên cứu Lâm sàng & Ứng dụng Thực dưỡng",
    perspectiveBody:
      "Báo cáo chuyên sâu kết hợp giữa các công trình nghiên cứu y sinh học hiện đại (cơ chế tự thực tế bào Autophagy, hệ vi sinh đường ruột Microbiome, cân bằng nội môi kiềm-toan) với nghệ thuật ăn uống Thực Dưỡng cổ truyền giúp người đọc nắm bắt toàn diện cả lý thuyết lẫn phác đồ thực hành.",
    conclusionTitle: "Kết luận Tổng hợp từ Báo cáo Chuyên sâu",
    promptInstruction:
      "Phân tích kỹ báo cáo Deep Research: giữ lại các số liệu, cơ chế khoa học, luận điểm quan trọng; sắp xếp lại thành các mục H2/H3 mạch lạc, có hộp tóm tắt luận điểm cốt lõi (Key Takeaways), bảng so sánh hoặc quy trình ứng dụng thực tế vào đời sống thực dưỡng.",
    defaultMindmap: true,
    defaultCover: true,
    defaultProducts: true,
    defaultRefs: true,
    isBuiltin: true,
  },
  {
    id: "youtube_lecture",
    name: "🎬 Chuyển thể Bài giảng Video YouTube thành Bài viết Chuyên đề",
    badge: "Video YouTube",
    introPrefix: "Tóm tắt & Phân tích Chuyên đề từ Bài giảng Video",
    perspectiveTitle: "Những đúc kết cốt lõi từ bài chia sẻ thực tế",
    perspectiveBody:
      "Bài viết được biên tập và hệ thống hóa chi tiết từ nội dung video bài giảng trên kênh YouTube Duy Vo, giúp quý khán giả dễ dàng tra cứu lại các nguyên tắc quan trọng, công thức chế biến và lưu ý thực hành bất cứ lúc nào.",
    conclusionTitle: "Tổng kết Bài giảng & Hướng dẫn Thực hành",
    promptInstruction:
      "Chuyển thể nội dung nói/mô tả từ video YouTube thành văn phong bài viết chuyên nghiệp: lọc bỏ từ ngữ khẩu ngữ thừa, chia thành các phần rõ ràng theo mạch bài giảng, nhấn mạnh các lời khuyên thực tế và câu hỏi thường gặp của người xem.",
    defaultMindmap: true,
    defaultCover: true,
    defaultProducts: true,
    defaultRefs: true,
    isBuiltin: true,
  },
  {
    id: "gdocs_handbook",
    name: "📄 Biên tập Tài liệu Google Docs / Cẩm nang Phác đồ Thực hành",
    badge: "Google Docs",
    introPrefix: "Tài liệu Hướng dẫn & Phác đồ Chăm sóc Sức khỏe",
    perspectiveTitle: "Hướng dẫn áp dụng phác đồ thực dưỡng an toàn, hiệu quả",
    perspectiveBody:
      "Tài liệu được chuẩn hóa từ kho lưu trữ Google Drive của Thực Dưỡng Phúc Thọ, trình bày tuần tự từ cách chọn nguyên liệu, định lượng bữa ăn đến lịch sinh hoạt trong ngày để bất kỳ ai cũng có thể áp dụng thuận lợi tại gia đình.",
    conclusionTitle: "Lưu ý Quan trọng Khi Áp dụng Tài liệu",
    promptInstruction:
      "Biên tập nội dung từ tài liệu Google Docs thành bài cẩm nang chuẩn SEO trên website: giữ nguyên cấu trúc phác đồ/danh mục quan trọng, trình bày rõ các bước thực hiện, liều lượng và lưu ý chống chỉ định nếu có.",
    defaultMindmap: true,
    defaultCover: true,
    defaultProducts: true,
    defaultRefs: true,
    isBuiltin: true,
  },
  {
    id: "step_by_step",
    name: "📖 Cẩm nang Hướng dẫn Thực hành Từng bước (Actionable Guide)",
    badge: "Actionable",
    introPrefix: "Cẩm nang Hướng dẫn Thực hành Chi tiết",
    perspectiveTitle: "Quy trình 4 bước áp dụng thực tế ngay tại nhà",
    perspectiveBody:
      "Để đạt hiệu quả bền vững mà không bị bỡ ngỡ trong những ngày đầu, bạn hãy áp dụng tuần tự từ bước chuẩn bị nguyên liệu sạch hữu cơ, chế biến đúng kỹ thuật Dương hóa, nhai kỹ từ 50–100 lần và theo dõi phản ứng tích cực của cơ thể mỗi ngày.",
    conclusionTitle: "Tổng kết & Lịch trình thực hành gợi ý",
    promptInstruction:
      "Viết theo mô-típ Cẩm nang hướng dẫn thực hành từng bước (Step-by-step): rõ ràng, súc tích, chia thành các bước cụ thể, có danh sách kiểm tra (checklist) và lưu ý thực tế dễ làm theo tại nhà.",
    defaultMindmap: true,
    defaultCover: true,
    defaultProducts: true,
    defaultRefs: true,
    isBuiltin: true,
  },
  {
    id: "medical_wfpb",
    name: "🧬 Phân tích Khoa học Dinh dưỡng & Đông Tây Y Kết hợp (WFPB)",
    badge: "Đông Tây Y",
    introPrefix: "Phân tích Chuyên sâu Đông Tây Y & Dinh dưỡng Toàn phần",
    perspectiveTitle: "Cơ sở khoa học giữa Thực phẩm Toàn phần (WFPB) và Quân bình Âm Dương",
    perspectiveBody:
      "Các nghiên cứu y học hiện đại về hệ vi sinh đường ruột, cơ chế tự thực tế bào (Autophagy - Giải Nobel Sinh học 2016) và thuyết Nhân tố Enzyme của GS.BS Hiromi Shinya đều chứng minh chế độ ăn giàu chất xơ tự nhiên, ngũ cốc nguyên cám và thực vật toàn phần là nền tảng vững chắc nhất để phòng ngừa bệnh mãn tính.",
    conclusionTitle: "Kết luận Khoa học & Khuyến nghị Dinh dưỡng",
    promptInstruction:
      "Viết theo văn phong phân tích khoa học dinh dưỡng kết hợp Đông Tây Y và chế độ ăn thực vật toàn phần (WFPB): dẫn chứng logic, khách quan, phân tích cơ chế sinh học và giá trị dinh dưỡng.",
    defaultMindmap: true,
    defaultCover: true,
    defaultProducts: true,
    defaultRefs: true,
    isBuiltin: true,
  },
  {
    id: "storytelling",
    name: "🧘 Truyền cảm hứng Chuyển hóa Lối sống & Tâm An",
    badge: "Chữa lành",
    introPrefix: "Hành trình Chữa lành Thân - Tâm - Trí",
    perspectiveTitle: "Khi Thân khỏe bắt nguồn từ Tâm an và Bữa ăn tỉnh thức",
    perspectiveBody:
      "Mỗi bữa ăn không chỉ là việc nạp năng lượng vật chất, mà còn là giây phút quay về chăm sóc chính mình. Khi buông bỏ căng thẳng, hít thở sâu và thưởng thức vị ngọt thanh tự nhiên của hạt gạo lứt, tâm trí bạn sẽ tìm lại sự tĩnh lặng và bình an đích thực.",
    conclusionTitle: "Khởi đầu ngày mới với Năng lượng An lành",
    promptInstruction:
      "Viết theo văn phong truyền cảm hứng, nhẹ nhàng, sâu sắc, kết nối giữa dinh dưỡng thực dưỡng và sức khỏe tinh thần (Thân - Tâm - Trí).",
    defaultMindmap: true,
    defaultCover: true,
    defaultProducts: false,
    defaultRefs: true,
    isBuiltin: true,
  },
  {
    id: "seo_conversion",
    name: "🎯 Bài viết Chuẩn SEO Chuyển đổi cao & Giải pháp Trợ phương",
    badge: "SEO Conversion",
    introPrefix: "Giải pháp Chăm sóc Sức khỏe Chủ động & Toàn diện",
    perspectiveTitle: "Giải pháp kết hợp Trợ phương Thực dưỡng chuẩn chất lượng",
    perspectiveBody:
      "Bên cạnh chế độ ăn uống và sinh hoạt điều độ, việc lựa chọn đúng các sản phẩm trợ phương thực dưỡng sạch hữu cơ, rõ nguồn gốc tại Thực Dưỡng Phúc Thọ sẽ giúp rút ngắn thời gian thích nghi và hỗ trợ cơ thể phục hồi nhanh chóng, an toàn.",
    conclusionTitle: "Tổng kết & Gợi ý Sản phẩm Thực dưỡng Đồng hành",
    promptInstruction:
      "Viết bài chuẩn SEO chuyên nghiệp, tối ưu từ khóa tự nhiên, cấu trúc H2/H3 rõ ràng, giải quyết đúng nỗi đau của người đọc và lồng ghép giải pháp thực dưỡng thuyết phục.",
    defaultMindmap: true,
    defaultCover: true,
    defaultProducts: true,
    defaultRefs: true,
    isBuiltin: true,
  },
];

export async function loadAiMotifs(): Promise<AiMotifPreset[]> {
  const row = await one<{ value: string }>("SELECT value FROM settings WHERE key = 'ai_motifs_json'");
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeWithDefaults(parsed);
      }
    } catch {
      /* ignore */
    }
  }
  await saveAiMotifsToDisk(DEFAULT_AI_MOTIFS);
  return DEFAULT_AI_MOTIFS;
}

function mergeWithDefaults(customList: Partial<AiMotifPreset>[]): AiMotifPreset[] {
  const byId = new Map<string, AiMotifPreset>();
  for (const d of DEFAULT_AI_MOTIFS) {
    byId.set(d.id, { ...d });
  }
  for (const item of customList) {
    if (!item || typeof item.id !== "string" || !item.id.trim() || !item.name) continue;
    const id = item.id.trim();
    const existing = byId.get(id);
    byId.set(id, {
      id,
      name: String(item.name).trim(),
      badge: String(item.badge || existing?.badge || "Tuỳ chỉnh").trim(),
      introPrefix: String(
        item.introPrefix || existing?.introPrefix || "Góc nhìn Thực Dưỡng & Sức Khỏe Tự Nhiên",
      ).trim(),
      perspectiveTitle: String(
        item.perspectiveTitle || existing?.perspectiveTitle || "Đúc kết & Hướng dẫn Ứng dụng Thực tế",
      ).trim(),
      perspectiveBody: String(
        item.perspectiveBody ||
          existing?.perspectiveBody ||
          "Áp dụng chế độ ăn thực dưỡng quân bình Âm Dương kết hợp lối sống lành mạnh giúp cơ thể tự phục hồi bền vững.",
      ).trim(),
      conclusionTitle: String(
        item.conclusionTitle || existing?.conclusionTitle || "Tổng kết & Khuyến nghị Thực hành",
      ).trim(),
      promptInstruction: String(
        item.promptInstruction || existing?.promptInstruction || "Viết bài chuẩn SEO, mạch lạc, giàu giá trị thực tế.",
      ).trim(),
      defaultMindmap: item.defaultMindmap ?? existing?.defaultMindmap ?? true,
      defaultCover: item.defaultCover ?? existing?.defaultCover ?? true,
      defaultProducts: item.defaultProducts ?? existing?.defaultProducts ?? true,
      defaultRefs: item.defaultRefs ?? existing?.defaultRefs ?? true,
      isBuiltin: existing?.isBuiltin ?? false,
    });
  }
  return Array.from(byId.values());
}

async function saveAiMotifsToDisk(list: AiMotifPreset[]) {
  try {
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_motifs_json', ?)", JSON.stringify(list));
  } catch {
    /* ignore db errors */
  }
}

export async function upsertAiMotif(preset: Partial<AiMotifPreset>): Promise<AiMotifPreset[]> {
  const current = await loadAiMotifs();
  const rawId = (preset.id || preset.name || "custom_motif")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const id = rawId || `motif_${Date.now().toString(36)}`;

  const nextItem: AiMotifPreset = {
    id,
    name: String(preset.name || "Mô-típ Thực Dưỡng Mới").trim(),
    badge: String(preset.badge || "Tuỳ chỉnh").trim(),
    introPrefix: String(preset.introPrefix || "Phân tích Chuyên sâu & Giải pháp Thực Dưỡng").trim(),
    perspectiveTitle: String(preset.perspectiveTitle || "Góc nhìn Chuyên gia & Ứng dụng Thực tế").trim(),
    perspectiveBody: String(
      preset.perspectiveBody ||
        "Lựa chọn thực phẩm toàn phần, ăn uống đúng giờ và giữ tinh thần an lạc là chìa khóa vàng cho sức khỏe.",
    ).trim(),
    conclusionTitle: String(preset.conclusionTitle || "Tổng kết & Lời khuyên Thực hành").trim(),
    promptInstruction: String(
      preset.promptInstruction || "Viết bài chuẩn SEO, chia mục H2/H3 rõ ràng, văn phong sâu sắc và dễ áp dụng.",
    ).trim(),
    defaultMindmap: preset.defaultMindmap ?? true,
    defaultCover: preset.defaultCover ?? true,
    defaultProducts: preset.defaultProducts ?? true,
    defaultRefs: preset.defaultRefs ?? true,
    isBuiltin: DEFAULT_AI_MOTIFS.some((d) => d.id === id),
  };

  const idx = current.findIndex((x) => x.id === id);
  if (idx >= 0) {
    current[idx] = nextItem;
  } else {
    current.push(nextItem);
  }
  await saveAiMotifsToDisk(current);
  return current;
}

export async function importAiMotifs(presets: Partial<AiMotifPreset>[]): Promise<AiMotifPreset[]> {
  const current = await loadAiMotifs();
  const merged = mergeWithDefaults([...current, ...presets]);
  await saveAiMotifsToDisk(merged);
  return merged;
}

export async function deleteAiMotif(id: string): Promise<AiMotifPreset[]> {
  const current = await loadAiMotifs();
  const filtered = current.filter((x) => x.id !== id || x.isBuiltin);
  await saveAiMotifsToDisk(filtered);
  return filtered;
}
