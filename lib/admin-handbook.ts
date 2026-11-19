export type HandbookTopic = {
  id: string;
  title: string;
  badge?: string;
  items: { heading: string; body: string }[];
};

export type HandbookSection = {
  id: string;
  routePrefix: string;
  icon: string;
  label: string;
  topics: HandbookTopic[];
};

export const ADMIN_HANDBOOK_SECTIONS: HandbookSection[] = [
  {
    id: "dashboard",
    routePrefix: "/admin/",
    icon: "📊",
    label: "Tổng quan & Điều hướng Backend",
    topics: [
      {
        id: "dash-overview",
        title: "1. Làm quen Bảng điều khiển & Thanh Menu Nhóm",
        badge: "Cơ bản",
        items: [
          {
            heading: "Menu trái gom nhóm thu gọn / mở rộng",
            body: "Thanh menu bên trái chia 4 nhóm (Bán hàng & Khách hàng, Tư vấn & Trợ lý AI, Nội dung & Media, Hệ thống & SEO). Bấm vào tiêu đề nhóm để thu gọn/mở rộng; trạng thái được nhớ tự động.",
          },
          {
            heading: "Cảnh báo Badge tức thời",
            body: "Số đơn mới cần xử lý hiển thị đỏ ở mục Đơn hàng; số khách có lịch hẹn gọi lại <= hôm nay hiển thị vàng cam ở mục CRM Chăm sóc.",
          },
        ],
      },
    ],
  },
  {
    id: "orders",
    routePrefix: "/admin/orders/",
    icon: "🧾",
    label: "Đơn hàng & Kho hàng",
    topics: [
      {
        id: "orders-flow",
        title: "1. Quy trình xử lý trạng thái đơn & Tự động trừ/hoàn kho",
        items: [
          {
            heading: "5 trạng thái đơn hàng",
            body: "Mới (new) → Đã xác nhận (confirmed) → Đang giao (shipping) → Hoàn thành (done) hoặc Đã huỷ (cancelled). Khi khách đặt đơn hệ thống tự trừ tồn kho; khi chuyển sang 'cancelled' sẽ tự hoàn lại tồn kho.",
          },
          {
            heading: "Tự động cộng điểm & đồng bộ CRM khi 'Hoàn thành'",
            body: "Khi chuyển đơn sang 'done', hệ thống tự cộng điểm thưởng cho thành viên (nếu có tài khoản) và đưa đơn vào hàng chờ CRM Automation (+3 ngày hướng dẫn dùng, +25 ngày nhắc mua lại).",
          },
          {
            heading: "Xuất CSV đối soát",
            body: "Dùng nút Xuất CSV trên trang Đơn hàng để tải danh sách đơn về Excel kiểm tra doanh thu và đối soát vận chuyển.",
          },
        ],
      },
    ],
  },
  {
    id: "products",
    routePrefix: "/admin/products/",
    icon: "🛍️",
    label: "Sản phẩm & Giờ vàng Flash Sale",
    topics: [
      {
        id: "products-crud",
        title: "1. Đăng & Cập nhật Sản phẩm chuẩn SEO",
        items: [
          {
            heading: "Giá bán, Giá khuyến mãi & Tồn kho",
            body: "Nhập giá gốc và giá khuyến mãi (phải nhỏ hơn giá gốc). Nếu đặt Giá = 0, nút mua sẽ tự chuyển thành 'Liên hệ'. Đặt Tồn kho = 0 sẽ hiển thị hết hàng.",
          },
          {
            heading: "Nhúng Block & Video YouTube vào mô tả",
            body: "Trong trình soạn thảo mô tả sản phẩm, bấm các nút '+ Chèn Block', '+ Chèn QR', '+ Chèn MXH & Sàn' hoặc '+ Chèn Gói/Set' để tăng tỷ lệ chuyển đổi.",
          },
        ],
      },
      {
        id: "flash-sale",
        title: "2. Thiết lập Giờ vàng săn sale (/admin/flash-sale/)",
        items: [
          {
            heading: "Chọn khung giờ & sản phẩm giảm sốc",
            body: "Vào mục '⚡ Giờ vàng săn sale' để bật chương trình, chọn thời gian kết thúc đếm ngược và mức giá ưu đãi riêng cho từng sản phẩm.",
          },
        ],
      },
    ],
  },
  {
    id: "crm",
    routePrefix: "/admin/crm/",
    icon: "💎",
    label: "CRM Chăm sóc Khách hàng 360°",
    topics: [
      {
        id: "crm-daily",
        title: "1. Quy trình 3 bước chăm sóc mỗi sáng & Phân khúc RFM",
        items: [
          {
            heading: "5 phân khúc tự động",
            body: "⏰ Sắp hết SP (20–45 ngày), 🏆 Khách VIP (>=3 đơn hoặc >=3 triệu), 🌱 Khách mới (<=20 ngày), ⚠️ Nguy cơ rời bỏ (>45 ngày), 👤 Lead chưa mua.",
          },
          {
            heading: "Tin nhắn Zalo cá nhân hoá 1-Click",
            body: "Hệ thống tự điền Tên khách + Sản phẩm gần nhất + Điểm Loyalty hiện có. Bấm 'Copy tin nhắn' → 'Mở Zalo ↗' để gửi ngay.",
          },
        ],
      },
      {
        id: "crm-followup-tags",
        title: "2. Nhắc việc 'Cần gọi hôm nay', Gắn Tag & Cầu nối Loyalty",
        badge: "Mới",
        items: [
          {
            heading: "Lịch hẹn gọi lại & Badge nhắc việc",
            body: "Chọn ngày hẹn gọi lại trong hồ sơ khách; khách đến hạn (<= hôm nay) hiện ở tab '🔔 Cần gọi hôm nay'. Gọi xong bấm '✓ Đã xử lý'.",
          },
          {
            heading: "Thẻ bệnh lý/nhu cầu & Cầu nối Điểm thưởng",
            body: "Gắn tag (#Tiểu_đường, #Dạ_dày, #Ăn_chay...) để lọc gửi bài/combo. Ngay trong hồ sơ CRM có thể bấm cộng/trừ điểm Loyalty hoặc copy tin nhắn nhắc đổi quà.",
          },
        ],
      },
      {
        id: "crm-auto-retention",
        title: "3. Tự động hoá +3/+25 ngày & Báo cáo Retention Rate",
        badge: "Mới",
        items: [
          {
            heading: "Hàng chờ Email/Zalo +3 và +25 ngày",
            body: "Đơn hoàn thành (done) đạt mốc 3–7 ngày và 25–35 ngày tự xuất hiện ở tab Tự động hoá để gửi Email hàng loạt (qua SMTP) hoặc nhắn Zalo 1 chạm.",
          },
          {
            heading: "Báo cáo Tỷ lệ quay lại",
            body: "Theo dõi tỷ lệ khách mua từ 2 đơn trở lên, doanh thu khách cũ vs khách mới và hiệu suất từng nhân viên tư vấn.",
          },
        ],
      },
    ],
  },
  {
    id: "loyalty",
    routePrefix: "/admin/loyalty/",
    icon: "🎁",
    label: "Tích điểm & Đổi quà (Loyalty)",
    topics: [
      {
        id: "loyalty-rules",
        title: "1. Quy tắc tích điểm, Hạng thành viên & Kho quà tặng",
        items: [
          {
            heading: "Cơ chế tích điểm & Hạng",
            body: "Khách mới đăng ký được tặng điểm chào mừng; mỗi đơn 'Hoàn thành' tự cộng điểm theo tỷ lệ VNĐ. Hạng Đồng → Bạc → Vàng mở khoá ưu đãi cao hơn.",
          },
          {
            heading: "Quản lý Kho quà & Duyệt đổi quà",
            body: "Thêm phần quà/voucher đổi bằng điểm, bật/tắt quà và xác nhận các yêu cầu đổi quà của thành viên ngay trên trang Tích điểm & Quà.",
          },
        ],
      },
    ],
  },
  {
    id: "members",
    routePrefix: "/admin/members/",
    icon: "👥",
    label: "Thành viên, Phân quyền RBAC & Tài khoản Quản trị",
    topics: [
      {
        id: "members-rbac",
        title: "1. Phân quyền 4 vai trò Ban quản trị (RBAC)",
        badge: "Mới",
        items: [
          {
            heading: "4 cấp tài khoản quản trị",
            body: "Super Admin (toàn quyền hệ thống), Admin (vận hành shop, trừ sửa/xoá Super Admin), Editor (chỉ viết bài, sản phẩm, block, video, MXH & SEO), Bán hàng/Sales (xử lý đơn, CRM, loyalty, tư vấn AI).",
          },
        ],
      },
      {
        id: "members-login-phone",
        title: "2. Đăng nhập bằng Email hoặc SĐT & Nút 'Đổi Passwork Mới'",
        badge: "Mới",
        items: [
          {
            heading: "Đăng nhập chung 1 mật khẩu bằng Email hoặc SĐT",
            body: "Trong bảng Tài khoản Quản trị, bấm '+ Gắn SĐT' / 'Sửa SĐT' cho từng thành viên (hoặc nhập sẵn khi tạo mới). Sau đó thành viên có thể đăng nhập /admin/ bằng Email hoặc SĐT với cùng 1 mật khẩu.",
          },
          {
            heading: "Đặt lại mật khẩu nhanh",
            body: "Super Admin/Admin có thể bấm nút 'Đổi Passwork Mới' ở cột Thao tác để cấp mật khẩu mới (>= 8 ký tự) cho nhân sự khi quên mật khẩu.",
          },
        ],
      },
    ],
  },
  {
    id: "ai",
    routePrefix: "/admin/quick-consult/",
    icon: "🩺",
    label: "Tư vấn nhanh AI & Xét nghiệm AI",
    topics: [
      {
        id: "ai-tools",
        title: "1. Vận hành Tư vấn nhanh AI & Đọc kết quả Xét nghiệm",
        items: [
          {
            heading: "Theo dõi & Phản hồi hồ sơ tư vấn",
            body: "Xem câu hỏi/triệu chứng khách gửi từ /tu-van-nhanh/, chỉnh sửa phác đồ gợi ý của AI trước khi gửi Email hoặc gọi điện chốt đơn qua SĐT.",
          },
          {
            heading: "Xét nghiệm AI (/admin/lab-analysis/)",
            body: "Quản lý danh sách phiếu xét nghiệm khách tải lên, xem bản phân tích AI và chỉ số sức khoẻ để tư vấn thực dưỡng phù hợp.",
          },
        ],
      },
    ],
  },
  {
    id: "content",
    routePrefix: "/admin/posts/",
    icon: "📝",
    label: "Bài viết, Video, Tài liệu & Soạn thảo AI",
    topics: [
      {
        id: "content-editor",
        title: "1. Trình soạn thảo ContentEditor & Trợ lý viết bài AI",
        items: [
          {
            heading: "Chèn nhanh Block, QR, Sản phẩm & MXH",
            body: "Thanh công cụ phía trên khung soạn thảo có sẵn nút chèn Block thường dùng ([[block:slug]]), QR Code ([[qr:slug]]), Liên kết MXH & Sàn ([[social]]), Block 1 sản phẩm và Gói/Set.",
          },
          {
            heading: "Video bài giảng & Tài liệu PDF",
            body: "Quản lý kho Video YouTube (hỗ trợ đồng bộ tự động) tại /admin/videos/ và Tài liệu & Sách thực dưỡng tại /admin/documents/.",
          },
        ],
      },
    ],
  },
  {
    id: "social-links",
    routePrefix: "/admin/social-links/",
    icon: "🌐",
    label: "Liên kết Mạng xã hội & Sàn TMĐT",
    topics: [
      {
        id: "social-setup",
        title: "1. Cấu hình đa kênh & Chống thất thoát đơn hàng",
        badge: "Mới",
        items: [
          {
            heading: "2 nhóm kênh tách biệt",
            body: "Nhóm Mạng xã hội (Facebook Page, Group, YouTube, TikTok, Zalo OA, Instagram) và nhóm Sàn TMĐT (Shopee, Lazada, TikTok Shop, Tiki). Nhập URL hợp lệ (https://...), bật công tắc và bấm 'Lưu cấu hình'.",
          },
          {
            heading: "Thông báo giữ khách mua trực tiếp tại Web",
            body: "Khi bật link Sàn TMĐT, hệ thống tự hiển thị thông báo nhắc khách đặt trực tiếp tại Web để được tích điểm đổi quà & tư vấn 1:1, hạn chế mất phí sàn.",
          },
        ],
      },
      {
        id: "social-embed",
        title: "2. Nhúng Block bất kỳ đâu, Đếm Click & Tạo QR Code",
        badge: "Mới",
        items: [
          {
            heading: "4 kiểu hiển thị & Shortcode nhúng",
            body: "Chọn tự động hiện ở Footer / Trang sản phẩm hoặc dán shortcode [[social]], [[social:cards]], [[social:pills]], [[social:sidebar]], [[social:marketplace]] vào bất kỳ bài viết/block nào.",
          },
          {
            heading: "Thống kê Click, gắn UTM & Tải QR in ấn",
            body: "Mỗi lượt bấm đi qua /go/social/[id] được đếm trực tiếp và tự gắn UTM. Bấm nút '📱 QR Code' trên từng kênh để tải ảnh PNG in lên bao bì/tờ rơi.",
          },
        ],
      },
    ],
  },
  {
    id: "blocks-qr",
    routePrefix: "/admin/blocks/",
    icon: "🧩",
    label: "Block thường dùng & QR Code Động",
    topics: [
      {
        id: "blocks-zones",
        title: "1. Đặt Block tự động vào 10 vị trí trên Website",
        items: [
          {
            heading: "Vị trí tự động (BlockZone) & Shortcode",
            body: "Mỗi Block có thể gắn vào home_top, home_bottom, post_top, post_middle (sau H2 thứ 2), post_bottom, post_sidebar, product_top, product_bottom, product_sidebar hoặc chèn tay bằng [[block:slug]].",
          },
          {
            heading: "QR Code Động (/admin/qr/)",
            body: "Tạo mã QR gắn slug cố định [[qr:slug]]. Khi đổi link đích trong Quản trị QR, mọi bài viết và sản phẩm đang nhúng mã này tự cập nhật theo link mới.",
          },
        ],
      },
    ],
  },
  {
    id: "system-seo",
    routePrefix: "/admin/settings/",
    icon: "⚙️",
    label: "Sitemaps SEO, Giao diện & Cài đặt Hệ thống",
    topics: [
      {
        id: "sys-seo-themes",
        title: "1. Sitemaps SEO, Giao diện & Cài đặt SMTP",
        items: [
          {
            heading: "Sitemaps SEO (/admin/sitemaps/)",
            body: "Kiểm tra sitemap.xml chuẩn Google Search Console và trang sơ đồ HTML (/so-do-trang.html), tùy chỉnh bật/tắt từng nhóm liên kết.",
          },
          {
            heading: "Giao diện & Cỡ chữ (/admin/themes/)",
            body: "Đổi bộ màu sắc, font chữ, cỡ chữ dễ đọc cho khách hàng lớn tuổi ngay trong Admin.",
          },
          {
            heading: "Cài đặt chung & SMTP (/admin/settings/)",
            body: "Cấu hình tên shop, hotline, widget Zalo/Messenger nổi, email nhận thông báo đơn mới và tài khoản SMTP Gmail để gửi mail tự động.",
          },
        ],
      },
    ],
  },
];

export function findMatchingSectionId(pathname: string): string {
  const path = pathname.replace(/\/?$/, "/");
  if (path === "/admin/") return "dashboard";
  // Match specific prefixes first
  const matches = ADMIN_HANDBOOK_SECTIONS.filter(
    (s) => s.routePrefix !== "/admin/" && path.startsWith(s.routePrefix),
  );
  if (matches.length > 0) return matches[0].id;
  if (path.startsWith("/admin/flash-sale/")) return "products";
  if (path.startsWith("/admin/lab-analysis/")) return "ai";
  if (
    path.startsWith("/admin/videos/") ||
    path.startsWith("/admin/documents/") ||
    path.startsWith("/admin/pages/") ||
    path.startsWith("/admin/categories/") ||
    path.startsWith("/admin/comments/")
  ) {
    return "content";
  }
  if (path.startsWith("/admin/qr/")) return "blocks-qr";
  if (path.startsWith("/admin/sitemaps/") || path.startsWith("/admin/themes/")) return "system-seo";
  return "dashboard";
}
