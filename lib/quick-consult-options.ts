export type ConsultMotifOption = {
  id: string;
  name: string;
  badge: string;
  description: string;
  systemTone: string;
};

export type AudienceGroupOption = {
  id: "tre_em" | "truong_thanh" | "benh_ly" | "cao_tuoi";
  label: string;
  icon: string;
  hint: string;
};

export type ExpertDoctorProfile = {
  id: string;
  name: string;
  title: string;
  specialty: string;
  experience: string;
  badge: string;
  bio: string;
};

export type ConsultPackageOption = {
  id: "advanced_free" | "single_1v1" | "monthly_companion" | "vip_3months";
  tierCode: "advanced_free" | "advanced_paid";
  name: string;
  priceLabel: string;
  badge: string;
  features: string[];
};

export const CONSULT_AUDIENCES: AudienceGroupOption[] = [
  {
    id: "tre_em",
    label: "Trẻ em & Tuổi dậy thì",
    icon: "👶",
    hint: "Biếng ăn, chậm tăng cân, ăn dặm, thừa cân, hay ốm vặt (đối chiếu chuẩn WHO).",
  },
  {
    id: "truong_thanh",
    label: "Người trưởng thành",
    icon: "🧑",
    hint: "Cân bằng tiêu hoá, giảm stress, ngủ ngon, giữ dáng & ăn thực dưỡng.",
  },
  {
    id: "benh_ly",
    label: "Bệnh lý mạn tính",
    icon: "🩺",
    hint: "Tiểu đường, mỡ máu, gan nhiễm mỡ, huyết áp, gout, trào ngược dạ dày.",
  },
  {
    id: "cao_tuoi",
    label: "Người cao tuổi",
    icon: "👴",
    hint: "Xương khớp, kém hấp thu, mất ngủ, phục hồi thể trạng nhẹ nhàng.",
  },
];

export const EXPERT_TEAM: ExpertDoctorProfile[] = [
  {
    id: "exp-y-khoa-thuc-duong",
    name: "BS. CKI Dinh dưỡng & Thực dưỡng",
    title: "Cố vấn Y khoa Hiện đại & Thực dưỡng Quân bình",
    specialty: "Bệnh lý chuyển hoá (Tiểu đường, Mỡ máu, Gan) & Dinh dưỡng Nhi khoa",
    experience: "12+ năm lâm sàng",
    badge: "Y học Chứng cứ + Ohsawa",
    bio: "Kết hợp chỉ số xét nghiệm cận lâm sàng, nhân trắc học WHO/BMI với chế độ ăn ngũ cốc nguyên cám tự nhiên.",
  },
  {
    id: "exp-dong-tay-y",
    name: "Lương y – Chuyên gia Đông Tây y Kết hợp",
    title: "Chuyên gia Thể trạng Âm Dương, Dược thảo & Trợ phương",
    specialty: "Tiêu hoá mãn tính, Cơ địa Hàn/Nhiệt, Phục hồi tỳ vị & Miễn dịch",
    experience: "15+ năm thực hành",
    badge: "Đông Tây y + Dược thảo",
    bio: "Biện chứng thể trạng Hàn – Nhiệt – Hư – Thực theo Đông y, phối hợp trợ phương thực dưỡng và thảo mộc an toàn.",
  },
  {
    id: "exp-nhi-gia-dinh",
    name: "Chuyên gia Dinh dưỡng Gia đình & Trẻ em",
    title: "Tư vấn Khẩu phần 24h & Thực đơn Cá thể hoá",
    specialty: "Trẻ biếng ăn, chậm lớn, dị ứng đạm sữa, thực đơn gia đình bận rộn",
    experience: "10+ năm đồng hành",
    badge: "Khẩu phần 24h + Thực đơn",
    bio: "Phân tích chi tiết bữa ăn thực tế Sáng – Trưa – Tối và thiết kế lộ trình chuyển đổi món ăn nhẹ nhàng, dễ làm.",
  },
];

