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
        title: "1. Đăng & Cập nhật Sản phẩm chuẩn SEO (Quy trình 3 bước)",
        badge: "Mới",
        items: [
          {
            heading: "Giao diện 3 Bước (Tab) & Thanh kiểm tra tình trạng hồ sơ",
            body: "Trang sửa sản phẩm được chia thành 3 bước rõ ràng: Bước 1 (Thông tin & Giá bán), Bước 2 (Hình ảnh & Video), Bước 3 (Mô tả chi tiết & AI). Các nhãn trạng thái ở trên giúp kiểm tra nhanh mục nào đã đủ, bấm vào nhãn để nhảy thẳng tới bước cần sửa; bấm Lưu ở thanh đáy sẽ lưu toàn bộ cả 3 bước cùng lúc.",
          },
          {
            heading: "Trình soạn thảo Mô tả tinh gọn cho Sản phẩm",
            body: "Ở Bước 3, thanh công cụ chỉ giữ lại các nút thiết yếu (Tiêu đề mục H2/H3, Đậm/Nghiêng, Danh sách, Chèn ảnh, Liên kết) và đặt thanh '✨ Viết lại bằng AI' ngay đầu khung soạn thảo. Khi cần chèn Bảng, Video, Block hoặc nhập giọng nói, bấm '+ Công cụ nâng cao'.",
          },
          {
            heading: "Tối ưu SEO Google (SERP Preview & Chấm điểm 0–100)",
            body: "Ngay trong trang sửa Sản phẩm và Bài viết có hộp '🔍 Tối ưu SEO Google': xem trước kết quả hiển thị trên Google, bấm '⚡ Tự điền SEO gợi ý' để tự lấy tiêu đề/mô tả chuẩn độ dài (60 / 155 ký tự), nhập từ khoá chính và theo dõi 5 tiêu chí chấm điểm SEO. Hệ thống tự xuất Meta Tags, Canonical URL và Schema.org JSON-LD (Product/Article) ra trang ngoài.",
          },
          {
            heading: "Giá bán, Giá khuyến mãi & Tồn kho",
            body: "Nhập giá gốc và giá khuyến mãi (phải nhỏ hơn giá gốc). Nếu đặt Giá = 0, nút mua sẽ tự chuyển thành 'Liên hệ'. Đặt Tồn kho = 0 sẽ hiển thị hết hàng.",
          },
          {
            heading: "Nhúng Block & Video YouTube vào mô tả",
            body: "Trong trình soạn thảo mô tả sản phẩm, bấm các nút '+ Chèn Block', '+ Chèn QR', '+ Chèn MXH & Sàn' hoặc '+ Chèn Gói/Set' để tăng tỷ lệ chuyển đổi.",
          },
          {
            heading: "Viết lại mô tả bằng AI & Lọc sạch dấu vết trang nguồn (Mới)",
            body: "Ngay cuối khung Mô tả sản phẩm có nút '✨ Viết lại bằng AI' kèm nút '⚙️ Cấu hình cách viết': tự động lọc bỏ số điện thoại/Zalo cũ, nút mua hàng web nguồn, và tên miền trang web khác (tự nhận diện domain nguồn nếu SP được nhập từ link), viết lại chuẩn Thực dưỡng & YMYL kèm nút '↩️ Hoàn tác bản cũ'.",
          },
          {
            heading: "Hàng đợi AI Idle Worker tuần tự & Thông báo màu nổi kèm ETA (Mới)",
            body: "Mọi tác vụ AI chạy ngầm (tạo lại ảnh đại diện, viết lại mô tả sản phẩm...) đều tự động xếp hàng chạy tuần tự từng việc một lúc trình duyệt rảnh để tiết kiệm tài nguyên server & quota AI, hiển thị thông báo màu nổi ngay tại khu vực đang sửa và ở góc dưới trái kèm đếm ngược thời gian hoàn thành (ETA).",
          },
        ],
      },
      {
        id: "flash-sale",
        title: "2. Thiết lập Giờ vàng săn sale 3 Tab (/admin/flash-sale/)",
        badge: "Mới",
        items: [
          {
            heading: "3 Tab rõ ràng: Deal Săn Sale · Khung Giờ · Cấu hình",
            body: "Mặc định mở thẳng Tab '🔥 Sản phẩm Săn Sale' kèm bộ lọc nhanh theo từng khung giờ và khung '+ Thêm nhanh sản phẩm' thu gọn. Tab '⏰ Khung Giờ Vàng' dùng để chỉnh giờ (11h-14h, 19h-22h...) và % giảm chuẩn; Tab '⚙️ Cấu hình' để bật/tắt 24/7 và reset mỗi ngày.",
          },
          {
            heading: "Tạo Deal tự động 1 chạm (-15%)",
            body: "Bấm nút '⚡ Tự động phân bổ Deal (-15%)' ngay trên thanh Tab để hệ thống tự chọn sản phẩm nổi bật còn hàng chia đều vào các khung giờ.",
          },
        ],
      },
      {
        id: "product-import",
        title: "3. Nhập Sản phẩm từ Link, Hàng đợi Idle Worker & Làm sạch AI (/admin/products/import/)",
        badge: "Mới",
        items: [
          {
            heading: "Kiểm tra trùng link tức thời & Xử lý SP còn dấu vết cũ",
            body: "Ngay khi dán URL (tự bỏ utm/fbclid), hệ thống báo ngay nếu link đã có trong kho hoặc đang nằm trong hàng đợi. Nếu SP cũ vẫn còn dấu vết trang nguồn, bạn có thể chọn giữ danh mục hiện tại hoặc chuyển sang danh mục mới rồi đưa thẳng vào hàng đợi làm sạch.",
          },
          {
            heading: "Khung Giám sát Hàng đợi Idle Worker & Ước tính thời gian (ETA)",
            body: "Khung trên cùng hiển thị trạng thái Rảnh việc (kèm gợi ý giao việc tồn đọng) hoặc Đang chạy ngầm (% tiến độ, bước xử lý từng ảnh, ETA đếm ngược). Hỗ trợ dán hàng loạt tối đa 20 link cùng lúc để Worker tự chạy tuần tự.",
          },
          {
            heading: "Danh sách SP đã lấy chưa làm sạch & Làm sạch tuần tự",
            body: "Mục '🧹 Sản phẩm đã lấy nhưng CHƯA làm sạch' liệt kê các SP còn dấu vết trang cũ hoặc ảnh ngoài. Bạn có thể bấm '🤖 Làm sạch SP này' hoặc check chọn nhiều SP rồi bấm 'Làm sạch tuần tự' — hệ thống sẽ chạy ngầm từ từ và tự động lưu giữ nguyên danh mục cũ.",
          },
          {
            heading: "Lịch sử cập nhật & Xoá note nguồn",
            body: "Mọi link đã lấy được lưu trong Lịch sử kèm nút '🔄 Cập nhật nguồn'. Khi sản phẩm đã sạch hoàn toàn, bấm '🧹 Xoá note nguồn' để xoá link nguồn khỏi hồ sơ sản phẩm.",
          },
          {
            heading: "Nút '🧹 Làm sạch dữ liệu ngay' & Cá nhân hoá sản phẩm (Mới)",
            body: "Ngay dưới mục 'Dấu vết trang cũ phát hiện', bấm '🧹 Làm sạch dữ liệu ngay' (kèm nút '⚙️ Đề nghị bổ sung cho AI') để: (1) tẩy sạch 100% HTML/CSS cũ, chuẩn hoá theo giao diện web mình; (2) lọc bỏ tên miền, SĐT, link mua sàn khác & bản quyền; (3) AI xoá logo/SĐT web cũ trên ảnh nhưng giữ nguyên nhãn hãng sản phẩm; (4) viết lại cá nhân hoá thành sản phẩm của Thực Dưỡng Phúc Thọ.",
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
            heading: "Quản lý Kho quà & Sửa nhanh bằng Tiếng Việt",
            body: "Thêm hoặc bấm '✏️ Sửa' phần quà bằng các ô chọn trực quan (Giảm tiền mặt/%, Đơn tối thiểu, Giảm tối đa hoặc Mã quà hiện vật) mà không cần nhập code JSON.",
          },
        ],
      },
      {
        id: "loyalty-visual-rules",
        title: "2. Chỉnh sửa Quy tắc Tích điểm trực quan (Không cần JSON)",
        badge: "Mới",
        items: [
          {
            heading: "Hiển thị & Sửa công thức theo từng hạng",
            body: "Mỗi quy tắc hiển thị bằng câu Tiếng Việt rõ ràng (VD: 'Mỗi 10.000đ = 1 điểm gốc · Đồng ×1, Bạc ×1.2, Vàng ×1.5, Kim cương ×2'). Bấm '✏️ Sửa' để đổi số tiền, hệ số hạng, điểm giới thiệu hoặc điểm danh hằng ngày và xem ngay ví dụ tính thử với đơn 500.000đ.",
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
        id: "members-tabs-kpi",
        title: "0. Giao diện 4 Tab & Bộ lọc Thành viên theo hạng (/admin/members/)",
        badge: "Mới",
        items: [
          {
            heading: "4 Thẻ KPI & 4 Tab riêng biệt (tải nhanh theo từng mục)",
            body: "Trang được tách thành 4 Tab: Thành viên (lọc nhanh theo hạng Đồng / Bạc / Vàng VIP, phân trang 30 người/trang), Mã giảm giá (form tạo mới thu gọn), Email nhận tin (phân trang & xuất CSV) và Nhân sự Admin (RBAC). Bấm trực tiếp vào 4 thẻ KPI trên đầu trang để chuyển nhanh giữa các mục.",
          },
        ],
      },
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
            heading: "Quy trình 3 bước ngoài /tu-van-nhanh/ (Mới)",
            body: "Trang khách /tu-van-nhanh/ hoạt động theo 3 bước: Bước 1 (Đối tượng, hồ sơ & tự tính chỉ số BMI), Bước 2 (Nhu cầu, tình trạng & khẩu phần 24h tuỳ chọn), Bước 3 (Chọn mô hình Chuyên gia AI & thanh tiến trình 4 giai đoạn). Admin xem và duyệt hồ sơ tại /admin/quick-consult/.",
          },
          {
            heading: "Theo dõi & Phản hồi hồ sơ tư vấn",
            body: "Xem câu hỏi/triệu chứng khách gửi từ /tu-van-nhanh/, chỉnh sửa phác đồ gợi ý của AI trước khi gửi Email hoặc gọi điện chốt đơn qua SĐT.",
          },
          {
            heading: "Xét nghiệm AI (/admin/lab-analysis/)",
            body: "Quản lý danh sách phiếu xét nghiệm khách tải lên, xem bản phân tích AI và chỉ số sức khoẻ để tư vấn thực dưỡng phù hợp.",
          },
          {
            heading: "Block Miễn trừ trách nhiệm Y khoa 3 văn phong (Mới)",
            body: "Trong Cấu hình Chuyên gia tại /admin/quick-consult/, chọn 1 trong 3 văn phong chuẩn (Gemini Khoa học, Ân cần cho người lớn tuổi, hoặc Pháp lý chặt chẽ NĐ 15/2018) cùng vị trí hiển thị. Block sẽ tự động xuất hiện ở /tu-van-nhanh/, Hồ sơ PDF (/ho-so-tu-van/[token]/), bản xem trước Admin và Email gửi bệnh nhân.",
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
        id: "posts-list-seo",
        title: "0. Danh sách Bài viết, Thẻ KPI & Lọc lỗi SEO (/admin/posts/)",
        badge: "Mới",
        items: [
          {
            heading: "4 Thẻ KPI & Bộ lọc nhanh 1 chạm",
            body: "Đầu trang hiển thị tổng bài viết, số bài thiếu ảnh bìa, số bài chưa tối ưu SEO và số chuyên mục. Bấm trực tiếp vào thẻ KPI hoặc nút Pill lọc nhanh ('Thiếu ảnh', 'Thiếu mô tả', 'Chưa tối ưu SEO') để lọc ngay bài cần hoàn thiện.",
          },
          {
            heading: "Thao tác nhanh trên từng dòng",
            body: "Bấm vào huy hiệu chuyên mục để lọc nhanh theo chuyên mục đó, hoặc dùng nút '👁️ Xem', '✏️ Sửa', '🗑️ Xoá' ngay trên bảng.",
          },
        ],
      },
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
      {
        id: "post-import",
        title: "2. Nghiên cứu & Viết Bài Độc Bản từ Link / YouTube (/admin/posts/import/)",
        badge: "Mới",
        items: [
          {
            heading: "Lấy bài Web hoặc Transcript YouTube & Tuân thủ Pháp luật VN / Google / YouTube",
            body: "Vào /admin/posts/ bấm '🌐 Nhập Bài từ Link / YouTube'. Hệ thống tự chạy ngầm lấy văn bản/Transcript, nghiên cứu Đông–Tây Y và tự động cập nhật mỗi tuần (7 ngày) chuẩn Pháp luật Y tế & Quảng cáo Việt Nam (Luật Quảng cáo, NĐ 15/2018, TT 09/2015) cùng Google YMYL & YouTube. Có thể bấm '🔄 Cập nhật chuẩn ngay' ở thanh trạng thái.",
          },
          {
            heading: "Chèn ảnh AI 1-click & Viết lại toàn bài theo chuẩn đề nghị",
            body: "Ở cột Bộ ảnh AI bên trái, bấm '📥 Chèn vào con trỏ' để chèn ảnh đúng vị trí con trỏ, '⭐' đặt làm bìa, hoặc '🖼️ Tự chèn bộ ảnh vào bài'. Ngay dưới khung biên tập có bảng '✨ Viết lại toàn bài theo chuẩn đề nghị' (chọn preset hoặc nhập chuẩn riêng) để viết lại toàn bài từ nội dung đang review + giữ bộ ảnh AI của bài, kèm nút '↩️ Hoàn tác bản trước'.",
          },
        ],
      },
      {
        id: "categories-manager",
        title: "3. Quản lý Danh mục Sản phẩm & Chuyên mục toàn diện (/admin/categories/)",
        badge: "Mới",
        items: [
          {
            heading: "Bật/Tắt đa vị trí (Menu, Trang chủ, Footer, Tạm ẩn) & Sắp xếp ↑/↓",
            body: "Sắp xếp thứ tự bằng nút ↑/↓, tự động tạo slug tiếng Việt, chọn nơi hiển thị (Menu Sản phẩm, Trang chủ, Footer) hoặc Tạm ẩn danh mục rồi bấm '💾 Lưu tất cả thay đổi' một lần.",
          },
          {
            heading: "Xem nhanh & Chuyển SP/Bài viết hàng loạt + SEO Danh mục",
            body: "Bấm vào số '📦 X SP' hoặc '📝 X bài' để xổ danh sách bên trong, tick chọn nhiều mục để chuyển sang danh mục khác (hoặc '? Chưa phân loại'). Bấm '📝 SEO & Mô tả' để nhập Meta Title và đoạn giới thiệu đầu trang danh mục.",
          },
        ],
      },
      {
        id: "videos-manager",
        title: "4. Thư viện Video YouTube & Đồng bộ tự động (/admin/videos/)",
        badge: "Mới",
        items: [
          {
            heading: "Thanh Đồng bộ gọn & Thêm nhanh nhiều link",
            body: "Khối Đồng bộ YouTube thu gọn thành 1 dòng (tự bung khi có video chờ duyệt), có nút '🔍 Quét kênh ngay'. Bấm '🎬 + Thêm nhanh Video từ YouTube' để dán hàng loạt link YouTube.",
          },
          {
            heading: "Sửa nhanh từng video",
            body: "Danh sách hiển thị gọn thumbnail, tiêu đề và chuyên đề (bấm chuyên đề để lọc). Cần chỉnh sửa tiêu đề, thứ tự hoặc mô tả thì bấm '✏️ Sửa nhanh thông tin video' ngay dưới thẻ.",
          },
        ],
      },
      {
        id: "documents-manager",
        title: "5. Kho Tài liệu, Slide & Khách mở khoá (/admin/documents/)",
        badge: "Mới",
        items: [
          {
            heading: "2 Tab tách bạch & Bộ lọc 1 chạm",
            body: "Tab '📚 Kho Tài liệu & Sách' dùng lọc nhanh theo Định dạng (PDF/Word/Slide/Sách), Cơ chế tải (Miễn phí/Khảo sát/Tặng kèm/Trả phí/Affiliate) hoặc bấm thẳng vào tên thư mục Drive. Tab '📋 Khách hàng Khảo sát / Mở khoá' hiển thị riêng danh sách Leads thu được.",
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
    id: "blocks",
    routePrefix: "/admin/blocks/",
    icon: "🧩",
    label: "Block thường dùng (Content Blocks)",
    topics: [
      {
        id: "blocks-zones",
        title: "1. Đặt Block tự động vào 10 vị trí trên Website",
        items: [
          {
            heading: "Vị trí tự động (BlockZone) & Shortcode",
            body: "Mỗi Block có thể gắn vào home_top, home_bottom, post_top, post_middle (sau H2 thứ 2), post_bottom, post_sidebar, product_top, product_bottom, product_sidebar hoặc chèn tay bằng [[block:slug]].",
          },
        ],
      },
    ],
  },
  {
    id: "qr",
    routePrefix: "/admin/qr/",
    icon: "📱",
    label: "QR Code Động (QR_Block)",
    topics: [
      {
        id: "qr-concept",
        title: "1. QR Code Động hoạt động thế nào & Tại sao nên dùng?",
        badge: "Cơ bản",
        items: [
          {
            heading: "In 1 lần — Đổi link đích mãi mãi",
            body: "Mỗi mã QR được gắn một đường dẫn trung gian cố định dạng /q/<slug>. Khi khách quét mã QR (trên web, hộp hàng hay tờ rơi), hệ thống tự cộng +1 lượt quét rồi chuyển ngay đến Link đích bạn cấu hình.",
          },
          {
            heading: "Không bao giờ phải in lại tem/bao bì",
            body: "Ví dụ: bạn in mã QR lên hộp Gạo Lứt trỏ về link khuyến mãi tháng 11. Sang tháng 12, chỉ cần vào /admin/qr/ sửa lại Link đích mới và bấm Lưu — toàn bộ hộp hàng đã in vẫn quét ra đúng trang mới.",
          },
        ],
      },
      {
        id: "qr-create",
        title: "2. Cách Tạo mới & Cấu hình từng bước (+ Tạo QR Code mới)",
        badge: "Mới",
        items: [
          {
            heading: "Bước 1: Tên riêng, Mã định danh (slug) & Link đích",
            body: "Bấm '+ Tạo QR Code mới'. Nhập Tên riêng dễ nhớ (VD: QR Tư vấn Zalo), Link đích (VD: https://zalo.me/... hoặc /san-pham/...). Mã định danh (slug) tự tạo từ tên hoặc bạn tự đặt ngắn gọn không dấu.",
          },
          {
            heading: "Bước 2: Màu sắc, Kiểu khung & Chú thích kêu gọi",
            body: "Chọn màu mã QR (mặc định xanh đậm #14532d dễ quét nhất), kiểu khung (Xanh Thực dưỡng, Vàng Ấm Áp, Xanh Dương, Trắng Xám) và viết câu chú thích ngắn dưới mã QR (VD: 'Quét để đặt hàng nhanh / Nhận tài liệu').",
          },
          {
            heading: "Bước 3: Chọn Vị trí hiển thị tự động trên Website",
            body: "Tích chọn nơi muốn QR tự hiện: Đầu/Giữa/Cuối bài viết, Đầu/Cuối mô tả sản phẩm, Trang chủ, Khung Video Thư viện, hoặc Huy hiệu QR nhỏ ngay trên ảnh sản phẩm/bài viết. Nếu chỉ muốn tự chèn ở vài chỗ, chọn 'Chỉ chèn thủ công [[qr:slug]]'.",
          },
          {
            heading: "Bước 4 (Tùy chọn): Chỉ định bài viết / sản phẩm cụ thể",
            body: "Nếu muốn mã QR chỉ xuất hiện ở 1–2 sản phẩm hoặc bài viết nhất định, tích chọn chúng trong danh sách mục tiêu bên dưới trước khi bấm Lưu.",
          },
        ],
      },
      {
        id: "qr-use",
        title: "3. Cách nhúng vào Bài viết, In ấn bao bì & Sửa nhanh Link đích",
        badge: "Mới",
        items: [
          {
            heading: "Chèn vào Bài viết / Mô tả sản phẩm / Block",
            body: "Trong trình soạn thảo nội dung, bấm nút '📱 + Chèn QR Code' để chọn mã QR hoặc gõ trực tiếp [[qr:slug]] vào vị trí mong muốn.",
          },
          {
            heading: "Tải ảnh Vector (SVG) để in hộp hàng & tờ rơi",
            body: "Ở danh sách /admin/qr/, bấm nút '📥 Tải SVG' bên dưới ảnh xem trước. File SVG phóng to bao nhiêu cũng không bị mờ/vỡ nét khi gửi nhà in.",
          },
          {
            heading: "Đổi nhanh Link đích & Xem thống kê quét",
            body: "Ngay tại danh sách /admin/qr/, sửa thẳng ô Link đích rồi bấm Lưu nhanh, bật/tắt trạng thái hoặc theo dõi badge '👁️ X quét' để biết kênh/tờ rơi nào hiệu quả nhất.",
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
            heading: "Cài đặt chung & SMTP Gmail (/admin/settings/)",
            body: "Cấu hình tên shop, hotline, widget Zalo/Messenger nổi, email nhận đơn mới và tài khoản SMTP Gmail (Host: smtp.gmail.com, Port: 465, dùng Mật khẩu ứng dụng 16 ký tự từ Google Security → 2-Step Verification → App Passwords). Bấm '✉ Lưu & Gửi email thử' để kiểm tra ngay.",
          },
          {
            heading: "Hệ thống SEO tổng thể (SERP Preview + JSON-LD Schema)",
            body: "Ngoài /admin/sitemaps/, mỗi Sản phẩm (/admin/products/[id]/) và Bài viết (/admin/posts/[id]/) đều có hộp '🔍 Tối ưu SEO Google' chấm điểm 0–100, tự gợi ý tiêu đề/mô tả chuẩn độ dài và tự xuất Schema.org Product/Article JSON-LD ra trang ngoài.",
          },
        ],
      },
      {
        id: "frontend-edit-mode",
        title: "2. Chỉnh sửa trực tiếp ngoài Frontend & Chuyển đổi chế độ xem",
        badge: "Mới",
        items: [
          {
            heading: "Nút Sửa nhanh theo phân quyền ngay ngoài trang khách",
            body: "Khi đang đăng nhập tài khoản quản trị, các trang Sản phẩm, Bài viết, Danh mục, Trang tĩnh, Block, Flash Sale, Video, Tài liệu, Footer và Tư vấn AI sẽ hiện nút '✏️ Sửa' tương ứng đúng với quyền của tài khoản (Super Admin / Admin / Editor / Bán hàng).",
          },
          {
            heading: "Chuyển đổi qua lại: Chế độ Quản trị ↔ Xem như User thường",
            body: "Trên thanh công cụ Quản trị trên cùng của Frontend, bấm nút '👁️ Đang bật nút Sửa · Chuyển sang Xem như User' để ẩn toàn bộ nút sửa và kiểm tra giao diện y hệt khách hàng; bấm pill 'Bật lại Quản trị' ở góc dưới trái để khôi phục bất kỳ lúc nào.",
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
  if (path.startsWith("/admin/qr/")) return "qr";
  if (path.startsWith("/admin/sitemaps/") || path.startsWith("/admin/themes/")) return "system-seo";
  return "dashboard";
}
