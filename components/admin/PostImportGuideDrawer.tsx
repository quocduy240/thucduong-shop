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
    title: "1. Quy trình 5 bước Nghiên cứu & Viết bài Độc Bản",
    badge: "Bắt đầu",
    items: [
      {
        heading: "Tư duy khác biệt: Nghiên cứu trước — Viết mới hoàn toàn",
        body: "Khác với copy bài thông thường, hệ thống chạy ngầm qua 4 chặng: (1) Lấy văn bản gốc hoặc Transcript lời nói YouTube → (2) Lập Bản nghiên cứu trung gian Đông–Tây Y → (3) Viết lại bài mới 100% chuẩn Y khoa & Kiểm tra chính sách Google/YouTube → (4) Tạo bộ 3–5 ảnh AI đồng bộ Thực Dưỡng.",
      },
      {
        heading: "Không tự xuất bản khi bạn chưa duyệt",
        body: "Bài viết sau khi AI xử lý xong sẽ nằm ở trạng thái '✓ Chờ Review & Xuất bản'. Bạn kiểm tra, chỉnh sửa câu chữ, chọn chuyên mục phù hợp rồi mới bấm '🚀 Xuất bản vào Chuyên mục'.",
      },
    ],
  },
  {
    id: "youtube",
    title: "2. Cách dùng với Link YouTube & Tổng hợp nhiều Link",
    badge: "Mới",
    items: [
      {
        heading: "Dán link YouTube bất kỳ (Video dài, Shorts, Live)",
        body: "Hệ thống tự động nhận diện link YouTube và trích xuất phụ đề/lời nói (Transcript) trong video. Nếu video không bật phụ đề, bấm '+ Dán Transcript/Text' để dán phần nội dung bạn muốn AI phân tích.",
      },
      {
        heading: "Gộp thêm 1–2 link tham khảo phụ",
        body: "Bấm '+ Thêm link tham khảo' để dán thêm tối đa 2 link bài báo hoặc video khác. AI sẽ tổng hợp kiến thức đa chiều thành 1 bài chuyên sâu vượt trội hoàn toàn từng nguồn lẻ.",
      },
    ],
  },
  {
    id: "policy",
    title: "3. Tuân thủ Pháp luật Y tế VN, Google YMYL & YouTube (Cập nhật mỗi tuần)",
    badge: "Mới",
    items: [
      {
        heading: "Tự động đồng bộ chuẩn mới mỗi 7 ngày",
        body: "Hệ thống tự động chạy ngầm đồng bộ hàng tuần (7 ngày) các quy định hiện hành của Pháp luật Việt Nam (Luật Quảng cáo, Nghị định 15/2018/NĐ-CP, Thông tư 09/2015/TT-BYT) cùng chính sách Y tế Google (YMYL/E-E-A-T) và YouTube. Có thể bấm '🔄 Cập nhật chuẩn ngay' ở thanh trạng thái đầu trang.",
      },
      {
        heading: "Tránh tuyên truyền thông tin y tế sai lệch",
        body: "Hệ thống tự động loại bỏ các cụm từ rủi ro (như 'chữa khỏi 100%', 'bỏ thuốc bác sĩ', 'thần dược'), chuyển sang ngôn ngữ khoa học chừng mực và tự thêm hộp Lưu ý chuyên môn cuối bài.",
      },
      {
        heading: "Chấm điểm lại sau khi bạn chỉnh sửa",
        body: "Sau khi tự sửa nội dung trong khung Biên tập, bấm '💾 Lưu bản nháp & Chấm điểm Y tế' để hệ thống chấm lại thang điểm an toàn (95–100/100) trước khi xuất bản.",
      },
    ],
  },
  {
    id: "editor-images",
    title: "4. Chèn ảnh AI vào con trỏ, Viết lại theo Chuẩn đề nghị & Vẽ lại ảnh",
    badge: "Mới",
    items: [
      {
        heading: "Chèn 1-click ảnh AI từ bài này vào đúng vị trí con trỏ",
        body: "Ở cột Bộ ảnh AI bên trái, mỗi ảnh thuộc bài viết đang Review đều có nút '📥 Chèn vào con trỏ' để chèn thẳng vào đúng chỗ đang đặt con trỏ trong trình soạn thảo, nút '⭐' đặt làm ảnh bìa, và nút '🖼️ Tự chèn bộ ảnh vào bài' để tự phân bổ ảnh còn thiếu vào các mục H2.",
      },
      {
        heading: "Viết lại toàn bài theo chuẩn đề nghị (giữ nguyên bộ ảnh AI)",
        body: "Ngay dưới khung soạn thảo có bảng '✨ Viết lại toàn bài theo chuẩn đề nghị': chọn nhanh preset hoặc nhập chuẩn riêng của bạn, AI sẽ viết lại toàn bài dựa trên nội dung đang Review + nghiên cứu Đông–Tây Y và tự lồng lại bộ ảnh AI của bài. Có nút '↩️ Hoàn tác bản trước' nếu muốn quay lại.",
      },
      {
        heading: "3 Chế độ xem & Bộ công cụ Trực quan",
        body: "Dùng thanh công cụ trực quan (B/I/U, H2/H3, Màu chữ, Highlight, Chèn ảnh, Chèn link, Chế độ Chia đôi/HTML) để sửa bài dễ như Google Docs. Bấm '🎨 Vẽ lại' dưới từng ảnh nếu muốn tạo lại riêng ảnh đó.",
      },
    ],
  },
  {
    id: "publish",
    title: "5. Chọn Chuyên mục, Gắn Sản phẩm & Xoá dấu vết nguồn",
    items: [
      {
        heading: "AI gợi ý Chuyên mục & Sản phẩm bán kèm",
        body: "AI tự đánh dấu ★ vào chuyên mục phù hợp nhất và gợi ý các sản phẩm của shop ở cuối bài để tăng chuyển đổi tự nhiên.",
      },
      {
        heading: "Quản lý link nguồn kín đáo",
        body: "Mặc định link nguồn chỉ lưu trong Admin để bạn đối chiếu kiến thức. Bạn có thể bỏ tích 'Lưu kín link nguồn' lúc xuất bản hoặc bấm '🧹 Xoá note nguồn' sau khi đã hoàn tất.",
      },
    ],
  },
];

export default function PostImportGuideDrawer() {
  const [panelState, setPanelState] = useState<"closed" | "open" | "minimized">("closed");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    overview: true,
    "editor-images": true,
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
        <span>Hướng dẫn Nghiên cứu &amp; Viết bài</span>
      </button>

      {panelState === "minimized" && (
        <button
          type="button"
          onClick={() => setPanelState("open")}
          className="fixed right-0 top-1/2 z-[100] -translate-y-1/2 cursor-pointer rounded-l-2xl border border-r-0 border-brand/30 bg-brand px-3 py-4 text-xs font-extrabold text-white shadow-xl transition hover:bg-brand-dark"
          title="Mở rộng bảng hướng dẫn"
        >
          <div className="flex flex-col items-center gap-1">
            <span>«</span>
            <span className="[writing-mode:vertical-rl] tracking-wide">Hướng dẫn Bài viết AI</span>
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
                <h2 className="text-sm font-extrabold">📖 Cẩm nang Viết Bài Độc Bản AI</h2>
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
                            <p className="mt-0.5 text-gray-600">{item.body}</p>
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
