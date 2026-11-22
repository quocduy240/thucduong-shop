import fs from "node:fs";
import path from "node:path";

const SCRATCH_DIR = "C:\\Users\\Vinh\\.gemini\\antigravity\\brain\\0a78908d-7a2d-4b64-9955-1e20fbf850a3\\scratch";

// Helper constructors adhering strictly to gdocs/references/styling.md & batch_operations.md
const defaultStyle = () => ({
  op: "set-default-style",
  font_family: "Roboto",
  font_size: 11,
  text_color: "#202124",
  line_spacing: 115,
});

const hTitle = (text) => ({
  op: "heading",
  text,
  level: "TITLE",
  font_family: "Roboto",
  font_size: 28,
  bold: true,
  text_color: "#137333",
  space_below: 4,
});

const h2 = (text) => ({
  op: "heading",
  text,
  level: "2",
  font_family: "Roboto",
  font_size: 18,
  bold: true,
  text_color: "#137333",
  space_above: 20,
  space_below: 6,
});

const h3 = (text) => ({
  op: "heading",
  text,
  level: "3",
  font_family: "Roboto",
  font_size: 13.5,
  bold: true,
  text_color: "#065a82",
  space_above: 13,
  space_below: 4,
});

const p = (text, extra = {}) => ({
  op: "append",
  text,
  font_family: "Roboto",
  font_size: 11,
  text_color: "#202124",
  alignment: "START",
  space_below: 6,
  ...extra,
});

const rich = (runs, extra = {}) => ({
  op: "rich-text",
  font_family: "Roboto",
  font_size: 11,
  text_color: "#202124",
  space_below: 5,
  runs: runs.map((r) => ({
    font_family: r.font_family ?? "Roboto",
    bold: r.bold ?? false,
    italic: r.italic ?? false,
    text_color: r.text_color ?? "#202124",
    ...r,
  })),
  ...extra,
});

const bulletRuns = (runs, spaceAbove = 2, spaceBelow = 2) =>
  rich(runs, {
    bullet_preset: "BULLET_DISC_CIRCLE_SQUARE",
    space_above: spaceAbove,
    space_below: spaceBelow,
  });

const labelBullet = (label, labelColor, text, spaceAbove = 2, spaceBelow = 3) =>
  bulletRuns(
    [
      { text: label + ": ", bold: true, text_color: labelColor },
      { text, bold: false, italic: false, text_color: "#202124" },
    ],
    spaceAbove,
    spaceBelow,
  );

const bulletList = (items) =>
  items.map((text, idx) => ({
    op: "bullet-list",
    text,
    font_family: "Roboto",
    font_size: 11,
    text_color: "#202124",
    space_above: idx === 0 ? 6 : 2,
    space_below: idx === items.length - 1 ? 8 : 2,
  }));

const callout = (prefix, body, bg = "#e6f4ea", prefixColor = "#137333") =>
  rich(
    [
      { text: prefix + " ", bold: true, text_color: prefixColor },
      { text: body, bold: false, italic: false, text_color: "#202124" },
    ],
    {
      paragraph_bg_color: bg,
      font_size: 10.5,
      space_above: 6,
      space_below: 8,
    },
  );

const figCaption = (text) => ({
  op: "append",
  text,
  font_family: "Roboto",
  font_size: 10.5,
  bold: true,
  text_color: "#137333",
  space_above: 8,
  space_below: 4,
});

const table = (tableData, extra = {}) => ({
  op: "insert-table",
  table_data: tableData,
  table_header_bg_color: "#e6f4ea",
  table_header_text_color: "#137333",
  table_header_bold: true,
  table_font_family: "Roboto",
  table_font_size: 9.5,
  table_border_color: "#dadce0",
  table_border_width: 0.5,
  ...extra,
});

const codeLines = (lines) =>
  lines.map((line, i) => ({
    op: "append",
    text: line,
    font_family: "Roboto Mono",
    font_size: 9,
    text_color: "#37474f",
    paragraph_bg_color: "#f5f5f5",
    space_above: i === 0 ? 4 : 0,
    space_below: i === lines.length - 1 ? 8 : 0,
  }));

