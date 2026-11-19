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
    title: "1. Tổng quan Hệ thống Tích điểm & 4 Hạng Thành viên",
    badge: "Bắt đầu",
    items: [
      {
        heading: "Cơ chế tích điểm tự động",
        body: "Khách hàng mua đơn trên website, khi đơn hàng chuyển sang trạng thái 'Hoàn thành (done)', hệ thống tự động tính và cộng điểm thưởng vào ví Loyalty của khách dựa theo số tiền đơn hàng và hạng hiện tại.",
      },
      {
        heading: "4 Hạng thành viên & Hệ số nhân điểm mặc định",
        body: "🥉 Đồng (0+ điểm trọn đời, ×1) → 🥈 Bạc (1.000+ điểm, ×1.2) → 🥇 Vàng (3.000+ điểm, ×1.5) → 💎 Kim cương (10.000+ điểm, ×2). Điểm trọn đời tăng sẽ tự động thăng hạng (không bị tụt hạng khi khách đổi quà).",
      },
    ],
  },
  {
    id: "redemptions",
    title: "2. Xử lý & Duyệt Đơn Đổi Quà (Dropdown trạng thái)",
    items: [
      {
        heading: "Quy trình 4 trạng thái đơn đổi quà",
        body: "Khi khách dùng điểm đổi quà tại /thanh-vien/, đơn sẽ hiện ở mục '📦 Danh sách Đổi quà'. Dùng menu xổ xuống ở cột 'Cập nhật' để chuyển trạng thái: 'Chờ xử lý' → 'Đã gửi / Đã cấp mã' → 'Đã sử dụng' (hoặc 'Hết hạn').",
      },
      {
        heading: "Mã giảm giá tự động vs Quà hiện vật",
        body: "Nếu là Mã giảm giá / Freeship, hệ thống tự sinh mã coupon cho khách dùng ngay lúc thanh toán. Nếu là Quà hiện vật (trà, gạo lứt...), nhân viên đóng gói gửi kèm đơn hàng rồi chuyển trạng thái sang 'Đã gửi / Đã cấp mã'.",
      },
    ],
  },
  {
    id: "rewards",
    title: "3. Tạo mới & Sửa Kho Quà Tặng (100% Tiếng Việt)",
    badge: "Mới",
    items: [
      {
        heading: "4 loại phần quà hỗ trợ",
        body: "• Mã giảm giá: chọn giảm tiền mặt (đ) hoặc giảm theo % (có thể đặt mức giảm tối đa) và đơn tối thiểu.\n• Miễn phí vận chuyển: tặng mã freeship tối đa bao nhiêu tiền.\n• Quà hiện vật: nhập Mã quà / Ghi chú đóng gói (VD: TRA-BANCHA-100G).\n• Tiền mặt / Ví: quy đổi giá trị trực tiếp.",
      },
      {
        heading: "Chỉnh sửa & Bật/Tắt quà nhanh",
        body: "Bấm nút '✏️ Sửa' trên bất kỳ phần quà nào để nạp thông tin sang khung bên phải và chỉnh sửa. Nếu hết quà hoặc tạm ngừng chương trình, bấm 'Đang bật' để chuyển sang 'Đang tắt' (khách sẽ không thấy quà này nữa).",
      },
    ],
  },
  {
    id: "rules",
    title: "4. Chỉnh sửa Quy tắc Tích điểm trực quan",
    badge: "Mới",
    items: [
      {
        heading: "Không cần biết code JSON",
        body: "Mỗi quy tắc đều được dịch sẵn sang Tiếng Việt dễ hiểu. Bấm '✏️ Sửa' ở quy tắc muốn chỉnh, nhập số tiền quy đổi 1 điểm (VD: 10.000đ) và hệ số cho 4 hạng (Đồng, Bạc, Vàng, Kim cương).",
      },
      {
        heading: "Xem ngay ví dụ tính thử & Lưu áp dụng thật",
        body: "Khi đang nhập số, hệ thống tự tính thử ngay cho đơn hàng 500.000đ để bạn kiểm tra. Bấm '💾 Lưu quy tắc' là toàn bộ hệ thống cộng điểm đơn hàng, giới thiệu bạn bè, đăng ký & điểm danh sẽ áp dụng mức mới ngay lập tức.",
      },
    ],
  },
  {
    id: "adjust",
    title: "5. Cộng / Trừ Điểm Thủ Công qua Sổ Cái",
    items: [
      {
        heading: "Khi nào cần điều chỉnh điểm tay?",
        body: "Dùng khi muốn tặng bù điểm cho khách VIP, thưởng sự kiện tri ân (nhập số dương, VD: 100) hoặc thu hồi điểm do sai sót/hoàn hàng (nhập số âm, VD: -50).",
      },
      {
        heading: "Ghi rõ lý do để minh bạch",
        body: "Chọn khách hàng ở ô xổ xuống, nhập số điểm và lý do cụ thể. Mọi thao tác đều được lưu vĩnh viễn vào sổ cái point_transactions để đối soát.",
      },
    ],
  },
  {
    id: "crm-link",
    title: "6. Liên kết Loyalty ↔ CRM 360° & Trang Thành viên",
    items: [
      {
        heading: "Tư vấn viên nhìn thấy điểm ngay trong CRM",
        body: "Số điểm hiện có và hạng thành viên được đồng bộ sang /admin/crm/. Khi gọi điện chăm sóc hoặc nhắn Zalo 1-Click, tư vấn viên có thể nhắc khách dùng điểm đổi quà để chốt đơn quay lại nhanh hơn.",
      },
    ],
  },
];

export default function LoyaltyGuideDrawer() {
  const [panelState, setPanelState] = useState<"closed" | "open" | "minimized">("closed");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    overview: true,
    rules: true,
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
      <button
        type="button"
        onClick={() => setPanelState("open")}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-brand/30 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-brand shadow-2xs transition hover:bg-brand hover:text-white"
      >
        <span>📖</span>
        <span>Hướng dẫn Tích điểm &amp; Đổi quà</span>
      </button>

      {panelState === "minimized" && (
        <button
          type="button"
          onClick={() => setPanelState("open")}
          className="fixed right-0 top-1/2 z-[100] -translate-y-1/2 cursor-pointer rounded-l-2xl border border-r-0 border-brand/30 bg-brand px-3 py-4 text-xs font-extrabold text-white shadow-xl transition hover:bg-brand-dark"
          title="Mở rộng bảng hướng dẫn Tích điểm & Đổi quà"
        >
          <div className="flex flex-col items-center gap-1">
            <span>«</span>
            <span className="[writing-mode:vertical-rl] tracking-wide">Hướng dẫn Loyalty</span>
          </div>
        </button>
      )}

      {panelState === "open" && (
        <div
          onClick={() => setPanelState("closed")}
          className="fixed inset-0 z-[100] flex justify-end bg-black/30 backdrop-blur-[1px]"
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-brand-dark to-brand px-4 py-3.5 text-white">
              <div>
                <h2 className="text-sm font-extrabold">📖 Cẩm nang Tích điểm &amp; Đổi quà</h2>
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
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            topic.badge === "Mới"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {topic.badge}
                        </span>
                      )}
                    </button>

                    {isOpen && (
                      <div className="space-y-2.5 border-t border-gray-100 bg-white px-3.5 py-3 text-xs leading-relaxed text-gray-700">
                        {topic.items.map((item) => (
                          <div key={item.heading}>
                            <div className="font-bold text-gray-900">{item.heading}</div>
                            <p className="mt-0.5 whitespace-pre-line text-gray-600">{item.body}</p>
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
