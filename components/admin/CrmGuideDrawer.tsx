"use client";

import { useState } from "react";

type GuideTopic = {
  id: string;
  title: string;
  badge?: string;
  items: { heading: string; body: string }[];
};

const TOPICS: GuideTopic[] = [
  {
    id: "overview",
    title: "1. Tổng quan CRM 360° & Quy trình 3 bước mỗi ngày",
    badge: "Bắt đầu",
    items: [
      {
        heading: "Mục tiêu của CRM",
        body: "Gom toàn bộ dữ liệu khách hàng (kể cả khách vãng lai chưa đăng ký tài khoản) từ Đơn hàng, Hồ sơ thành viên & Điểm thưởng vào một màn hình duy nhất để nhân viên bán hàng chăm sóc đúng người, đúng thời điểm.",
      },
      {
        heading: "3 bước mỗi sáng cho tư vấn viên",
        body: "Bước 1: Bấm lọc nhóm '⏰ Sắp hết SP (20–45 ngày)' và '🌱 Khách mới'. Bước 2: Chọn từng khách, xem sản phẩm họ vừa mua & nhật ký cũ. Bước 3: Bấm '📋 Copy tin nhắn cá nhân hóa' → bấm 'Mở Zalo ↗' để gửi hỏi thăm và đặt lịch hẹn gọi lại.",
      },
    ],
  },
  {
    id: "rfm",
    title: "2. Hiểu đúng 5 Phân khúc Khách hàng (RFM)",
    items: [
      {
        heading: "⏰ Sắp hết SP (20–45 ngày)",
        body: "Khách đã mua từ 20 đến 45 ngày trước — đúng chu kỳ sắp dùng hết Canh Dưỡng Sinh, Gạo lứt hoặc Trà Bancha. Đây là nhóm có tỷ lệ đặt lại cao nhất nếu được hỏi thăm khéo léo.",
      },
      {
        heading: "🏆 Khách VIP",
        body: "Khách đã mua từ 3 đơn trở lên hoặc tổng chi tiêu >= 3.000.000đ. Hãy ưu tiên gửi quà tri ân, thông báo hàng mới về sớm hoặc nhắc họ đổi điểm trong /thanh-vien/.",
      },
      {
        heading: "🌱 Khách mới",
        body: "Khách mới đặt đơn đầu tiên trong vòng 20 ngày. Nên nhắn hướng dẫn cách nấu/cách pha chuẩn thực dưỡng sau 3–5 ngày nhận hàng để khách dùng có hiệu quả tốt nhất.",
      },
      {
        heading: "⚠️ Nguy cơ rời bỏ (>45 ngày)",
        body: "Khách từng mua nhưng đã hơn 45 ngày chưa quay lại. Hãy nhắc số điểm thưởng họ đang có hoặc tặng kèm mã giảm giá nhỏ để kéo họ quay lại.",
      },
      {
        heading: "👤 Chưa mua đơn (Lead)",
        body: "Người đã đăng ký tài khoản thành viên nhưng chưa phát sinh đơn hàng. Phù hợp gửi lời chào, tư vấn sản phẩm dùng thử.",
      },
    ],
  },
  {
    id: "zalo",
    title: "3. Cách dùng Tin nhắn Zalo 1-Click",
    items: [
      {
        heading: "Cá nhân hóa tự động",
        body: "Hệ thống tự động điền sẵn Tên khách + Tên sản phẩm mua gần nhất + Số điểm Loyalty hiện có vào mẫu tin nhắn lịch sự, tự nhiên.",
      },
      {
        heading: "Thao tác 3 giây",
        body: "Bấm '📋 Copy tin nhắn cá nhân hóa', sau đó bấm 'Mở Zalo ↗' (mở thẳng cửa sổ chat với SĐT khách) rồi dán gửi (Ctrl+V / Chạm giữ → Dán).",
      },
    ],
  },
  {
    id: "notes",
    title: "4. Nhắc việc 'Cần gọi hôm nay' & Nhật ký Tư vấn",
    badge: "Mới",
    items: [
      {
        heading: "Badge nhắc việc trên Menu Admin",
        body: "Số lượng khách có ngày hẹn gọi lại <= hôm nay sẽ hiện thành badge màu vàng cam ngay cạnh mục '💎 CRM Chăm sóc' ở thanh menu bên trái.",
      },
      {
        heading: "Bộ lọc '🔔 Cần gọi hôm nay' & Nút '✓ Đã xử lý'",
        body: "Bấm tab lọc '🔔 Cần gọi hôm nay' để xem đúng danh sách khách đến hạn. Sau khi gọi xong, bấm '✓ Đã xử lý' (hoặc lưu ghi chú mới) để đóng lịch hẹn cũ và giảm số badge.",
      },
      {
        heading: "Ghi chú thể trạng & Đặt lịch hẹn mới",
        body: "Ghi ngắn gọn thể trạng/sở thích của khách và chọn ngày hẹn tiếp theo ở ô chọn ngày trước khi bấm 'Lưu ghi chú'.",
      },
    ],
  },
  {
    id: "tags",
    title: "5. Gắn Thẻ phân loại Bệnh lý / Nhu cầu (Tags)",
    badge: "Mới",
    items: [
      {
        heading: "Gắn tag 1 chạm hoặc tự nhập",
        body: "Trong hồ sơ khách hàng bên phải, bấm vào các tag gợi ý (#Tiểu_đường, #Dạ_dày, #Tim_mạch, #Ăn_chay, #Khách_biếu_tặng, #Mẹ_bầu) hoặc gõ tag mới vào ô bên dưới rồi bấm 'Gắn'.",
      },
      {
        heading: "Lọc danh sách theo Tag",
        body: "Khi có bài viết kiến thức hoặc combo mới, bấm vào thanh '🏷️ Lọc theo Tag' phía trên danh sách để tìm đúng nhóm khách có nhu cầu tương ứng.",
      },
    ],
  },
  {
    id: "automation",
    title: "6. Tab '🤖 Tự động hóa +3/+25 ngày' (Email & Zalo)",
    badge: "Mới",
    items: [
      {
        heading: "Tự động lọc đơn hoàn thành (done)",
        body: "Hệ thống tự đưa vào hàng chờ các đơn hàng đạt mốc 3–7 ngày (gửi hướng dẫn dùng) và 25–35 ngày (nhắc mua lại định kỳ).",
      },
      {
        heading: "Chạy gửi Email tự động & Gửi Zalo 1 chạm",
        body: "Bấm '▶ Chạy gửi Email tự động ngay' để gửi email hàng loạt cho các khách có email (yêu cầu đã cấu hình SMTP trong Cài đặt). Với khách dùng Zalo, bấm 'Mở Zalo ↗' → '📋 Copy nội dung' → '✓ Đánh dấu đã gửi' để chống gửi trùng.",
      },
    ],
  },
  {
    id: "retention",
    title: "7. Tab '📊 Báo cáo Tỷ lệ Quay lại (Retention Rate)'",
    badge: "Mới",
    items: [
      {
        heading: "Theo dõi sức khỏe doanh thu",
        body: "Xem nhanh Tổng khách đã mua, số khách mua từ 2 đơn trở lên (% Retention Rate), và thanh tỷ trọng Doanh thu Khách mới vs Khách quay lại.",
      },
      {
        heading: "Hiệu quả theo Tư vấn viên",
        body: "Bảng thống kê cuối trang cho biết mỗi tài khoản Admin đã chăm sóc bao nhiêu khách, tổng số ghi chú và số lịch hẹn đã xử lý.",
      },
    ],
  },
  {
    id: "loyalty",
    title: "8. Kết hợp CRM với Điểm thưởng & Voucher",
    items: [
      {
        heading: "Mời khách vãng lai đăng ký nhận điểm",
        body: "Khách mua bằng SĐT dù chưa có tài khoản vẫn được tích điểm tự động. Khi chăm sóc qua Zalo, hãy nhắn họ vào mục Thành viên đăng ký bằng đúng SĐT/Email đó — hệ thống sẽ tự động gộp toàn bộ điểm cũ sang tài khoản mới.",
      },
      {
        heading: "Điều chỉnh điểm tri ân",
        body: "Trong mục '🎁 Tích điểm & Quà', quản trị viên có thể cộng điểm thưởng sinh nhật hoặc quà xin lỗi khi đơn có sự cố (mọi biến động đều lưu minh bạch trong sổ cái).",
      },
    ],
  },
  {
    id: "roadmap",
    title: "9. Gợi ý nâng cấp mở rộng tiếp theo",
    badge: "Tương lai",
    items: [
      {
        heading: "🤖 Kết nối Zalo OA / ZNS chính thức",
        body: "Khi cửa hàng có Zalo OA xác thực, có thể gắn API Token để hệ thống tự bắn tin ZNS ở mốc Ngày +3 và Ngày +25 hoàn toàn tự động.",
      },
      {
        heading: "🧪 Liên kết hồ sơ Xét nghiệm AI & Tư vấn nhanh AI",
        body: "Hiển thị thêm lịch sử xét nghiệm / câu hỏi tư vấn nhanh AI của khách ngay trong cột hồ sơ CRM 360°.",
      },
    ],
  },
];