export const CONSULT_PACKAGES: ConsultPackageOption[] = [
  {
    id: "advanced_free",
    tierCode: "advanced_free",
    name: "Gói Tư vấn Nâng cao Miễn phí",
    priceLabel: "Miễn phí",
    badge: "Phản hồi trong 24h",
    features: [
      "Giải đáp câu hỏi chuyên đề qua Zalo / Email",
      "Nhận tài liệu hướng dẫn thực dưỡng phù hợp",
      "Gợi ý bộ sản phẩm hỗ trợ cơ bản",
    ],
  },
  {
    id: "single_1v1",
    tierCode: "advanced_paid",
    name: "Gói Khám & Tư vấn 1 Buổi (1:1)",
    priceLabel: "350.000đ / buổi",
    badge: "Phổ biến nhất",
    features: [
      "45 phút tư vấn 1:1 Online Video Call hoặc Trực tiếp",
      "Phân tích chi tiết khẩu phần ăn 24h & chỉ số xét nghiệm",
      "Xuất Hồ sơ PDF & Thực đơn 7 ngày cá nhân hoá",
    ],
  },
  {
    id: "monthly_companion",
    tierCode: "advanced_paid",
    name: "Gói Đồng hành Chuyên sâu 1 Tháng",
    priceLabel: "1.200.000đ / tháng",
    badge: "Theo dõi sát 30 ngày",
    features: [
      "2 buổi khám 1:1 cùng chuyên gia + tái đánh giá chỉ số",
      "Điều chỉnh thực đơn & dược thảo theo tuần qua Zalo",
      "Đọc kết quả xét nghiệm trước & sau liệu trình",
    ],
  },
  {
    id: "vip_3months",
    tierCode: "advanced_paid",
    name: "Gói Liệu trình Phục hồi 3 Tháng (VIP)",
    priceLabel: "3.200.000đ / 3 tháng",
    badge: "Toàn diện Đông Tây y",
    features: [
      "Hội chẩn Y khoa Hiện đại + Đông y Thực dưỡng định kỳ",
      "Theo dõi biểu đồ cân nặng, BMI, đường huyết/mỡ máu",
      "Ưu tiên hỗ trợ Hotline riêng & quà tặng trợ phương",
    ],
  },
];

export const CONSULT_PROCESS_STEPS = [
  {
    step: "01",
    title: "Khai thác Khẩu phần 24h & Triệu chứng",
    desc: "Ghi nhận bữa ăn thực tế Sáng–Trưa–Tối, nhu cầu và biểu hiện cơ thể.",
  },
  {
    step: "02",
    title: "Đo lường Chỉ số & Nhóm Đối tượng",
    desc: "Tính BMI, đối chiếu theo nhóm Trẻ em (WHO), Người lớn hoặc Bệnh lý nền.",
  },
  {
    step: "03",
    title: "Phân tích AI 3 Trụ cột (Y khoa – Thực dưỡng – Đông Tây y)",
    desc: "AI Gemini chuyên gia tổng hợp đa góc nhìn khoa học và biện chứng Âm–Dương.",
  },
  {
    step: "04",
    title: "Thực đơn & Bộ Sản phẩm Cá thể hoá",
    desc: "Gợi ý đổi món hằng ngày cùng Thức ăn – Trợ phương – Dược thảo phù hợp.",
  },
  {
    step: "05",
    title: "Đồng hành 1:1 & Theo dõi Tái khám",
    desc: "Kết nối Hotline, đặt lịch chuyên gia và xuất Hồ sơ PDF theo dõi tiến triển.",
  },
] as const;

