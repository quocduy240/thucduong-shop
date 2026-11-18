export type ConsultMotifOption = {
  id: string;
  name: string;
  badge: string;
  description: string;
  systemTone: string;
};

export const CONSULT_GOALS = [
  "Cân bằng tiêu hoá, dạ dày, đại tràng",
  "Hỗ trợ ổn định đường huyết, tiểu đường",
  "Thanh lọc cơ thể, giải độc gan, hạ mỡ máu",
  "Tăng cường đề kháng, phục hồi thể trạng, ngủ ngon",
  "Giảm cân lành mạnh & ăn thực dưỡng quân bình",
  "Bồi bổ người cao tuổi / hậu phẫu / suy nhược",
] as const;

export const CONSULT_CONDITIONS = [
  "Hay đầy bụng, trào ngược, rối loạn tiêu hoá",
  "Mệt mỏi, mất ngủ, căng thẳng kéo dài",
  "Đường huyết / HbA1c hoặc mỡ máu cao",
  "Huyết áp cao / tim mạch",
  "Đau nhức xương khớp, gout, axit uric cao",
  "Cơ địa hàn (lạnh tay chân, sợ gió)",
  "Cơ địa nhiệt (nóng trong, táo bón, nhiệt miệng)",
] as const;

export const CONSULT_HABITS = [
  "Hay ăn đồ ngọt, tinh bột trắng hoặc đồ chế biến sẵn",
  "Ít ăn rau xanh, uống ít nước, ít vận động",
  "Mới tìm hiểu Thực dưỡng Ohsawa — cần lộ trình dễ áp dụng",
  "Đã ăn gạo lứt thực dưỡng — muốn tối ưu thực đơn chuyên sâu",
  "Muốn kết hợp thức ăn + trợ phương + dược thảo tự nhiên",
] as const;

export const CONSULT_MOTIFS: ConsultMotifOption[] = [
  {
    id: "chuyen-gia-thuc-duong-quan-binh",
    name: "Chuyên gia Thực dưỡng Quân bình Âm – Dương",
    badge: "Mô hình Chuyên gia Ohsawa",
    description:
      "Phân tích thể trạng theo nguyên lý Quân bình Âm – Dương kết hợp Dinh dưỡng hiện đại, lên thực đơn từ gạo lứt, ngũ cốc và trợ phương cổ truyền.",
    systemTone:
      "Đóng vai Chuyên gia Thực dưỡng Thực hành theo triết lý Ohsawa kết hợp Dinh dưỡng lâm sàng hiện đại. Phân tích rõ tính Âm/Dương của tình trạng sức khoẻ hiện tại và cách quân bình bằng ăn uống.",
  },
  {
    id: "thuc-duong-ket-hop-duoc-thao",
    name: "Chuyên gia Thực dưỡng & Dược thảo Phục hồi",
    badge: "Kết hợp Thức ăn – Trợ phương – Dược thảo",
    description:
      "Tập trung phối hợp bộ ba Thức ăn thực dưỡng, Trợ phương hỗ trợ và Dược thảo tự nhiên để nâng cao chức năng gan, thận, tiêu hoá và miễn dịch.",
    systemTone:
      "Đóng vai Chuyên gia Thực dưỡng & Thảo dược học. Giải thích rành mạch vai trò phối hợp giữa Thức ăn nền tảng, Trợ phương chuyên biệt và Dược thảo hỗ trợ phục hồi.",
  },
  {
    id: "thuc-duong-hien-dai-de-ap-dung",
    name: "Chuyên gia Dinh dưỡng Thực dưỡng Hiện đại",
    badge: "Khoa học & Dễ thực hành",
    description:
      "Văn phong khoa học, súc tích, hướng dẫn từng bước chuyển đổi bữa ăn nhẹ nhàng cho người bận rộn hoặc người mới bắt đầu.",
    systemTone:
      "Đóng vai Chuyên gia Dinh dưỡng Thực dưỡng Hiện đại. Viết súc tích, thực tế, dễ áp dụng ngay trong 7 ngày đầu tiên cho người bận rộn.",
  },
];
