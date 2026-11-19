export type DisclaimerStyleId = "gemini_standard" | "warm_senior" | "legal_strict";
export type DisclaimerPosition = "bottom" | "top" | "both";

export type MedicalDisclaimerConfig = {
  disclaimerStyle?: DisclaimerStyleId;
  disclaimerPosition?: DisclaimerPosition;
  disclaimerCustomText?: string;
};

export type DisclaimerPreset = {
  id: DisclaimerStyleId;
  label: string;
  badge: string;
  title: string;
  body: string;
};

export const MEDICAL_DISCLAIMER_PRESETS: Record<DisclaimerStyleId, DisclaimerPreset> = {
  gemini_standard: {
    id: "gemini_standard",
    label: "Tùy chọn A — Chuẩn Mực & Khoa Học (Phong cách Gemini Medical)",
    badge: "Chuẩn Gemini · Khuyên dùng",
    title: "Lưu ý & Miễn trừ trách nhiệm Y khoa",
    body: "Nội dung phân tích và gợi ý thực dưỡng trên đây được tổng hợp nhằm mục đích cung cấp thông tin tham khảo về dinh dưỡng và lối sống, không cấu thành lời khuyên y tế chuyên môn, chẩn đoán bệnh hay thay thế phác đồ điều trị của bác sĩ. Mỗi thể trạng có cơ địa và bệnh sử khác nhau; Quý khách vui lòng tham vấn bác sĩ hoặc chuyên gia y tế trước khi thay đổi chế độ ăn uống, thực phẩm bổ sung hoặc thuốc đang sử dụng. Tuyệt đối không tự ý ngưng thuốc điều trị theo đơn. Nếu xuất hiện triệu chứng cấp tính hoặc diễn tiến bất thường, hãy đến ngay cơ sở y tế gần nhất.",
  },
  warm_senior: {
    id: "warm_senior",
    label: "Tùy chọn B — Ân Cần, Gần Gũi (Phù hợp người lớn tuổi & gia đình)",
    badge: "Thân thiện · Dễ hiểu",
    title: "Lời nhắn an tâm từ Chuyên gia Thực dưỡng",
    body: "Thực dưỡng là nghệ thuật ăn uống quân bình giúp nâng đỡ thể trạng tự nhiên, không phải thuốc chữa bệnh và không thay thế việc thăm khám bác sĩ. Để an toàn và đạt hiệu quả tốt nhất cho sức khỏe của cô/chú/anh/chị, vui lòng giữ đúng đơn thuốc hiện tại (nếu có) và trao đổi thêm với bác sĩ đang theo dõi trước khi áp dụng chế độ ăn mới. Khi cơ thể có dấu hiệu mệt nhiều, đau tăng hoặc bất thường, hãy đi kiểm tra y tế kịp thời.",
  },
  legal_strict: {
    id: "legal_strict",
    label: "Tùy chọn C — Chặt Chẽ Pháp Lý & YMYL (Luật Khám chữa bệnh & NĐ 15/2018 VN)",
    badge: "Chuẩn Pháp lý VN",
    title: "Tuyên bố Miễn trừ Trách nhiệm Pháp lý & Y tế",
    body: "Báo cáo này là tài liệu tham khảo về dinh dưỡng thực dưỡng được hỗ trợ bởi AI, không phải kết luận y khoa, không có giá trị chẩn đoán, kê đơn hay thay thế các dịch vụ khám chữa bệnh hợp pháp. Các sản phẩm được gợi ý là thực phẩm/thảo mộc hỗ trợ dinh dưỡng (không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh), hiệu quả phụ thuộc vào cơ địa từng người. Hệ thống và đơn vị vận hành không chịu trách nhiệm đối với các trường hợp tự ý áp dụng mà không tham khảo ý kiến bác sĩ chuyên khoa.",
  },
};

export function resolveDisclaimerContent(cfg?: MedicalDisclaimerConfig | null): {
  styleId: DisclaimerStyleId;
  position: DisclaimerPosition;
  title: string;
  body: string;
  badge: string;
} {
  const styleId: DisclaimerStyleId =
    cfg?.disclaimerStyle && cfg.disclaimerStyle in MEDICAL_DISCLAIMER_PRESETS
      ? cfg.disclaimerStyle
      : "gemini_standard";
  const position: DisclaimerPosition =
    cfg?.disclaimerPosition === "top" || cfg?.disclaimerPosition === "both"
      ? cfg.disclaimerPosition
      : "bottom";
  const preset = MEDICAL_DISCLAIMER_PRESETS[styleId];
  const custom = (cfg?.disclaimerCustomText || "").trim();
  return {
    styleId,
    position,
    title: preset.title,
    body: custom || preset.body,
    badge: custom ? "Tuỳ chỉnh" : preset.badge,
  };
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderDisclaimerEmailHtml(cfg?: MedicalDisclaimerConfig | null): string {
  const d = resolveDisclaimerContent(cfg);
  return `
    <div style="margin:18px 0;padding:14px 16px;border-radius:10px;border:1px solid #fcd34d;background:#fffbeb;color:#78350f;font-size:12.5px;line-height:1.6;">
      <div style="font-weight:bold;margin-bottom:4px;color:#92400e;">⚕️ ${escHtml(d.title)}</div>
      <div>${escHtml(d.body)}</div>
    </div>
  `;
}