export const CONSULT_FAQS = [
  {
    q: "Tôi có thể kết hợp thuốc Tây bác sĩ kê với chế độ Thực dưỡng Đông Tây y không?",
    a: "Có. Nguyên tắc của chúng tôi là không tự ý bỏ thuốc điều trị của bác sĩ. Thực dưỡng, trợ phương và dược thảo đóng vai trò nâng đỡ chuyển hoá, giảm gánh nặng tiêu hoá và hỗ trợ phục hồi bền vững song song với phác đồ y khoa.",
  },
  {
    q: "Trẻ em biếng ăn hoặc thừa cân có dùng được phân hệ Tư vấn nhanh này không?",
    a: "Hoàn toàn được. Bạn chỉ cần chọn nhóm 'Trẻ em & Tuổi dậy thì' và nhập chiều cao, cân nặng, khẩu phần 24h của bé. AI sẽ phân tích theo nhu cầu phát triển nhi khoa và gợi ý cách điều chỉnh bữa ăn dễ áp dụng.",
  },
  {
    q: "Sau khi tư vấn nhanh, tôi có thể lưu hồ sơ để theo dõi các lần sau không?",
    a: "Có. Mỗi lần tư vấn đều được cấp mã hồ sơ & link xem/tải PDF riêng. Khi bạn nhập lại đúng Số điện thoại ở lần tái khám sau, hệ thống sẽ hiển thị lịch sử cân nặng & BMI để bạn theo dõi tiến triển.",
  },
] as const;

export const CONSULT_GOALS = [
  "Cân bằng tiêu hoá, dạ dày, đại tràng",
  "Hỗ trợ ổn định đường huyết, tiểu đường",
  "Thanh lọc cơ thể, giải độc gan, hạ mỡ máu",
  "Tăng cường đề kháng, phục hồi thể trạng, ngủ ngon",
  "Giảm cân lành mạnh & ăn thực dưỡng quân bình",
  "Bồi bổ trẻ em biếng ăn / người cao tuổi / hậu phẫu",
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
    id: "y-khoa-thuc-duong-dong-tay-y",
    name: "Hội đồng AI Y khoa · Thực dưỡng · Đông Tây y Kết hợp",
    badge: "Khuyên dùng · 3 Trụ cột",
    description:
      "Kết hợp Y học Chứng cứ hiện đại, Thực dưỡng Quân bình Âm Dương (Ohsawa) và Biện chứng Đông y (Hàn/Nhiệt/Tỳ Vị) để phân tích toàn diện nhất.",
    systemTone:
      "Đóng vai Hội đồng Chuyên gia gồm Bác sĩ Y khoa Hiện đại, Chuyên gia Thực dưỡng Ohsawa và Lương y Đông Tây y kết hợp. Phân tích đa chiều nhưng trình bày mạch lạc, khoa học, dễ hiểu.",
  },
  {
    id: "chuyen-gia-thuc-duong-quan-binh",
    name: "Chuyên gia Thực dưỡng Quân bình Âm – Dương",
    badge: "Mô hình Chuyên gia Ohsawa",
    description:
      "Phân tích thể trạng theo nguyên lý Quân bình Âm – Dương, lên thực đơn từ gạo lứt, ngũ cốc và trợ phương cổ truyền.",
    systemTone:
      "Đóng vai Chuyên gia Thực dưỡng Thực hành theo triết lý Ohsawa kết hợp Dinh dưỡng lâm sàng hiện đại. Phân tích rõ tính Âm/Dương của tình trạng sức khoẻ hiện tại và cách quân bình bằng ăn uống.",
  },
  {
    id: "thuc-duong-ket-hop-duoc-thao",
    name: "Chuyên gia Thực dưỡng & Dược thảo Phục hồi",
    badge: "Thức ăn – Trợ phương – Dược thảo",
    description:
      "Tập trung phối hợp bộ ba Thức ăn thực dưỡng, Trợ phương hỗ trợ và Dược thảo tự nhiên để nâng cao chức năng gan, thận, tiêu hoá và miễn dịch.",
    systemTone:
      "Đóng vai Chuyên gia Thực dưỡng & Thảo dược học. Giải thích rành mạch vai trò phối hợp giữa Thức ăn nền tảng, Trợ phương chuyên biệt và Dược thảo hỗ trợ phục hồi.",
  },
];