// =========================================================================
// BATCH 1: Title, Metadata, Sections 1, 2, 3
// =========================================================================
const batch1 = [
  defaultStyle(),
  hTitle("Báo cáo Phân tích Kỹ thuật Toàn diện Hệ thống Thực Dưỡng Phúc Thọ (thucduong-shop)"),
  rich(
    [
      { text: "Hệ thống: ", bold: true, text_color: "#137333" },
      { text: "thucduong-shop (thucduongshop.duyvo.win)  •  ", bold: false },
      { text: "Phiên bản mã nguồn: ", bold: true, text_color: "#137333" },
      { text: "Commit 557fbf9 (110 commits)  •  ", bold: false },
      { text: "Ngày lập: ", bold: true, text_color: "#137333" },
      { text: "22/11/2026  •  ", bold: false },
      { text: "Quy mô: ", bold: true, text_color: "#137333" },
      { text: "293 tệp, 65.234 dòng mã", bold: false },
    ],
    { font_size: 10, italic: true, text_color: "#5f6368", space_below: 8 },
  ),
  { op: "horizontal-rule" },

  // SECTION 1
  h2("1. Tóm tắt Điều hành & Bối cảnh Tiến hóa Hệ thống"),
  p(
    "Dự án thucduong-shop khởi nguồn là một bản dựng thử (prototype) chạy cục bộ bằng Next.js 16 và node:sqlite (như vẫn còn mô tả trong README.md và AGENTS.md) nhằm đánh giá phương án chuyển đổi website thucduongphuctho.net từ nền tảng SaaS LoveItop sang một kiến trúc tự chủ hoàn toàn. Qua 110 commit phát triển liên tục đến trạng thái HEAD 557fbf9, hệ thống đã lột xác khỏi quy mô bản mẫu ban đầu để trở thành nền tảng thương mại điện tử, xuất bản nội dung chuyên sâu, bán lẻ đa kênh và tư vấn y khoa ứng dụng AI phục vụ vận hành thực tế cho Thực Dưỡng Phúc Thọ (HKD Cửa Hàng Phúc Thọ, GPKD 089185004882, địa chỉ tại KDC Bình Hưng, xã Bình Hưng, TP.HCM) trên tên miền chính thức https://thucduongshop.duyvo.win.",
  ),
  p(
    "Điểm chuyển dịch kiến trúc quan trọng nhất diễn ra từ commit cf9acf4 khi toàn bộ tầng dữ liệu được chuyển từ SQLite cục bộ sang Cloudflare D1 và ứng dụng được đóng gói chạy trực tiếp trên Cloudflare Workers (workerd) thông qua bộ chuyển đổi @opennextjs/cloudflare. Toàn bộ tệp tin mã nguồn được kiểm đếm tự động tại workspace hiện đạt 293 tệp với 65.234 dòng mã (không tính thư mục node_modules, .next, .open-next, public/uploads, data và tệp package-lock.json). Hơn 56,5% khối lượng mã nằm ở tầng nghiệp vụ lõi (lib/: 18.496 dòng) và giao diện quản trị (components/admin/: 18.393 dòng), phản ánh độ phức tạp thực tế của các phân hệ POS, đồng bộ KiotViet, CRM 360 độ, Loyalty đa tầng và hệ sinh thái AI tuân thủ pháp luật.",
  ),
  callout(
    "TLDR:",
    "thucduong-shop là một Edge Serverless Monolith triển khai trên Cloudflare Workers + D1 + KV + (tùy chọn) R2. Hệ thống giữ nguyên 100% sơ đồ URL và API giỏ hàng/thanh toán của nền tảng LoveItop cũ để bảo toàn SEO, đồng thời tích hợp trọn vẹn chuỗi nghiệp vụ bán lẻ POS/KiotViet, chăm sóc khách hàng RFM, tích điểm đổi quà và quy trình AI y khoa tuân thủ NĐ 15/2018/NĐ-CP và Google YMYL.",
    "#e6f4ea",
    "#137333",
  ),
  figCaption("Hình 2. Phân bổ Quy mô Mã nguồn và Tỷ trọng Các Phân hệ trong thucduong-shop"),
  p(
    "Bảng dưới đây tổng hợp số liệu đo đạc trực tiếp trên từng phân hệ thư mục của mã nguồn, giúp đánh giá mức độ đầu tư kỹ thuật và ranh giới trách nhiệm giữa các lớp kiến trúc.",
  ),
  table([
    ["Phân hệ / Thư mục", "Số tệp", "Số dòng mã (LOC)", "Tỷ trọng", "Vai trò & Nội dung chính"],
    ["lib/ (Core & Domain Logic)", "57", "18.496", "28,4%", "Truy vấn D1, Bảo mật, Loyalty, CRM, KiotViet, Retail Ops, AI Gateway, Importers"],
    ["components/admin/ (Giao diện Admin)", "37", "18.393", "28,2%", "POS, Bảng SP & In A5 KiotViet, CRM Dashboard, Loyalty Admin, Importer Studio"],
    ["components/ (Giao diện Storefront)", "39", "9.681", "14,8%", "Header, Mega Menu, Flash Sale, Quick Consult, Video/Doc Library, MemberPortal"],
    ["app/admin/ (Trang & Export Admin)", "39", "7.576", "11,6%", "39 trang quản trị, Kho vận 5 tab, Flash Sale 3 tab, Xuất CSV đối soát & KiotViet"],
    ["app/api/admin/ (Admin & AI API)", "26", "3.722", "5,7%", "AI Rewrite, Image Edit, Mindmap, Idle Workers, Lab OCR, KiotViet Excel Import"],
    ["app/ (Trang Storefront)", "28", "2.052", "3,1%", "Trang chủ, Catalog, Route động 3 cấp, Canh Dưỡng Sinh, Cart/Checkout, Sitemap"],
    ["app/admin/_actions/ (Server Actions)", "9", "1.905", "2,9%", "9 module Server Actions kiểm tra RBAC: auth, catalog, content, orders, retail..."],
    ["app/api/ (Public, Webhook & Cron)", "27", "1.394", "2,1%", "Checkout nguyên tử, Coupon, Member Auth, Loyalty, Media Serving, Health, 3 Cron"],
    ["scripts/ (CLI & Migration Scripts)", "7", "802", "1,2%", "Crawl LoveItop & Haravan, Export D1, Verify Backup, Provinces v2, OpenNext patch"],
    ["Tests, CI/CD, SQL, Docs & Skills", "24", "1.213", "1,9%", "8 tệp unit test (450 LOC), 3 GH Workflows (202 LOC), 2 migrations, cấu hình & docs"],
    ["TỔNG CỘNG TOÀN DỰ ÁN", "293", "65.234", "100,0%", "Đo kiểm trên trạng thái HEAD 557fbf9 (loại trừ thư mục build & assets nhị phân)"],
  ]),
  p(
    "Số liệu cho thấy tầng giao diện quản trị và nghiệp vụ lõi chiếm tỷ trọng lớn gấp hơn 3 lần tầng giao diện bán hàng Storefront, khẳng định trọng tâm kiến trúc đã dịch chuyển mạnh sang tự động hóa vận hành cửa hàng và tối ưu quy trình biên tập nội dung bằng AI.",
  ),

  // SECTION 2
  h2("2. Phân tích Yêu cầu Hệ thống (Requirements Specification)"),
  p(
    "Hệ thống được thiết kế để giải quyết song song hai bài toán: di chuyển an toàn một website bán hàng và kiến thức thực dưỡng lâu năm mà không làm đứt gãy lưu lượng tìm kiếm tự nhiên, đồng thời khắc phục hoàn toàn sự rời rạc dữ liệu giữa bán hàng online, bán tại quầy (POS), phần mềm KiotViet và quy trình tư vấn chăm sóc khách hàng dài hạn.",
  ),
  labelBullet(
    "Mục tiêu (Goal)",
    "#137333",
    "Tái lập chính xác cấu trúc URL (.html và trailing slash /) cùng các endpoint giỏ hàng/checkout của LoveItop, cung cấp hệ sinh thái nội dung đa phương tiện (bài viết, 318 video YouTube, 12 tài liệu PDF/sách), hợp nhất dữ liệu khách hàng đa kênh và triển khai trợ lý AI y khoa có kiểm soát pháp lý.",
  ),
  labelBullet(
    "Ngoài phạm vi (Non-Goal)",
    "#D93025",
    "Chưa tích hợp cổng thanh toán trực tuyến tự động gạch nợ (VNPay/MoMo webhook), chưa có hệ thống Affiliate đa cấp, chưa hỗ trợ đặt mật khẩu khôi phục qua OTP SMS/Email cho khách hàng cuối, và chưa kích hoạt Cloudflare Cron Triggers trực tiếp trong wrangler.jsonc.",
  ),
  p(
    "Các yêu cầu chức năng (Functional Requirements) được phân chia thành 8 nhóm nghiệp vụ rõ ràng, tương ứng trực tiếp với các route và module triển khai trong mã nguồn.",
  ),
  table([
    ["Mã nhóm", "Nhóm Yêu cầu Chức năng", "Tính năng Chi tiết đã Triển khai", "Điểm vào Chính trong Hệ thống"],
    ["FR-01", "Storefront & Thương mại điện tử", "Trang chủ theo danh mục; lọc đa chiều (hãng, xuất xứ, giá, tồn kho); Landing Canh Dưỡng Sinh; Flash Sale UTC+7; Giỏ cookie; Checkout trừ kho nguyên tử + VietQR BIDV; Tra cứu đơn.", "/, /san-pham/, /canh-duong-sinh/, /cart, /checkout, /tra-cuu-don-hang/"],
    ["FR-02", "CMS, Thư viện Media & Marketing", "Bài viết 3 cấp kèm combo mua chung; 318 Video YouTube tự đồng bộ RSS; 12 Tài liệu với 5 cơ chế mở khóa; BlockZone 10 vị trí đệ quy; QR động /q/[slug]; MXH /go/social/[id].", "/[section]/[slug]/[post], /thu-vien/*, /q/[slug], /go/social/[id]"],
    ["FR-03", "Bán lẻ POS, Kho vận & Sổ quỹ", "Bán nhanh tại quầy POS; In hóa đơn KiotViet (A5/A4/K80, 16 block, chữ Việt); Thẻ kho 7 lý do; Trả hàng hoàn kho TH-; Sổ quỹ 3 Quỹ (Tiền mặt, Ngân hàng, KiotViet); Báo cáo EOD lãi gộp COGS.", "/admin/pos/, /admin/orders/[id]/, /admin/inventory/"],
    ["FR-04", "Tích hợp KiotViet Đa phương thức", "Kết nối OAuth2 đẩy đơn Web sang KiotViet & kéo tồn kho về; Webhook cập nhật tồn kho; Import Excel .xlsx/.csv thuần TS; Xuất CSV đơn chuẩn KiotViet.", "/admin/kiotviet/, /api/kiotviet/webhook, /admin/orders/export-kiotviet"],
    ["FR-05", "CRM 360 độ & Tự động hóa", "Gộp hồ sơ theo SĐT/Email; Phân khúc RFM 5 nhóm; Mẫu tin Zalo 1-Click; Lịch hẹn gọi lại & badge nhắc việc; Tag bệnh lý; Bảng hiệu suất tư vấn viên; Hàng đợi Email +3 và +25 ngày.", "/admin/crm/, /api/admin/crm, /api/cron/crm-automation"],
    ["FR-06", "Loyalty & Gamification", "4 hạng thành viên (Đồng, Bạc, Vàng, Kim cương); Hợp nhất điểm khách vãng lai; 10 nguồn tích điểm (mua hàng, điểm danh, đọc bài >=70%, đánh giá); Kho quà & đổi voucher/quà hiện vật nguyên tử.", "/thanh-vien/, /admin/loyalty/, /api/loyalty/*"],
    ["FR-07", "Trợ lý AI & Tuân thủ Y khoa", "Tư vấn nhanh 3 bước + BMI châu Á + Hồ sơ PDF /ho-so-tu-van/[token]/; Đọc phiếu xét nghiệm AI (Ảnh/PDF + giọng nói); Nhập & viết lại bài/SP bằng AI; Bộ lọc Luật VN & YMYL.", "/tu-van-nhanh/, /admin/quick-consult/, /admin/lab-analysis/, /admin/*/import/"],
    ["FR-08", "Quản trị, RBAC & Công cụ Migration", "Phân quyền 4 vai trò x 13 miền hành động; Sửa nhanh trực tiếp ngoài Frontend; Sitemap XML/HTML & SEO 0-100 điểm; 3 bộ theme có chế độ chữ to 19px; 7 script CLI crawl dữ liệu.", "/admin/*, /api/admin/staff, /sitemap.xml, /so-do-trang.html, scripts/*.mjs"],
  ]),
  p(
    "Về mặt yêu cầu phi chức năng (Non-Functional Requirements), hệ thống đặt trọng tâm vào 5 trụ cột vận hành trên môi trường Edge và nhóm khách hàng đặc thù của ngành thực dưỡng:",
  ),
  ...bulletList([
    "Hiệu năng & Tương thích Edge (workerd): Không sử dụng native C++ bindings (loại bỏ better-sqlite3, sharp) và không đưa thư viện phân tích DOM nặng như cheerio vào runtime API routes. Mọi tác vụ xử lý HTML, ZIP Excel và SMTP TLS đều viết bằng TypeScript thuần hoặc API tích hợp sẵn của Node compat.",
    "Trải nghiệm Người cao tuổi & Khả năng tiếp cận: Hệ thống theme tích hợp sẵn chế độ 'Người Lớn Tuổi' (19px, chiều cao dòng 1.8, nền giấy ấm #fffdf5, tương phản cao) được nạp đồng bộ trước khi render HTML để tránh nhấp nháy giao diện (Zero-FOUC), đi kèm nhập liệu bằng giọng nói tiếng Việt (vi-VN) ở widget hỏi nhanh và phòng xét nghiệm.",
    "An toàn Dữ liệu & Tuân thủ YMYL: Mọi bài viết nhập qua AI phải đi qua bộ kiểm duyệt câu từ cấm theo Luật Quảng cáo, Nghị định 15/2018/NĐ-CP, Thông tư 09/2015/TT-BYT, Google YMYL và chính sách y tế YouTube, kèm khối miễn trừ trách nhiệm y khoa.",
    "Độ bền & Khả năng Phục hồi: Trừ kho và đổi quà dùng điều kiện nguyên tử SQL kèm cơ chế bù hoàn; tác vụ AI dài dùng khóa lease D1 (35-40 giây) chống kẹt worker; cơ sở dữ liệu D1 được sao lưu tự động mỗi ngày lúc 03:00 sáng giờ Việt Nam và kiểm chứng toàn vẹn 9 bảng cốt lõi.",
  ]),

  // SECTION 3
  h2("3. Kiến trúc Tổng thể Hệ thống (System Architecture)"),
  p(
    "thucduong-shop áp dụng kiến trúc Edge Serverless Monolith: toàn bộ giao diện người dùng (Storefront), cổng quản trị (Admin), lớp truy vấn dữ liệu, các API tích hợp và hàng đợi công việc AI đều đóng gói chung thành một Cloudflare Worker duy nhất mang tên thucduong-shop (entry point .open-next/worker.js). Cách tiếp cận này loại bỏ hoàn toàn chi phí vận hành máy chủ riêng hay container Docker ở production, đồng thời tận dụng độ trễ thấp tại các điểm biên (Edge PoP) của Cloudflare.",
  ),
  figCaption("Hình 1. Kiến trúc Tổng thể Hệ thống Thực Dưỡng Phúc Thọ trên Hạ tầng Cloudflare"),
  p(
    "Sơ đồ trên minh họa luồng đi của một yêu cầu từ tầng khách hàng đi qua lớp bảo vệ biên (Cloudflare WAF, TLS, Security Headers và phân phối tài sản tĩnh ASSETS), vào môi trường thực thi workerd với Next.js 16.4.6 App Router, tương tác với tầng lưu trữ Cloudflare D1, Cloudflare KV và tùy chọn R2, rồi kết nối ra các cổng dịch vụ ngoài qua HTTPS hoặc TCP TLS. Bảng sau liệt kê chính xác ngăn xếp công nghệ và các Cloudflare Bindings đã cấu hình trong package.json, wrangler.jsonc và open-next.config.ts.",
  ),
  table([
    ["Thành phần / Lớp", "Công nghệ / Binding", "Phiên bản / Định danh", "Vai trò Cụ thể trong Hệ thống"],
    ["Framework Web & UI", "Next.js App Router + React", "next 16.4.6 · react 19.3.0", "SSR theo yêu cầu, Server Actions, Route Handlers, Turbopack + Tailwind CSS 4.3.3"],
    ["Runtime Adapter", "@opennextjs/cloudflare + Wrangler", "1.20.17 · wrangler 4.164.0", "Biên dịch Next.js sang Worker bundle (.open-next/worker.js), compatibility_date 2025-05-05"],
    ["Ngôn ngữ & Node Runtime", "TypeScript + Node.js", "TS 5.x (strict) · Node 24 (.nvmrc)", "Bật cờ nodejs_compat và global_fetch_strictly_public trên workerd"],
    ["Cơ sở Dữ liệu Chính", "Cloudflare D1 (Binding: DB)", "thucduong-shop-db (111f93d1-...)", "Cơ sở dữ liệu SQLite phân tán lưu trữ 48 bảng nghiệp vụ, truy vấn qua lib/db.ts"],
    ["Bộ nhớ đệm Tầng Ứng dụng", "Cloudflare KV (NEXT_INC_CACHE_KV)", "ID: 7d2bb67691374880ae6f015b5775449d", "Incremental Cache + Regional Cache (mode long-lived, TTL 300s) tại open-next.config.ts"],
    ["Tài sản Tĩnh & Self-Ref", "ASSETS + WORKER_SELF_REFERENCE", ".open-next/assets · thucduong-shop", "Phân phối bundle JS/CSS, ảnh public/uploads/* và tự gọi nội bộ trong OpenNext"],
    ["Lưu trữ Media Đám mây", "Cloudflare R2 (MEDIA_BUCKET)", "Tùy chọn (chưa khai báo ở wrangler)", "Lưu ảnh/PDF tải lên; khi chưa gắn bucket sẽ tự động fallback sang bảng D1"],
    ["Thư viện Phụ trợ", "qrcode (prod) · cheerio (devOnly)", "qrcode ^1.5.4 · cheerio ^1.2.0", "qrcode sinh mã SVG động cho /api/qr/[slug]; cheerio chỉ chạy ở script CLI offline"],
  ]),
  p(
    "Trong quá trình đọc mã nguồn, có thể nhận diện 4 Quyết định Kiến trúc Cốt lõi (Architecture Decision Records) định hình cách đội ngũ kỹ thuật kiểm soát độ ổn định hệ thống trên Cloudflare Workers:",
  ),
  ...bulletList([
    "ADR-01 (Không dùng ORM, không native module): Thay vì Prisma hay better-sqlite3 vốn dễ vướng giới hạn kích thước bundle hoặc lỗi biên dịch C++ trên workerd, hệ thống dùng một lớp bao siêu mỏng tại lib/db.ts (84 dòng) gọi trực tiếp env.DB.prepare().bind().all/first/run/batch, trải phẳng hàng kết quả (spread object) để truyền an toàn qua ranh giới Server-Client Component.",
    "ADR-02 (Tách biệt Runtime Pure TypeScript khỏi CLI Scraper): Thư viện cheerio được giữ ở devDependencies chỉ phục vụ scripts/import-post.mjs và scripts/import-products.mjs chạy trên Node cục bộ. Toàn bộ route xử lý HTML, RSS YouTube và giải nén file Excel .xlsx trên Cloudflare Workers được viết lại hoàn toàn bằng Regex, XML parser nhẹ và node:zlib.inflateRawSync.",
    "ADR-03 (Hợp nhất AI Gateway & Giảm thiểu Token trước khi gọi LLM): Thay vì gửi nguyên khối HTML CKEditor hoặc ảnh thô lên Gemini, lớp tiền xử lý tại server bóc tách CSS, script, số điện thoại và tên miền nguồn trước, đồng thời lọc ảnh qua bước phân loại nhẹ rồi mới gọi model sinh ảnh khi thực sự phát hiện watermark.",
    "ADR-04 (Xử lý Tác vụ Dài bằng Máy trạng thái Chia bước + Khóa Lease D1): Do giới hạn thời gian thực thi HTTP của Cloudflare Workers, mọi quy trình nặng (nhập bài viết 4 ảnh AI, làm sạch hàng loạt 20 sản phẩm, phân tích xét nghiệm) đều không chạy một lèo trong một request mà lưu từng bước (step_cursor) vào D1 kết hợp khóa lease thời hạn 35-40 giây.",
  ]),
];