export default function CrmGuideDrawer() {
  // "closed" | "open" | "minimized"
  const [panelState, setPanelState] = useState<"closed" | "open" | "minimized">("closed");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    overview: true,
    rfm: true,
  });

  function toggleTopic(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function expandAll(val: boolean) {
    const next: Record<string, boolean> = {};
    for (const t of TOPICS) next[t.id] = val;
    setExpanded(next);
  }

  return (
    <>
      {/* Trigger button in CRM header */}
      <button
        type="button"
        onClick={() => setPanelState("open")}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-brand/30 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-brand shadow-2xs transition hover:bg-brand hover:text-white"
      >
        <span>📖</span>
        <span>Hướng dẫn sử dụng CRM</span>
      </button>

      {/* Minimized floating tab on the right edge */}
      {panelState === "minimized" && (
        <button
          type="button"
          onClick={() => setPanelState("open")}
          className="fixed right-0 top-1/2 z-[100] -translate-y-1/2 cursor-pointer rounded-l-2xl border border-r-0 border-brand/30 bg-brand px-3 py-4 text-xs font-extrabold text-white shadow-xl transition hover:bg-brand-dark"
          title="Mở rộng bảng hướng dẫn CRM"
        >
          <div className="flex flex-col items-center gap-1">
            <span>«</span>
            <span className="[writing-mode:vertical-rl] tracking-wide">Hướng dẫn CRM</span>
          </div>
        </button>
      )}

      {/* Right Slide-Over Panel */}
      {panelState === "open" && (
        <div
          onClick={() => setPanelState("closed")}
          className="fixed inset-0 z-[100] flex justify-end bg-black/30 backdrop-blur-[1px]"
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-brand-dark to-brand px-4 py-3.5 text-white">
              <div>
                <h2 className="text-sm font-extrabold">📖 Cẩm nang Sử dụng CRM 360°</h2>
                <p className="text-[11px] text-emerald-100">Bấm + / − ở từng chủ đề để mở rộng hoặc thu gọn</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPanelState("minimized")}
                  title="Thu nhỏ cột sang mép phải"
                  className="cursor-pointer rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/25"
                >
                  Thu nhỏ »
                </button>
                <button
                  type="button"
                  onClick={() => setPanelState("closed")}
                  title="Đóng"
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg bg-white/15 text-xs font-bold text-white hover:bg-white/25"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Expand / Collapse All Bar */}
            <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2 text-[11px]">
              <span className="font-semibold text-gray-500">{TOPICS.length} chủ đề hướng dẫn</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => expandAll(true)}
                  className="cursor-pointer font-bold text-brand hover:underline"
                >
                  + Mở tất cả
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => expandAll(false)}
                  className="cursor-pointer font-bold text-gray-600 hover:underline"
                >
                  − Thu gọn tất cả
                </button>
              </div>
            </div>

            {/* Accordion Topics with + / - */}
            <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
              {TOPICS.map((topic) => {
                const isOpen = Boolean(expanded[topic.id]);
                return (
                  <div
                    key={topic.id}
                    className={`overflow-hidden rounded-xl border transition ${
                      isOpen ? "border-brand/40 bg-emerald-50/20" : "border-gray-200 bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTopic(topic.id)}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-gray-50/80"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-brand/30 bg-emerald-50 font-mono text-sm font-extrabold text-brand">
                          {isOpen ? "−" : "+"}
                        </span>
                        <span className="text-xs font-extrabold text-gray-900 sm:text-[13px]">
                          {topic.title}
                        </span>
                      </div>
                      {topic.badge && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          {topic.badge}
                        </span>
                      )}
                    </button>

                    {isOpen && (
                      <div className="space-y-2.5 border-t border-gray-100 bg-white px-4 py-3 text-xs leading-relaxed text-gray-700">
                        {topic.items.map((it) => (
                          <div key={it.heading}>
                            <div className="font-bold text-brand-dark">• {it.heading}</div>
                            <p className="mt-0.5 pl-3 text-gray-600">{it.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