// =========================================================================
// BATCH 2: Sections 4, 5, 6
// =========================================================================
const batch2 = [
  defaultStyle(),

  // SECTION 4
  h2("4. Thiết kế Cơ sở Dữ liệu & Mô hình Thực thể (Database Design & ERD)"),
  p(
    "Lược đồ cơ sở dữ liệu của thucduong-shop bao gồm tổng cộng 48 bảng thực thể phủ khắp 6 miền nghiệp vụ. Một đặc điểm thiết kế nổi bật là mô hình tự tiến hóa lược đồ theo nhu cầu (On-demand Additive Schema Migration): bên cạnh tập bảng nền tảng ban đầu và 2 tệp migration chính thức (migrations/0001_schema_sync.sql và 0002_performance_indexes.sql), nhiều module miền tự trang bị các hàm bảo đảm bảng và cột chạy lười (lazy initialization) kèm ghi nhớ promise theo vòng đời isolate.",
  ),
  p(
    "Cụ thể, các hàm như ensureAdminSchema() (lib/auth.ts), ensureRetailOpsSchema() (lib/retail-ops.ts), ensureQrTable() (lib/qr.ts), ensureSeoColumns() (lib/seo.ts), ensureQuickConsultTables() (lib/quick-consult.ts), ensureLabTable() (lib/lab-analysis.ts), ensurePostImportTables() (lib/post-importer.ts), ensureProductImportTables() (lib/product-importer.ts), ensureYoutubeSyncTable() (lib/youtube-sync.ts) và ensureMediaAssetsTable() (lib/media-assets.ts) tự động kiểm tra PRAGMA table_info và thực thi CREATE TABLE IF NOT EXISTS hoặc ALTER TABLE ADD COLUMN khi thiếu cột. Cách làm này giúp mã nguồn tương thích ngược ngay lập tức với các bản dump dữ liệu cũ mà không bị lỗi thiếu cột.",
  ),
  figCaption("Hình 3. Sơ đồ Thực thể Quan hệ Cơ sở Dữ liệu D1 (48 bảng theo 6 miền nghiệp vụ)"),
  p(
    "Để hạn chế tối đa tình trạng quét toàn bảng (full table scan) trên Cloudflare D1 vốn tính phí theo số hàng đọc (rows read), tệp migrations/0002_performance_indexes.sql đã bổ sung 18 chỉ mục ghép (composite indexes) nhắm đúng vào các truy vấn lọc danh mục kèm is_published, đếm bình luận theo product_id, tra cứu đơn hàng theo số điện thoại/trạng thái, dọn dẹp phiên hết hạn và truy vết sổ cái điểm thưởng. Bảng dưới đây phân rã chi tiết danh mục thực thể theo từng miền nghiệp vụ.",
  ),
  table([
    ["Miền Nghiệp vụ", "Số bảng", "Danh sách Bảng & Thực thể", "Khóa chính / Cột Trọng yếu & Mối liên kết"],
    ["1. Danh mục, Sản phẩm & Sale", "5", "product_categories, products, comments, flash_sale_slots, flash_sale_items", "products nối FK category_id; lưu price, sale_price, cost_price, contact_only, kv_code, sku, stock, min_stock, is_published, seo_*; comments nối product_id."],
    ["2. CMS, Thư viện & Marketing", "10", "post_sections, post_categories, posts, pages, content_blocks, videos, youtube_sync_pending, documents, document_leads, qr_codes", "Phân cấp post_sections -> post_categories -> posts; pages khóa kép (grp, slug); documents liên kết bundle_product_id; qr_codes đếm scans tại /q/[slug]."],
    ["3. Đơn hàng, POS, Kho & Quỹ", "9", "provinces, wards, orders, order_items, coupons, inventory_movements, cashbook_entries, suppliers, delivery_partners", "34 provinces -> 3.321 wards; orders lưu 6 trạng thái, vận đơn, kiotviet_order_id; inventory_movements ghi 7 lý do biến động; cashbook_entries tách 3 quỹ."],
    ["4. Quản trị, Member, CRM & Loyalty", "15", "admins, admin_sessions, members, member_sessions, member_profiles, point_transactions, point_rules, reward_catalog, reward_redemptions, referrals, daily_login_streaks, newsletter_subscribers, crm_notes, crm_customer_tags, crm_automation_logs", "member_profiles là thực thể định danh hợp nhất (user_id nullable) kết nối sổ cái point_transactions (idempotent theo source + ref_type + ref_id) và crm_notes/tags."],
    ["5. Hệ sinh thái AI & Nhập liệu", "6", "quick_consultations, quick_consult_cache, lab_analyses, post_import_jobs, product_import_jobs, consultation_requests", "Hàng đợi post/product_import_jobs dùng locked_until (40s/35s); lab_analyses dùng started_at; quick_consult_cache lưu HTML 14 ngày theo SHA-256."],
    ["6. Cấu hình & Media Fallback", "3", "settings, media_files, media_assets", "settings (key/value) chứa hơn 15 cấu hình JSON & khóa API; media_files và media_assets lưu base64 dự phòng khi chưa gắn R2 MEDIA_BUCKET."],
  ]),
  callout(
    "Ghi chú thiết kế dữ liệu:",
    "Hệ thống tồn tại sự song hành có kiểm soát giữa bảng members (cấu trúc ban đầu chỉ cho khách đăng ký) và bảng member_profiles (hỗ trợ cả khách mua vãng lai không tài khoản). Hàm resolveOnLoginOrRegister() và syncLegacyMember() trong lib/loyalty.ts đảm nhận đồng bộ điểm và tự động sáp nhập lịch sử mua hàng khi khách vãng lai đăng ký thành viên.",
    "#e8f0fe",
    "#065a82",
  ),

  // SECTION 5
  h2("5. Thiết kế Storefront, Định tuyến URL, Caching & Kiến trúc SEO"),
  p(
    "Tầng giao diện công khai (Storefront) phải đáp ứng đồng thời hai mục tiêu kỹ thuật khắt khe: duy trì tương thích 100% với cấu trúc URL không đồng nhất của LoveItop (nơi trang danh sách kết thúc bằng dấu gạch chéo, trang bài viết/sản phẩm kết thúc bằng .html, còn giỏ hàng và API không có gạch chéo) và tối ưu hóa tốc độ tải trang trên Edge thông qua bộ nhớ đệm gắn thẻ kết hợp SEO ngữ nghĩa.",
  ),
  figCaption("Hình 4. Định tuyến URL Tương thích LoveItop và Kiến trúc Caching Đa tầng"),
  h3("5.1 Phân giải Định tuyến URL & Các Phân hệ Storefront Nổi bật"),
  p(
    "Tệp next.config.ts thiết lập đồng thời trailingSlash: true và skipTrailingSlashRedirect: true, cho phép Next.js chấp nhận các route đặc biệt như /cart, /checkout hay /api/v2/add-to-cart/[id] mà không ép chuyển hướng 308 gây mất payload POST (riêng các client gọi POST tới API mới vẫn tuân thủ quy ước thêm dấu / ở cuối URL). Toàn bộ việc sinh liên kết nội bộ được tập trung vào đối tượng url trong lib/data.ts để không bao giờ xảy ra lệch đường dẫn giữa các trang.",
  ),
  table([
    ["Mẫu Đường dẫn (URL)", "File Xử lý", "Độ ưu tiên & Logic Phân giải"],
    ["/", "app/page.tsx", "Trang chủ: Banner, lối tắt nhanh, Flash Sale, BlockZone home_top/bottom, 4 SP/danh mục (1 truy vấn ROW_NUMBER() chống N+1), 6 bài mới nhất."],
    ["/san-pham/ & /san-pham/[category]/", "app/san-pham/**/page.tsx", "Danh mục sản phẩm: Sắp xếp ưu tiên Canh Dưỡng Sinh (CDS_FIRST), lọc q/brand/origin/price/sale/stock/sort; ẩn SP khi is_published=0; hiện 'Liên hệ' nếu contact_only=1."],
    ["/san-pham/[category]/[product].html", "app/san-pham/[category]/[product]/page.tsx", "Chi tiết SP: ProductGallery zoom 2.2x, Flash Sale override, JSON-LD Product, đánh giá đã mua hàng, Video YouTube, RecentlyViewed (localStorage 8 SP)."],
    ["/canh-duong-sinh/", "app/canh-duong-sinh/page.tsx", "Landing page riêng cho dòng sản phẩm chủ lực Canh Dưỡng Sinh King Kung (Hòa tan 60 gói & Túi lọc 90 gói) kèm zoom 2.3x."],
    ["/cart -> /checkout -> /checkout/thankyou", "app/cart/**, app/checkout/**", "Giỏ hàng cookie cart (max 999) có thanh freeship 500.000đ; Checkout Tỉnh/Phường v2; Trang cảm ơn hiện ảnh VietQR BIDV 8610312888."],
    ["/tu-van-nhanh/ & /ho-so-tu-van/[token]/", "app/tu-van-nhanh/**, app/ho-so-tu-van/**", "Phễu tư vấn AI 3 bước kèm tính BMI châu Á và trang hồ sơ bệnh nhân in PDF A4 có mã share_token bảo mật."],
    ["/thanh-vien/ & /tra-cuu-don-hang/", "app/thanh-vien/**, app/tra-cuu-don-hang/**", "Cổng thành viên (thẻ hạng, đổi quà, điểm danh, ví voucher, mua lại 1-click) và tra cứu đơn công khai che SĐT."],
    ["/q/[slug] & /go/social/[id]", "app/q/**, app/go/social/**", "Chuyển hướng 302 cho QR động (cộng qr_codes.scans) và nút MXH/Sàn TMĐT (đếm clicks + tự gắn UTM tracking)."],
    ["/[section] (1 cấp động)", "app/[section]/page.tsx", "Nếu kết thúc .html -> tìm trang tĩnh (VD: /gioi-thieu.html); ngược lại -> chuyên mục bài viết (/thuc-duong/); riêng /thu-vien/ mở VideoLibrary."],
    ["/[section]/[slug] (2 cấp động)", "app/[section]/[slug]/page.tsx", "Có .html: ưu tiên trang tĩnh /chinh-sach/*.html trước URL bài viết ngắn. Không .html: tải DocumentLibrary (12 tài liệu, 5 chế độ mở khóa) hoặc VideoLibrary (318 video) + trigger RSS YouTube."],
    ["/[section]/[slug]/[post] (3 cấp chuẩn)", "app/[section]/[slug]/[post]/page.tsx", "URL bài viết chuẩn canonical: xuất JSON-LD Article, chèn tự động Block giữa bài (trước H2 thứ 2), gắn Combo mua chung và ArticleReadTracker (+2 điểm đọc bài)."],
  ]),
  p(
    "Ngoài các trang truyền thống, Storefront sở hữu hệ thống lắp ghép giao diện linh hoạt đáng chú ý. Động cơ Content Block tại lib/blocks.ts hỗ trợ 10 vị trí hiển thị tự động (như post_top, post_middle, product_sidebar, home_bottom) cùng khả năng phân giải đệ quy tối đa 4 tầng lồng nhau cho các mã nhúng [[block:slug]], [[qr:slug]] và [[social:style:group]] có bảo vệ chống vòng lặp vô hạn. Song song đó, AdminThemeStudio cho phép tùy biến 3 bộ giao diện (Chuẩn Thực Dưỡng 16px, Người Lớn Tuổi 19px, Hiện Đại 15px) và FrontendAdminProvider bổ sung thanh công cụ nổi giúp quản trị viên sửa trực tiếp sản phẩm, bài viết hoặc chuyển nhanh sang chế độ 'Xem như User thường' ngay ngoài website.",
  ),
  h3("5.2 Chiến lược Bộ nhớ đệm (Caching) & Kiến trúc SEO"),
  p(
    "Kiến trúc caching kết hợp Cloudflare KV (NEXT_INC_CACHE_KV với withRegionalCache TTL 300 giây trong open-next.config.ts), React cache() và 9 thẻ CACHE_TAGS trong lib/cache-tags.ts (site, categories, products, posts, pages, videos, documents, blocks, flashSale). Tuy nhiên, một điểm kỹ thuật quan trọng cần lưu ý là app/layout.tsx hiện khai báo export const dynamic = 'force-dynamic' để luôn đọc cấu hình Theme và Widget mới nhất từ D1. Vì tệp layout gốc đặt force-dynamic, cấu hình revalidate = 60 hoặc 300 ở cấp trang con (như app/page.tsx hay trang bài viết/sản phẩm) thực chất bị bỏ qua, nhường chỗ cho cơ chế SSR động kết hợp lớp cache dữ liệu unstable_cache cho các bảng ít biến động (settings, danh mục, trang tĩnh, video, tài liệu). Khi Admin lưu thay đổi, hàm invalidateStorefront() sẽ gọi đồng thời revalidateTag(..., 'max') và revalidatePath('/', 'layout').",
  ),
  p(
    "Ở khía cạnh SEO, lib/seo.ts quản lý 3 cột seo_title, seo_description, seo_keywords cho từng sản phẩm và bài viết, hỗ trợ chấm điểm SEO 0-100 và xem trước SERP ngay trong trình biên tập. Trang chi tiết sản phẩm và bài viết canonical đều xuất thẻ OpenGraph, link canonical và dữ liệu có cấu trúc JSON-LD (Product kèm Offer/Availability có tính tới giá Flash Sale, hoặc Article) với ký tự < được mã hóa thành \\u003c để chống tấn công thoát thẻ script. Sơ đồ website được phát sinh động qua /sitemap.xml (lọc chỉ lấy sản phẩm đang công khai và danh mục đang bật), /robots.txt (chặn /admin/, /api/, /cart, /checkout) và sơ đồ HTML /so-do-trang.html.",
  ),

  // SECTION 6
  h2("6. Thiết kế Nghiệp vụ Bán lẻ, POS, KiotViet, CRM 360 & Loyalty"),
  p(
    "Phân hệ vận hành bán lẻ của thucduong-shop biến một cửa hàng web đơn thuần thành hệ thống hợp nhất giữa kênh trực tuyến, bán hàng tại quầy (POS) và quản trị quan hệ khách hàng trọn đời. Toàn bộ vòng đời từ lúc khách bấm đặt hàng cho tới khi ghi sổ quỹ, đồng bộ KiotViet, tích điểm và chăm sóc tái mua được nối thành một chuỗi khép kín.",
  ),
  figCaption("Hình 5. Luồng Checkout Nguyên tử, Vòng đời Đơn hàng, Kho vận POS và KiotViet"),
  h3("6.1 Checkout Nguyên tử, Bán hàng POS, Kho vận & Sổ quỹ 3 Quỹ"),
  p(
    "Điểm chốt chặn an toàn nhất của luồng đặt hàng online tại POST /api/data-checkout nằm ở thao tác trừ kho có điều kiện SQL nguyên tử: UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?. Nếu bất kỳ mặt hàng nào trong giỏ không đủ tồn kho hoặc thao tác ghi batch vào orders/order_items gặp lỗi, hàm restoreDeductedStock() lập tức cộng hoàn lại số lượng đã trừ cho các sản phẩm trước đó. Yêu cầu đặt hàng cũng được bảo vệ bằng Rate Limiter (10 đơn/phút/IP) và kiểm tra khóa chống trùng lặp Idempotency-Key trong bộ nhớ isolate (TTL 10 phút).",
  ),
  p(
    "Sau khi đơn hàng được tạo, bộ máy trạng thái gồm 6 bước (new, confirmed, shipping, done, returned, cancelled) điều phối mọi biến động hậu mãi. Tại /admin/pos/, nhân viên có thể tìm nhanh sản phẩm theo tên hoặc mã SKU, áp dụng chiết khấu trực tiếp bằng tiền mặt và xuất hóa đơn ngay; với đơn thanh toán tiền mặt, chuyển khoản ngân hàng hoặc theo KiotViet, đơn chuyển thẳng sang trạng thái done và tự động tạo phiếu thu vào đúng quỹ tương ứng. Trang /admin/inventory/ gom 5 nghiệp vụ kho vận và tài chính: kiểm kho và cập nhật giá vốn; nhập hàng nhà cung cấp (mã PN-) kèm xuất nội bộ/xuất hủy (mã XNB-/XH-) ghi chi tiết vào thẻ kho inventory_movements (7 mã lý do); quản lý sổ quỹ tách bạch 3 quỹ (Tiền mặt, Chuyển khoản Ngân hàng, Theo KiotViet); danh mục nhà cung cấp và 6 đối tác giao vận; cùng Báo cáo cuối ngày (EOD) tính toán Doanh thu thuần, Giá vốn hàng bán (COGS) và Tỷ suất lãi gộp.",
  ),
  p(
    "Đối với nghiệp vụ in ấn, KiotVietInvoicePrintStudio (lib/invoice-print.ts) cung cấp cấu hình chuẩn KiotViet với 4 khổ giấy (A5 Dọc 148x210mm, A5 Ngang 210x148mm, A4, hóa đơn nhiệt K80), 3 mức cỡ chữ và 16 block bật/tắt linh hoạt (từ logo, mã QR website, thông tin vận đơn, bảng 8 cột hàng hóa, đọc tổng tiền bằng chữ tiếng Việt vndToVietnameseWords(), mã VietQR tự điền số tiền đến khung chữ ký 2 hoặc 3 cột).",
  ),
  h3("6.2 Tích hợp KiotViet Đa phương thức"),
  p(
    "Hệ thống tích hợp sâu với phần mềm KiotViet thông qua 4 kênh song song để thích ứng linh hoạt với hạ tầng cửa hàng:",
  ),
  ...bulletList([
    "Đẩy đơn hàng qua REST API (lib/kiotviet.ts): Sử dụng luồng OAuth2 client_credentials tới https://id.kiotviet.vn/connect/token (cache token trong bộ nhớ tới trước khi hết hạn 60 giây) và gọi https://public.kiotapi.com/orders qua nút đẩy đơn thủ công trên trang chi tiết đơn hàng, lưu ngược lại kiotviet_order_id và kiotviet_code.",
    "Kéo tồn kho & Webhook thời gian thực: Chức năng syncInventoryFromKiotViet() lấy tối đa 100 sản phẩm kèm giá vốn và tồn kho chi nhánh để cân bằng chênh lệch vào thẻ kho; trong khi endpoint POST /api/kiotviet/webhook tiếp nhận thông báo đẩy từ KiotViet để cập nhật tồn kho tự động theo mã kv_code hoặc sku.",
    "Bộ nhập Excel/CSV thuần TypeScript (lib/kiotviet-import.ts): Tự giải nén file .xlsx (định dạng ZIP) bằng node:zlib.inflateRawSync và phân tích xl/sharedStrings.xml + sheet1.xml bằng regex mà không cần thư viện xlsx nặng nề. Hệ thống tự động loại bỏ hàng Dịch vụ, đồng bộ 15 nhóm ngành hàng gợi ý, quy về tồn kho >= 0 và thực thi theo từng batch 40 câu lệnh D1.",
    "Xuất file CSV chuẩn Import KiotViet (/admin/orders/export-kiotviet/): Kết xuất tối đa 500 dòng chi tiết đơn hàng gần nhất kèm UTF-8 BOM và mã SKU để kế toán nhập nhanh vào phần mềm.",
  ]),
  h3("6.3 CRM 360 độ & Tự động hóa Chăm sóc"),
  p(
    "Phân hệ CRM tại lib/crm.ts và /admin/crm/ tổng hợp dữ liệu từ member_profiles, orders, crm_notes, crm_customer_tags và lịch sử đổi quà để tạo hồ sơ 360 độ cho từng khách hàng theo khóa định danh SĐT hoặc Email. Thuật toán classifyRfm() phân loại tự động 5 phân khúc hành vi: Lead chưa mua (0 đơn), Sắp hết sản phẩm (20 đến 45 ngày từ đơn gần nhất), Nguy cơ rời bỏ (trên 45 ngày), Khách VIP (từ 3 đơn hoặc tổng chi >= 3.000.000đ) và Khách mới (dưới 20 ngày). Nhân viên kinh doanh có thể xem cảnh báo lịch hẹn gọi lại đến hạn ngay trên thanh menu, gắn tag bệnh lý/nhu cầu (như #Tieu_duong, #Da_day), sao chép mẫu tin nhắn Zalo đã tự điền sẵn tên sản phẩm cuối và số điểm/mã ưu đãi đang có, theo dõi bảng xếp hạng doanh số/chăm sóc của đội ngũ tư vấn viên, hoặc vận hành hàng đợi tự động hóa gửi hướng dẫn sử dụng (+3 ngày) và nhắc mua lại (+25 ngày).",
  ),
  h3("6.4 Hệ thống Tích điểm & Đổi quà (Loyalty Engine)"),
  p(
    "Cơ chế tích điểm được xây dựng quanh sổ cái point_transactions không thể sửa xóa (append-only ledger) kết hợp bảng hạng thành viên 4 bậc (Đồng: <1.000 điểm trọn đời, hệ số 1.0x; Bạc: >=1.000 điểm, hệ số 1.2x, giảm 3% đơn hàng; Vàng: >=3.000 điểm, hệ số 1.5x, giảm 5%; Kim cương: >=10.000 điểm, hệ số 2.0x, giảm 7%). Điểm mua hàng chỉ được ghi nhận chính thức khi đơn hàng chuyển trạng thái sang done thông qua hook onOrderStatusChanged(), đồng thời mở khóa phần thưởng giới thiệu (+200 điểm người giới thiệu, +100 điểm người được mời) và tự thu hồi điểm nếu đơn hoàn thành bị chuyển sang hủy (cancelled).",
  ),
  table([
    ["Nguồn Tích điểm (PointSource)", "Công thức / Giá trị Mặc định", "Điểm Kích hoạt (Trigger)", "Cơ chế Chống Trục lợi & Idempotency"],
    ["purchase", "floor((tổng đơn / 10.000) * hệ số hạng)", "Đơn chuyển trạng thái done", "Khóa duy nhất (member_id, purchase, order, orderId) trên sổ cái"],
    ["refund_reversal", "Trừ đúng số điểm đã cộng ở giao dịch gốc", "Đơn chuyển từ done sang cancelled", "Truy vấn giao dịch gốc; khóa duy nhất theo orderId"],
    ["signup", "+50 điểm (kèm 100 điểm khởi tạo legacy)", "Đăng ký tài khoản /api/member/auth", "Chỉ nhận 1 lần duy nhất trọn đời theo member_id"],
    ["referral_bonus / joined", "+200 người giới thiệu / +100 người nhận", "Khi người được mời hoàn thành đơn đầu tiên", "Chặn tự giới thiệu theo ID, SĐT và Email; INSERT OR IGNORE"],
    ["daily_login & streak_bonus", "+5/ngày; mốc 7 ngày +50; mốc 30 ngày +200", "POST /api/loyalty/earn (action=daily_login)", "Tính theo ngày múi giờ Asia/Ho_Chi_Minh (UTC+7); mỗi ngày tối đa 1 lần"],
    ["read_article", "+2 điểm mỗi bài viết", "ArticleReadTracker khi cuộn >=70% và >=30s", "Mỗi bài viết 1 lần; giới hạn tối đa 5 điểm/ngày (UTC+7); Rate limit 20/5p"],
    ["download_doc", "+5 điểm mỗi tài liệu", "POST /api/documents/unlock", "Mỗi tài liệu 1 lần; giới hạn tối đa 3 lượt/ngày (UTC+7)"],
    ["review (đã mua) / comment", "+30 điểm (đánh giá đã mua) / +10 điểm", "POST /submit-comment", "Review đối chiếu orders(done); max 5/tháng; Comment >=50 ký tự, max 3/ngày"],
    ["admin_adjust / redemptions", "Điều chỉnh thủ công hoặc trừ đổi quà", "CRM / Admin Loyalty / POST /api/loyalty/redeem", "Sales giới hạn tối đa +100 điểm/lần tại CRM; trừ kho & điểm nguyên tử"],
  ]),
  p(
    "Khi thành viên đổi quà trong kho reward_catalog, hàm redeemReward() thực hiện trừ tồn kho phần quà và trừ số dư điểm theo điều kiện WHERE current_points >= cost, tự động hoàn tồn kho nếu số dư không đủ. Đối với voucher giảm giá/freeship, hệ thống phát sinh mã coupon cá nhân hóa (TDGIFT* hoặc TDFREE*); đối với quà hiện vật, hệ thống tự động tạo một nhắc việc chăm sóc ngay trong ngày trên bảng crm_notes dưới tên system@loyalty để nhân viên liên hệ giao quà.",
  ),
];

// =========================================================================
// BATCH 3: Sections 7, 8, 9
// =========================================================================
const batch3 = [
  defaultStyle(),

  // SECTION 7
  h2("7. Kiến trúc AI 3 Tầng, Tư vấn Y khoa & Tuân thủ Pháp luật"),
  p(
    "Khác với cách tích hợp AI rời rạc theo từng route dễ gây phình chi phí token và hết thời gian chờ (timeout) trên nền tảng Serverless, thucduong-shop được thiết kế theo bản vẽ Kiến trúc AI 3 Tầng chuẩn hóa trong .agents/skills/thucduong-ai-architecture/SKILL.md. Ba tầng bao gồm Tầng Cấu hình Prompt & Tuân thủ Pháp lý, Tầng AI Gateway tối ưu token và Tầng Hàng đợi Điều phối song song giữa trình duyệt và máy chủ.",
  ),
  figCaption("Hình 6. Kiến trúc AI 3 Tầng, Hàng đợi Client và D1 Lease-Locked Idle Workers"),
  h3("7.1 Phân tách 3 Tầng, Unified AI Gateway & Tối ưu Chi phí Token"),
  p(
    "Tầng 1 tách biệt toàn bộ prompt và quy chuẩn khỏi mã xử lý: lib/ai-motifs.ts định nghĩa 8 phong cách viết bài (duyvo, deep_research, youtube_lecture, gdocs_handbook, step_by_step, medical_wfpb, storytelling, seo_conversion) lưu mở rộng trong settings.ai_motifs_json; lib/medical-compliance.ts quản lý bộ quy tắc pháp lý; lib/medical-disclaimer.ts lưu 3 mẫu miễn trừ trách nhiệm y khoa (gemini_standard, warm_senior, legal_strict); còn lib/quick-consult-options.ts chứa cấu hình 4 đối tượng, 3 chuyên gia và 4 gói tư vấn.",
  ),
  p(
    "Tại Tầng 2, cổng AI Gateway tập trung trong lib/gemini-key.ts giải quyết API Key theo thứ tự ưu tiên: khóa override truyền từ request (kiểm định định dạng AIza* hoặc AQ.*) -> khóa lưu trong D1 settings.gemini_api_key -> biến môi trường GEMINI_API_KEY. Khi gọi sinh văn bản, callGeminiGenerateContent() sử dụng cơ chế tự động dự phòng từ gemini-2.5-flash sang gemini-flash-latest (chỉ thử lại trên mã lỗi 400/404, timeout mặc định 25 giây). Nhằm tiết kiệm token tối đa, dữ liệu đầu vào từ web được làm sạch toàn bộ thẻ script/style/thuộc tính CSS/SĐT/tên miền nguồn bằng TypeScript thuần trước khi gửi Gemini, cấu trúc JSON schema trả về được ép chặt để loại bỏ chữ dư thừa, ảnh sản phẩm chỉ gọi model tái tạo ảnh khi bước kiểm tra trước trả về cờ HAS_WATERMARK, và phác đồ Tư vấn nhanh không có ghi chú riêng sẽ được tái sử dụng từ bảng cache SHA-256 quick_consult_cache trong 14 ngày.",
  ),
  h3("7.2 Hàng đợi Tuần tự Client & D1 Lease-Locked Idle Workers"),
  p(
    "Ở phía trình duyệt quản trị, AiIdleQueueProvider.tsx bao bọc toàn bộ /admin/* để ép mức đồng thời concurrency = 1. Giữa hai tác vụ liên tiếp, hàng đợi nghỉ 900ms và chờ thời điểm trình duyệt rảnh qua window.requestIdleCallback (timeout 1300ms), đồng thời tự học thời gian chạy thực tế bằng trung bình trượt hàm mũ EMA (65% ước lượng cũ + 35% thời gian mới) lưu trong localStorage để hiển thị đếm ngược ETA chính xác ngay trên nút nổi góc dưới trái. Ở phía máy chủ, các quy trình dài như nhập bài viết, nhập hàng loạt sản phẩm hay phân tích xét nghiệm hoạt động theo cơ chế Idle Worker khóa lease D1 nhằm tránh đụng độ giữa các lần gọi đồng thời.",
  ),
  table([
    ["Phân hệ Worker", "Bảng D1 & Trạng thái", "Thời hạn Lease & Câu lệnh Chiếm quyền", "Cơ chế Phục hồi & Thử lại"],
    ["Post Importer (post-import/idle-worker)", "post_import_jobs (7 trạng thái: queued -> researching -> writing -> generating_images -> ready_review -> published / failed)", "Khóa 40 giây: UPDATE ... SET locked_until = datetime('now', '+40 seconds') WHERE id = ? AND (locked_until IS NULL OR locked_until < datetime('now'))", "Tự thu hồi khi quá 40s ở lần poll tiếp theo (1400ms/lần khi active). Gặp lỗi đánh dấu failed; Admin bấm retry_job để đặt lại queued."],
    ["Product Importer (product-import/idle-worker)", "product_import_jobs (7 trạng thái: fetch_queued -> fetched -> imported -> cleaning_queued -> cleaning_running -> cleaned / failed)", "Khóa 35 giây bằng điều kiện nguyên tử kiểm tra locked_until tương tự Post Importer.", "Tự thu hồi sau 35s; UI poll 1200ms khi có việc; hỗ trợ xếp hàng tối đa 20 URL mới hoặc 50 sản phẩm chưa làm sạch."],
    ["Lab Analysis (lab-analysis/idle-worker)", "lab_analyses (4 trạng thái: pending -> processing -> done / error)", "Dùng trạng thái processing + started_at = datetime('now'); kích hoạt qua ctx.waitUntil() và Idle Callback 2500ms.", "Nhặt lại các job processing bị treo quá 3 phút. Lưu ý: mệnh đề WHERE hiện bao gồm cả 'processing' nên chưa khóa độc quyền tuyệt đối nếu hai worker đọc cùng lúc."],
  ]),
  h3("7.3 Hệ thống Ứng dụng AI & Động cơ Tuân thủ Pháp luật Y tế"),
  p(
    "Trên nền tảng 3 tầng đó, 7 nhóm tính năng AI phục vụ xuyên suốt từ người mua hàng tới đội ngũ biên tập và chuyên viên y tế:",
  ),
  ...bulletList([
    "Tư vấn Nhanh AI (/tu-van-nhanh/) & Hồ sơ Y tế PDF (/ho-so-tu-van/[token]/): Khách hàng trải qua 3 bước (Chọn đối tượng + tính chỉ số BMI chuẩn châu Á; Nhập khẩu phần 24h & chọn mục tiêu/bệnh lý/thói quen; Chọn phong cách Chuyên gia AI). Hệ thống ghép sản phẩm đang còn hàng theo 4 trụ cột Thực dưỡng (Thức ăn, Trợ phương, Thảo dược, Khác), kèm 3 video và 3 tài liệu liên quan để sinh bài tư vấn 550-750 từ có mã tra cứu share_token in PDF A4 và gửi email từ Admin.",
    "Phân tích Phiếu Xét nghiệm AI (/admin/lab-analysis/): Nhận tệp ảnh hoặc PDF tối đa 6MB cùng mô tả triệu chứng bằng văn bản hoặc giọng nói (Web Speech vi-VN), gọi trực tiếp Gemini 3.8 Flash Vision OCR xuất báo cáo 5 phần theo chuẩn WHO/AHA/ADA/KDIGO/EASL và tự động xóa chuỗi file_base64 sau khi hoàn tất để giải phóng dung lượng D1.",
    "Nghiên cứu & Viết bài Độc bản (/admin/posts/import/): Hỗ trợ trích xuất bài web hoặc phụ đề YouTube (kèm tối đa 2 link tham khảo phụ), lập dàn ý Đông - Tây Y, viết bài 800-1.400 từ, tự sinh bộ 3 đến 5 ảnh thương hiệu gắn logo Thực Dưỡng Phúc Thọ vào các mục H2 và cho phép viết lại theo chuẩn đề nghị có nút Hoàn tác.",
    "Nhập Sản phẩm Thông minh & Làm sạch 4 Bước (/admin/products/import/): Bóc tách JSON-LD/OpenGraph/HTML không tốn token, cảnh báo dấu vết trang nguồn (SĐT, email, link mua hàng đối thủ, ảnh ngoài), kiểm tra chênh lệch giá/hết hàng từ nguồn (check_update) và làm sạch tự động 4 bước.",
    "Biên tập & Xưởng Ảnh 0 Đồng (ContentEditor, ProductDescriptionAiPanel, AiImageRegenerateModal): Hỗ trợ viết lại toàn bài từ 4 nguồn (Web, YouTube, Google Docs, Deep Research), viết lại đoạn văn bôi đen theo 6 giọng văn, viết lại mô tả sản phẩm 3 phong cách và tái tạo ảnh bằng model sinh ảnh (fallback 0 đồng qua Canvas + bộ lọc sắc nét Unsharp Mask 3x3 khi hết quota) kèm đồng bộ URL mới trên toàn bộ DB.",
    "Động cơ Tuân thủ Pháp luật & YMYL (lib/medical-compliance.ts): Tự động chuẩn hóa nội dung bài nhập để tuân thủ Luật Quảng cáo VN, NĐ 15/2018/NĐ-CP, TT 09/2015/TT-BYT, Google Search YMYL và YouTube Medical Misinformation Policy. Mặc định thay thế 5 nhóm từ khóa cấm ('chữa khỏi 100%', 'đặc trị', 'thần dược', 'bỏ hẳn thuốc tây', 'cam kết khỏi bệnh'), chèn khối khuyến cáo y khoa và tự động đồng bộ cập nhật quy tắc mới mỗi 7 ngày (mở rộng tối đa 20 quy tắc).",
  ]),

  // SECTION 8
  h2("8. Bảo mật, Phân quyền RBAC, Lưu trữ Media & Giám sát"),
  p(
    "Mặc dù bắt đầu từ prototype nội bộ, hệ thống hiện tại đã xây dựng nhiều lớp kiểm soát bảo mật xuyên suốt từ tầng HTTP Edge, xác thực phiên, phân quyền vai trò chi tiết đến kiểm định tệp nhị phân tải lên và ẩn giấu bí mật trong nhật ký vận hành.",
  ),
  figCaption("Hình 7. Phòng thủ Bảo mật Đa tầng, Ma trận RBAC và Đường ống Lưu trữ Media"),
  h3("8.1 Xác thực, Ma trận Phân quyền RBAC & Các Lớp Phòng vệ Web"),
  p(
    "Mật khẩu quản trị viên (lib/auth.ts) sử dụng thuật toán crypto.scrypt bất đồng bộ (khóa 64 byte, muối ngẫu nhiên 16 byte hex), còn tài khoản thành viên (lib/member-auth.ts) sử dụng scryptSync, đều kiểm chứng bằng crypto.timingSafeEqual chống tấn công dò thời gian. Phiên đăng nhập lưu bằng token ngẫu nhiên 32 byte trong D1 và gắn cookie HttpOnly, SameSite=Lax, bật cờ Secure ở production (TTL 7 ngày cho Admin và 30 ngày cho Member). Khi đổi mật khẩu quản trị, toàn bộ các phiên đăng nhập khác của tài khoản đó lập tức bị hủy.",
  ),
  p(
    "Phân quyền RBAC tại lib/rbac.ts chia nhân sự thành 4 vai trò (super_admin, admin, editor, sales) kiểm soát cả đường dẫn truy cập (canAccessAdminPath) lẫn 13 miền hành động cụ thể ở tầng Server Actions (canPerformAdminAction), đồng thời tự động ngăn việc xóa tài khoản Super Admin cuối cùng.",
  ),
  table([
    ["Miền Hành động (AdminActionDomain)", "Super Admin", "Admin", "Editor", "Sales", "Chức năng & Điểm kiểm soát Chính"],
    ["system_settings & admin_accounts", "Cho phép", "Chặn (trừ xem trang)", "Chặn", "Chặn", "Lưu cài đặt chung, SMTP, Gemini Key, KiotViet API, tạo/xóa tài khoản Admin"],
    ["coupons_manage, catalog_delete, content_delete", "Cho phép", "Cho phép", "Chặn", "Chặn", "Tạo/xóa mã giảm giá; xóa sản phẩm, danh mục, bài viết, block, QR, tài liệu"],
    ["orders_ops, inventory_finance, members_manage, flash_sale, consultations", "Cho phép", "Cho phép", "Chặn", "Cho phép*", "Xử lý đơn, POS, trả hàng, sổ quỹ, Flash Sale, CRM (*Sales tối đa +100đ/lần), Tư vấn AI"],
    ["content_write", "Cho phép", "Cho phép", "Cho phép", "Chặn", "Viết/sửa bài viết, video, tài liệu, block, QR, trang tĩnh, danh mục, import bài"],
    ["catalog_write & comments_moderate", "Cho phép", "Cho phép", "Cho phép", "Cho phép", "Chỉnh sửa thông tin sản phẩm và kiểm duyệt/xóa bình luận khách hàng"],
  ], {
    table_cell_colors: [
      [""],
      ["", "#d9ead3", "#fff2cc", "#f4cccc", "#f4cccc", ""],
      ["", "#d9ead3", "#d9ead3", "#f4cccc", "#f4cccc", ""],
      ["", "#d9ead3", "#d9ead3", "#f4cccc", "#d9ead3", ""],
      ["", "#d9ead3", "#d9ead3", "#d9ead3", "#f4cccc", ""],
      ["", "#d9ead3", "#d9ead3", "#d9ead3", "#d9ead3", ""],
    ],
  }),
  p(
    "Để chống lạm dụng tự động (brute-force, spam AI và đặt hàng ảo), lib/rate-limit.ts triển khai bộ giới hạn tốc độ theo cửa sổ trượt lưu trên bộ nhớ Isolate (tối đa 5.000 key, tự dọn dẹp khi đầy), trích xuất IP ưu tiên qua header cf-connecting-ip và trả về mã HTTP 429 kèm Retry-After. Bảng sau ghi nhận 6 chính sách Rate Limit đang hoạt động trong mã nguồn.",
  ),
  table([
    ["Điểm cuối / Hành động", "Tệp Triển khai", "Namespace & Định danh", "Ngưỡng Cho phép", "Mục đích Bảo vệ"],
    ["Đăng nhập Admin (loginAction)", "app/admin/_actions/auth.ts", "admin-login (ip:identifier)", "8 lần / 5 phút", "Chống dò mật khẩu quản trị bằng Email hoặc SĐT"],
    ["Tạo đơn Checkout", "app/api/data-checkout/route.ts", "checkout (Client IP)", "10 lần / 1 phút", "Chống spam đơn ảo và giữ kho liên tục"],
    ["Đăng ký / Đăng nhập Member", "app/api/member/auth/route.ts", "member-auth:register / login (IP)", "12 lần / 5 phút", "Chống tạo tài khoản rác nhận 100+50 điểm"],
    ["Tra cứu Đơn hàng", "app/api/orders/lookup/route.ts", "orders-lookup (Client IP)", "15 lần / 5 phút", "Chống dò mã đơn hàng và số điện thoại"],
    ["Tư vấn Nhanh AI", "app/api/quick-consult/route.ts", "quick-consult (Client IP)", "6 lần / 5 phút", "Bảo vệ hạn mức token và chi phí gọi Gemini API"],
    ["Tích điểm Đọc bài / Điểm danh", "app/api/loyalty/earn/route.ts", "loyalty-earn (member.id)", "20 lần / 5 phút", "Chống spam API cộng điểm tự động"],
  ]),
  p(
    "Ngoài ra, hệ thống áp dụng kiểm tra URL công khai chống SSRF (assertSafePublicHttpUrl chặn loopback, RFC1918 và IP metadata 169.254.169.254 kết hợp cờ runtime global_fetch_strictly_public của Workers), lọc từ khóa bẻ khóa prompt (guardUserPromptInput), lọc HTML/SVG chống XSS (lib/sanitize-html.ts, lib/media-security.ts), chặn công thức Excel injection (bằng dấu nháy đơn trước ký tự =, +, -, @ khi xuất CSV) và bộ HTTP Security Headers toàn cục trong next.config.ts.",
  ),
  h3("8.2 Kiến trúc Lưu trữ Media & Hệ thống Giám sát (Observability)"),
  p(
    "Do Cloudflare Workers không có hệ thống tệp cục bộ bền vững khi chạy, dữ liệu hình ảnh và tài liệu của thucduong-shop đi qua ba đường dẫn riêng biệt: (1) Ảnh tĩnh có sẵn từ quá trình di chuyển dữ liệu nằm trong public/uploads/* và được đóng gói vào ASSETS; (2) Ảnh và tài liệu (PDF/DOCX/PPTX tối đa 1.5MB) tải lên qua trình soạn thảo đi qua lib/uploads.ts kiểm tra Magic-Byte thật (FFD8FF, 89504E47, RIFF..WEBP, %PDF-, PK, OLE2), khử mã độc SVG, băm tên SHA-256 16 ký tự và gửi qua bộ chuyển đổi kép lib/r2-storage.ts (ưu tiên R2 MEDIA_BUCKET, dự phòng bảng D1 media_files); (3) Ảnh do AI hoặc trình nhập tự động tạo ra lưu qua lib/media-assets.ts (ưu tiên R2 khóa media/<slug>, dự phòng bảng D1 media_assets).",
  ),
  p(
    "Về giám sát vận hành, lib/logger.ts chuẩn hóa nhật ký dạng JSON một dòng (logInfo, logWarn, logError) để tương thích Cloudflare Workers Logs và tự động đệ quy (tối đa 4 tầng) thay thế bằng '[REDACTED]' đối với mọi khóa chứa password, secret, token, apikey, authorization, cookie, smtp_pass, salt hoặc hash. Sức khỏe kết nối cơ sở dữ liệu được theo dõi qua endpoint GET /api/health/ (đo độ trễ truy vấn SELECT 1 AS ok và trả về HTTP 200 hoặc 503 với Cache-Control: no-store).",
  ),

  // SECTION 9
  h2("9. Chi tiết Triển khai Mã nguồn, Kiểm thử & Công cụ Vận hành"),
  p(
    "Cách tổ chức mã nguồn thể hiện sự cân bằng thực dụng giữa tốc độ phát triển tính năng và tính dễ bảo trì trên nền tảng Next.js App Router chạy trên workerd. Toàn bộ Server Actions của khu vực quản trị được chia nhỏ từ tệp đơn ban đầu thành 9 module chuyên biệt dưới app/admin/_actions/ (auth, catalog, content, orders, members, marketing, retail, settings, shared) và tái xuất tập trung qua app/admin/actions.ts. Tài liệu hướng dẫn sử dụng tích hợp sẵn (AdminHandbookDrawer) được định nghĩa trong lib/admin-handbook.ts để tự động hiển thị đúng hướng dẫn theo từng đường dẫn /admin/*.",
  ),
  p(
    "Ba mô hình triển khai không phụ thuộc thư viện nặng (Zero-Dependency Workerd Patterns) là điểm sáng kỹ thuật đáng chú ý nhất trong tầng lib/:",
  ),
  ...bulletList([
    "Trình khách SMTP thuần TCP/TLS (lib/mail.ts): Tự cài đặt giao thức bắt tay EHLO, nâng cấp STARTTLS (cổng 587) hoặc TLS ngầm định (cổng 465), xác thực AUTH LOGIN và mã hóa RFC 2047 UTF-8 Base64 trực tiếp trên node:net và node:tls thay vì kéo nodemailer vào bundle Worker.",
    "Bộ phân tích Bảng tính Excel .xlsx thuần TypeScript (lib/kiotviet-import.ts): Tự tìm bản ghi EOCD và Central Directory trong buffer nhị phân ZIP, giải nén dữ liệu XML bằng node:zlib.inflateRawSync và bóc tách 18 cột dữ liệu KiotViet với bộ đệm nhớ tối thiểu.",
    "Bộ tách Văn bản Web & Phụ đề YouTube (lib/html-extract.ts): Loại bỏ các khối nhiễu (header, nav, footer, sidebar, quảng cáo), trích xuất bài viết từ HTML và giải mã XML phụ đề YouTube để cấp cho AI Rewrite và Importer mà không cần JSDOM hay cheerio.",
  ]),
  p(
    "Chất lượng logic cốt lõi được kiểm chứng thông qua 8 tệp kiểm thử đơn vị (tổng cộng 22 test cases, 450 dòng mã) viết bằng node:test và node:assert/strict. Do package.json chưa khai báo script test chính thức, bộ kiểm thử này được chạy tự động trong CI bằng lệnh npx --yes tsx --test.",
  ),
  table([
    ["Tệp Kiểm thử", "Số Test", "Phạm vi & Đối tượng Kiểm định"],
    ["lib/backup-verify.test.ts", "2", "Xác minh SQL dump D1 đạt chuẩn (>=512B, đủ 9 bảng cốt lõi, có INSERT) và bắt lỗi header Wrangler CLI"],
    ["lib/checkout-helpers.test.ts", "3", "Tính duy nhất của mã đơn DH trong cùng mili-giây, tính giá theo hạng thẻ + coupon và chuẩn hóa Idempotency-Key"],
    ["lib/html-extract.test.ts", "3", "Giải mã HTML entities, bóc tách bài viết + ảnh lazy data-isrc và chia đoạn phụ đề XML YouTube"],
    ["lib/image-url.test.ts", "3", "Chuyển đổi URL sang R2 CDN, bọc /cdn-cgi/image/, sinh srcSet và bỏ qua SVG/host ngoài"],
    ["lib/logger.test.ts", "3", "Định dạng log JSON một dòng, che giấu bí mật đệ quy [REDACTED], cắt chuỗi 500 ký tự và giới hạn độ sâu 4"],
    ["lib/media-security.test.ts", "4", "Đối chiếu Magic-Byte (JPEG/PNG/GIF/WEBP/SVG/PDF/DOCX), chặn file giả mạo, lọc XSS trong SVG và băm SHA-256"],
    ["lib/rate-limit.test.ts", "3", "Cửa sổ trượt theo IP, khôi phục sau hết hạn cửa sổ, trích xuất cf-connecting-ip và phản hồi 429 Retry-After"],
    ["lib/rbac.test.ts", "3", "Kiểm chứng ranh giới truy cập đường dẫn và quyền hành động của 4 vai trò đảm bảo không leo thang đặc quyền"],
  ]),
  p(
    "Bên cạnh mã nguồn ứng dụng, thư mục scripts/ chứa 7 công cụ dòng lệnh Node ES Module (.mjs) phục vụ di chuyển dữ liệu lịch sử và bảo trì hạ tầng Cloudflare D1:",
  ),
  table([
    ["Tên Script", "Cách gọi / Lệnh npm", "Chức năng & Tác động Dữ liệu"],
    ["ensure-opennext-build.mjs", "npm run postinstall", "Tự động vá lệnh deploy của @opennextjs/cloudflare để tự build nếu thiếu tệp .open-next/.build/open-next.config.edge.mjs khi chạy Cloudflare CI."],
    ["export-d1.mjs", "node scripts/export-d1.mjs", "Xuất toàn bộ bảng, chỉ mục và dữ liệu từ data/shop.db cục bộ ra tệp data/d1-dump.sql tương thích D1 (kèm DDL bảng media_files)."],
    ["import-post.mjs", "npm run import:post -- <url>", "Cào 1 bài viết 3 cấp từ thucduongphuctho.net bằng cheerio, tải ảnh về public/uploads/posts/<slug>/ và upsert vào SQLite cục bộ."],
    ["import-products.mjs", "npm run import:products [--replace|--limit N]", "Cào toàn bộ sản phẩm từ thucduongphuctho.net bằng 3 luồng đồng thời, tải ảnh về public/uploads/products/ và hỗ trợ xóa dữ liệu mẫu."],
    ["import-thucduongphuctho-net.mjs", "node scripts/import-thucduongphuctho-net.mjs", "Di chuyển danh mục và sản phẩm từ trang Haravan thucduongphuctho.net (JSON API + Sitemap), tạo ảnh và file SQL tại /tmp/import-phuctho-net.sql."],
    ["sync-provinces-vn.mjs", "node scripts/sync-provinces-vn.mjs", "Tải dữ liệu hành chính Việt Nam v2 (34 tỉnh/thành sau sáp nhập và ~3.321 xã/phường) từ provinces.open-api.vn ghi ra data/provinces-vn-v2.sql."],
    ["verify-d1-backup.mjs", "node scripts/verify-d1-backup.mjs <file.sql>", "Công cụ CLI kiểm tra tính toàn vẹn tệp sao lưu D1 được gọi hằng ngày trong GitHub Actions."],
  ]),
];

// =========================================================================
// BATCH 4: Sections 10, 11, Footer
// =========================================================================
const batch4 = [
  defaultStyle(),

  // SECTION 10
  h2("10. Kiến trúc Triển khai, CI/CD, Sao lưu & Vận hành (Deployment & DevOps)"),
  p(
    "Quy trình giao hàng liên tục (CI/CD) và bảo vệ dữ liệu của dự án được tự động hóa thông qua 3 workflow trên GitHub Actions kết hợp cùng công cụ dòng lệnh Wrangler và OpenNext. Khi code mới được đẩy lên nhánh main, hệ thống thực hiện kiểm tra kiểu TypeScript, chạy 22 unit test, đóng gói Worker và áp dụng chỉ mục hiệu năng trước khi phát hành lên tên miền production.",
  ),
  figCaption("Hình 8. Quy trình CI/CD, Sao lưu D1 và Vận hành Production"),
  p(
    "Toàn bộ cấu hình vận hành được quản lý tách biệt giữa các tệp khai báo hạ tầng (wrangler.jsonc, open-next.config.ts), bí mật trên Cloudflare Secrets / GitHub Secrets và cấu hình động trong bảng settings của D1. Bảng dưới đây tổng hợp đầy đủ các Bindings và Biến môi trường đang được mã nguồn sử dụng.",
  ),
  table([
    ["Biến / Binding", "Nơi khai báo / Lưu trữ", "Mục đích & Cơ chế Dự phòng"],
    ["DB (D1 Database)", "wrangler.jsonc (d1_databases)", "Kết nối cơ sở dữ liệu chính thucduong-shop-db (ID: 111f93d1-e16a-4ecd-87e4-66ef459c2063)."],
    ["NEXT_INC_CACHE_KV", "wrangler.jsonc (kv_namespaces)", "Namespace KV lưu Next.js Incremental Cache và Regional Cache TTL 300s."],
    ["ASSETS & WORKER_SELF_REFERENCE", "wrangler.jsonc", "Phân phối tài sản tĩnh .open-next/assets và dịch vụ tự tham chiếu cho OpenNext."],
    ["MEDIA_BUCKET (R2)", "Đọc động qua getCloudflareContext()", "Bucket R2 lưu media tải lên; hiện CHƯA khai báo trong wrangler.jsonc nên mặc định fallback về D1."],
    ["GEMINI_API_KEY", "Env Secret / settings.gemini_api_key", "Khóa dự phòng cho AI Gateway khi quản trị viên chưa cấu hình khóa trong /admin/settings/."],
    ["CRON_SECRET & IDLE_WORKER_SECRET", "Cloudflare Worker Secrets", "Bảo vệ các endpoint /api/cron/* và /api/admin/*/idle-worker qua header x-cron-secret / x-idle-secret."],
    ["SMTP_HOST / PORT / USER / PASS", "Env Secret / settings (mailDefaults)", "Cấu hình dự phòng cho trình gửi mail SMTP TLS (mặc định smtp.gmail.com:465)."],
    ["NEXT_PUBLIC_MEDIA_CDN_URL", "Environment Variable", "Tên miền CDN công khai của R2 để rewrite đường dẫn /api/media/* trong lib/image-url.ts."],
    ["NEXT_PUBLIC_CF_IMAGE_RESIZING", "Environment Variable ('1')", "Khi bằng '1', kích hoạt bọc đường dẫn ảnh raster qua /cdn-cgi/image/ tối ưu WebP/AVIF."],
    ["CLOUDFLARE_API_TOKEN / ACCOUNT_ID", "GitHub Secrets", "Dùng trong deploy-cloudflare.yml và backup-d1.yml để chạy wrangler từ xa (nếu thiếu sẽ tự bỏ qua)."],
    ["R2_BACKUP_BUCKET", "GitHub Repository Variable", "Nếu được thiết lập, bản sao lưu D1 nén .sql.gz hằng ngày sẽ được đẩy thêm lên bucket R2 này."],
  ]),
  p(
    "Một điểm cần lưu ý trong mô hình vận hành hiện tại là tệp wrangler.jsonc chưa khai báo khối triggers.crons. Vì vậy, ba endpoint định kỳ (/api/cron/compliance-sync, /api/cron/crm-automation, /api/cron/youtube-sync) hiện chưa tự chạy theo lịch cron của Cloudflare Worker mà dựa vào: (1) kích hoạt nền không chặn (ctx.waitUntil) khi có người truy cập trang bài giảng YouTube hoặc chạy trình nhập bài; (2) nút kích hoạt thủ công trong giao diện Admin; hoặc (3) bộ lập lịch ngoài gọi HTTP vào các đường dẫn cron.",
  ),
  p(
    "Ba quy trình tự động hóa GitHub Actions đảm nhiệm vòng đời kiểm soát chất lượng, sao lưu và phát hành liên tục như trình bày trong bảng đối chiếu dưới đây.",
  ),
  table([
    ["Workflow (.github/workflows/)", "Lịch / Điều kiện Kích hoạt", "Các Bước Thực thi Chính", "Đầu ra & Bảo vệ Toàn vẹn"],
    ["deploy-cloudflare.yml", "Push vào main (bỏ qua *.md, *.test.*), workflow_dispatch", "npm ci -> typecheck -> 22 unit tests (tsx --test) -> opennextjs-cloudflare build -> wrangler d1 execute 0002_performance_indexes.sql -> deploy", "Đảm bảo không phát hành mã lỗi kiểu/test; scripts/ensure-opennext-build.mjs tự vá postinstall khi thiếu build edge."],
    ["security-audit.yml", "Push/PR main + Cron Thứ Hai 02:00 UTC (09:00 VN)", "Job 1: npm audit (high) + typecheck; Job 2: Semgrep SAST (p/typescript, p/react, p/owasp-top-ten); Job 3: Trivy scan (vuln, secret, misconfig)", "Chặn lỗ hổng phụ thuộc, rò rỉ khóa bí mật và các mẫu mã mất an toàn OWASP Top 10 trước khi gộp nhánh."],
    ["backup-d1.yml", "Cron hằng ngày 20:00 UTC (03:00 sáng UTC+7) + thủ công", "wrangler d1 export --remote -> scripts/verify-d1-backup.mjs (kiểm >=512B, 9 bảng cốt lõi, có INSERT) -> gzip -9 + sha256sum", "Lưu GitHub Artifact 30 ngày kèm checksum SHA-256; tự động đẩy thêm lên bucket R2 nếu có vars.R2_BACKUP_BUCKET."],
  ]),
  p(
    "Khi triển khai thực tế theo runbook .agents/skills/cf-deploy-verify/SKILL.md, kỹ sư vận hành luôn chạy npm run typecheck trước, sau đó gọi npm run cf:deploy (lưu ý: nếu Next.js gặp lỗi tạm thời khi prerender D1 ở nhiều worker song song, chỉ cần chạy lại lệnh cf:deploy), cuối cùng thực hiện smoke-test bằng curl trên https://thucduongshop.duyvo.win (luôn kèm dấu / cuối cho các endpoint POST để tránh chuyển hướng 308). Ở môi trường phát triển cục bộ, lập trình viên có thể chạy docker-compose.yml (image node:24, WATCHPACK_POLLING=true) hoặc npm run dev có initOpenNextCloudflareForDev() để mô phỏng D1/KV ngay trên máy.",
  ),

  // SECTION 11
  h2("11. Đánh giá Kỹ thuật, Phát hiện Rủi ro từ Mã nguồn & Khuyến nghị Khắc phục"),
  callout(
    "Tổng kết Kiểm toán Mã nguồn (HEAD 557fbf9):",
    "Kiến trúc tổng thể của thucduong-shop rất chặt chẽ ở các điểm nóng nghiệp vụ (trừ kho nguyên tử, sổ cái Loyalty chống trùng lặp, khóa lease D1, khử độc file bằng Magic-Byte và đóng gói thuần TypeScript cho workerd). Tuy nhiên, quá trình rà soát chi tiết mã nguồn đã phát hiện 16 vấn đề cụ thể về bảo mật, tính đúng đắn dữ liệu, đồng bộ nghiệp vụ và hiệu năng cần ưu tiên khắc phục theo lộ trình dưới đây.",
    "#fce8e6",
    "#D93025",
  ),
  p(
    "Bảng Ma trận Phát hiện Kỹ thuật dưới đây liệt kê đầy đủ các lỗi và lỗ hổng được xác minh trực tiếp từ mã nguồn kèm tệp phát sinh, mức độ rủi ro và giải pháp xử lý triệt để.",
  ),
  table(
    [
      ["Mức độ", "Phân hệ / Tệp mã nguồn", "Mô tả Chi tiết Vấn đề Phát hiện", "Khuyến nghị Khắc phục"],
      [
        "CAO (Bảo mật)",
        "app/api/cron/crm-automation/route.ts & app/api/kiotviet/webhook/route.ts",
        "Nếu CRON_SECRET hoặc kiotviet_webhook_secret để trống, endpoint cho phép chạy KHÔNG CẦN XÁC THỰC; khi có secret lại so sánh bằng !== (dễ lộ thời gian) và cho phép truyền qua query ?secret=.",
        "Từ chối 401/503 nếu secret chưa cấu hình (hoặc kiểm currentAdmin()), chỉ nhận qua header và đổi sang safeEqualSecret().",
      ],
      [
        "CAO (RBAC)",
        "orders/[id], crm, loyalty, members, sitemaps, themes, quick-consult/send-email, orders/export",
        "Một số trang quản trị và API route mới kiểm tra currentAdmin()/requireAdmin() thay vì requireRole() khớp với phân quyền trên AdminNav, cho phép Editor/Sales gọi được API ngoài phạm vi menu.",
        "Áp dụng helper kiểm tra vai trò thống nhất (canPerformAdminAction / canAccessAdminPath) cho tất cả 26 API route và 39 trang Admin.",
      ],
      [
        "CAO (Dữ liệu)",
        "CanhDuongSinhLanding.tsx & app/api/v2/add-to-cart/[id]/route.ts",
        "Landing Canh Dưỡng Sinh gửi JSON { quantity: qty } (và FlashSaleShowcase gửi { quantity: 1 }), nhưng endpoint add-to-cart đọc body.qty (mặc định 1), khiến chọn nhiều hộp trên landing chỉ thêm được 1 hộp.",
        "Hỗ trợ đọc body.qty ?? body.quantity trong /api/v2/add-to-cart/[id] và thống nhất payload phía client.",
      ],
      [
        "CAO (Dữ liệu)",
        "app/api/newsletter/route.ts & app/api/admin/blocks/route.ts",
        "newsletter/route.ts gọi run(...) thiếu từ khóa await (nguy cơ rớt ghi D1 khi Worker đóng isolate); admin/blocks/route.ts gọi getAllBlocks() thiếu await khiến JSON trả về object Promise rỗng.",
        "Bổ sung từ khóa await cho cả hai lời gọi bất đồng bộ ngay lập tức.",
      ],
      [
        "CAO (Logic)",
        "lib/crm.ts (hàm runCrmEmailAutomation, dòng 438-440)",
        "Kiểm tra if (ok) trên giá trị trả về của sendEmail(), trong khi sendEmail() luôn trả về object { sent: boolean }. Điều này khiến automation tự đánh dấu đã gửi vào crm_automation_logs ngay cả khi SMTP lỗi hoặc chưa cấu hình.",
        "Đổi điều kiện kiểm tra thành if (ok.sent) và ghi log cảnh báo khi gửi thất bại.",
      ],
      [
        "CAO (Hạ tầng)",
        "wrangler.jsonc & app/api/media/[...path]/route.ts",
        "wrangler.jsonc chưa khai báo r2_buckets MEDIA_BUCKET. Đặc biệt, nếu bật R2 mà chưa cấu hình NEXT_PUBLIC_MEDIA_CDN_URL, đường dẫn /api/media/products/... sẽ lỗi 404 vì [...path]/route.ts chỉ đọc bảng D1 media_files chứ không đọc R2.",
        "Cho phép [...path]/route.ts đọc fallback từ MEDIA_BUCKET (tương tự [slug]/route.ts) và cấu hình r2_buckets khi lên R2.",
      ],
      [
        "TRUNG BÌNH (Bảo mật)",
        "submit-comment, api/consultation, api/newsletter, api/quick-consult/followup, ai-rewrite, admin/upload",
        "4 endpoint ghi công khai chưa có rate limit; ai-rewrite chưa kiểm assertSafePublicHttpUrl khi cào URL; /admin/upload bằng JSON imageUrl chưa chạy verifyFileMagicBytes trên bytes tải về.",
        "Gắn checkRateLimit cho 4 route công khai; bổ sung assertSafePublicHttpUrl vào ai-rewrite và verifyFileMagicBytes vào remote upload.",
      ],
      [
        "TRUNG BÌNH (Nghiệp vụ)",
        "lib/loyalty-events.ts, app/admin/_actions/orders.ts, data-checkout, coupons/check",
        "Chuyển đơn done -> returned không hoàn trừ điểm Loyalty (mã chỉ kiểm cancelled); đơn POS tạo mới trạng thái done không gọi onOrderStatusChanged; checkout đọc tier từ bảng members cũ (nơi diamond bị hạ thành gold) và coupons/check bỏ qua hạng diamond.",
        "Đồng bộ tier từ member_profiles khi checkout & kiểm coupon; kích hoạt tích điểm cho đơn POS (nếu có SĐT) và trừ điểm khi trả hàng.",
      ],
      [
        "TRUNG BÌNH (AI & Sync)",
        "quick-consult/analyze/route.ts, lab-analysis.ts, kiotviet.ts, BlockZone.tsx",
        "analyze/route.ts bỏ sót 3 trường disclaimer khi lưu cấu hình; lab-analysis.ts đi vòng lib/gemini-key.ts (hardcode gemini-3.8-flash, khóa claim không độc quyền); syncInventoryFromKiotViet chỉ lấy 100 SP đầu; BlockZone gắn nhầm link sửa /admin/blocks/10000X/ cho QR block.",
        "Hợp nhất lab-analysis qua AI Gateway và thêm khóa lease D1; thêm vòng lặp phân trang KiotViet; trỏ nút sửa QR trong BlockZone về /admin/qr/[id]/.",
      ],
      [
        "TRUNG BÌNH (Hiệu năng)",
        "app/layout.tsx & wrangler.jsonc",
        "app/layout.tsx đặt force-dynamic làm vô hiệu hóa revalidate cấp trang trên toàn Storefront; wrangler.jsonc chưa cấu hình triggers.crons cho 3 route cron định kỳ.",
        "Chuyển boot Theme sang cookie/client hoặc giữ force-dynamic có chủ đích kèm mở rộng unstable_cache cho products/posts/blocks; thêm triggers.crons vào wrangler.jsonc.",
      ],
      [
        "THẤP (Tài liệu)",
        "README.md, AGENTS.md, MindmapStudio.tsx, package.json",
        "README.md và phần đầu AGENTS.md vẫn ghi kiến trúc SQLite cục bộ cũ thay vì D1/Workers; MindmapStudio.tsx đã xây dựng nhưng chưa gắn vào trang Admin nào; package.json thiếu script npm test.",
        "Cập nhật tài liệu theo kiến trúc D1 hiện hành, gắn MindmapStudio vào menu Nội dung hoặc trình soạn thảo và thêm script 'test' vào package.json.",
      ],
    ],
    {
      table_cell_colors: [
        [""],
        ["#f4cccc", "", "", ""],
        ["#f4cccc", "", "", ""],
        ["#f4cccc", "", "", ""],
        ["#f4cccc", "", "", ""],
        ["#f4cccc", "", "", ""],
        ["#f4cccc", "", "", ""],
        ["#fff2cc", "", "", ""],
        ["#fff2cc", "", "", ""],
        ["#fff2cc", "", "", ""],
        ["#fff2cc", "", "", ""],
        ["#d9ead3", "", "", ""],
      ],
    },
  ),
  p(
    "Dựa trên mức độ tác động đến vận hành thực tế, lộ trình cải tiến được đề xuất thành 3 chặng ưu tiên rõ ràng:",
  ),
  bulletRuns([
    { text: "Giai đoạn 1 (Tuần 1 - Vá nóng An toàn & Dữ liệu): ", bold: true, text_color: "#D93025" },
    { text: "Bổ sung await cho newsletter và blocks/route.ts; sửa body.qty ?? body.quantity tại add-to-cart; sửa điều kiện if (ok.sent) trong CRM automation; khóa chặt xác thực CRON_SECRET và KiotViet Webhook bằng safeEqualSecret(); bổ sung kiểm tra vai trò RBAC cho toàn bộ API /api/admin/*.", bold: false, italic: false },
  ], 4, 3),
  bulletRuns([
    { text: "Giai đoạn 2 (Tuần 2 đến 3 - Đồng bộ Hạ tầng & Nghiệp vụ): ", bold: true, text_color: "#b45309" },
    { text: "Khai báo r2_buckets MEDIA_BUCKET trong wrangler.jsonc kèm hỗ trợ đọc R2 tại /api/media/[...path]; khai báo triggers.crons trong wrangler.jsonc; đồng nhất giảm giá hạng Kim cương 7% và hoàn điểm khi trả hàng; đưa lab-analysis.ts qua AI Gateway chuẩn và sửa đường dẫn sửa QR trong BlockZone.", bold: false, italic: false },
  ], 3, 3),
  bulletRuns([
    { text: "Giai đoạn 3 (Tháng 1+ - Tối ưu Hiệu năng Edge & Kiểm thử): ", bold: true, text_color: "#137333" },
    { text: "Đưa truy vấn products, posts, blocks, flashSale vào unstable_cache gắn thẻ để giảm số lượt đọc D1 trên mỗi lượt tải trang; tích hợp kiểm thử tích hợp (integration tests) cho luồng Checkout/Loyalty và cập nhật đồng bộ tài liệu README.md/AGENTS.md.", bold: false, italic: false },
  ], 3, 8),

  { op: "horizontal-rule" },
  {
    op: "append",
    text: "Báo cáo Phân tích Kỹ thuật Thực Dưỡng Phúc Thọ (thucduong-shop)  •  Tổng hợp trực tiếp từ mã nguồn HEAD 557fbf9  •  Tài liệu nội bộ",
    font_family: "Roboto",
    font_size: 8,
    italic: true,
    text_color: "#9aa0a6",
    alignment: "CENTER",
    space_above: 6,
  },
];

const batches = [
  { name: "batch_1.json", data: batch1 },
  { name: "batch_2.json", data: batch2 },
  { name: "batch_3.json", data: batch3 },
  { name: "batch_4.json", data: batch4 },
];

function validateOps(ops, name) {
  const jsonText = JSON.stringify(ops);
  for (let i = 0; i < jsonText.length; i++) {
    const c = jsonText[i];
    if (c === "\u2013" || c === "\u2014") {
      throw new Error(`Forbidden dash in ${name} near: ${jsonText.slice(Math.max(0, i - 40), i + 40)}`);
    }
  }
  for (let idx = 0; idx < ops.length; idx++) {
    const o = ops[idx];
    if (o.op === "append" && o.text === "") {
      throw new Error(`Empty append text at ${name}[${idx}]`);
    }
    if (o.op === "insert-table" && o.table_cell_colors) {
      if (o.table_cell_colors.length > o.table_data.length) {
        throw new Error(`table_cell_colors exceeds rows in ${name}[${idx}]`);
      }
    }
  }
}

for (const b of batches) {
  validateOps(b.data, b.name);
  const outPath = path.join(SCRATCH_DIR, b.name);
  fs.writeFileSync(outPath, JSON.stringify(b.data, null, 2), "utf8");
  console.log(`Wrote ${b.name}: ${b.data.length} ops, ${Math.round(fs.statSync(outPath).size / 1024)} KB`);
}
