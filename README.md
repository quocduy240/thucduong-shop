# Thực Dưỡng Phúc Thọ - Hệ thống Thương mại Điện tử, ERP Bán lẻ & Tư vấn Sức khỏe AI

Nền tảng thương mại điện tử (E-commerce), quản trị nội dung (CMS), vận hành bán lẻ đồng bộ KiotViet (POS, Kho, Sổ quỹ 3 Quỹ), chăm sóc khách hàng (CRM, Loyalty 4 hạng thẻ) và trợ lý tư vấn thực dưỡng bằng trí tuệ nhân tạo (Google Gemini AI), được vận hành trên hạ tầng **Cloudflare Workers (OpenNext) + Cloudflare D1 + KV + R2**.

* **Tên miền Production:** https://thucduongshop.duyvo.win
* **Báo cáo Kiến trúc & Kiểm định Kỹ thuật chi tiết:** xem thư mục `artifacts/` (`bao-cao-he-thong-thucduong-shop.docx`, `.pdf`, `.md` và bộ 8 sơ đồ kiến trúc trong `artifacts/diagrams/`).

---

## 1. Kiến trúc Công nghệ (Tech Stack)

| Tầng hệ thống | Công nghệ sử dụng | Vai trò chính |
|---|---|---|
| **Web Framework** | Next.js **16.2** (App Router), React **19.2**, TypeScript **5.9** | Server Components, Server Actions, Route Handlers tương thích hoàn toàn với Edge Runtime (`workerd`). |
| **Giao diện (UI)** | Tailwind CSS **4.2** (`@tailwindcss/turbopack`) | Thiết kế đáp ứng (Responsive), hỗ trợ đổi Theme màu sắc và cỡ chữ cho người lớn tuổi (`/admin/themes/`). |
| **Edge Compute** | `@opennextjs/cloudflare` **1.18** + Wrangler **4.81** | Đóng gói và triển khai ứng dụng Next.js lên mạng lưới **Cloudflare Workers** toàn cầu. |
| **Cơ sở dữ liệu** | **Cloudflare D1** (`thucduong-shop-db`, 39 bảng SQLite) | Lưu trữ hợp nhất cho sản phẩm, đơn hàng, kho, sổ quỹ, bài viết, thành viên, hồ sơ y khoa và hàng đợi AI (`lib/db.ts`). |
| **Bộ nhớ đệm & Lưu trữ** | **Cloudflare KV** + **Cloudflare R2** (`MEDIA_BUCKET`) + Image Resizing | Cache theo Tag (`unstable_cache` trong `lib/cache.ts`), lưu trữ file/ảnh nhị phân trên R2 kèm fallback D1 (`lib/media-assets.ts`). |
| **Trí tuệ Nhân tạo (AI)** | **Google Gemini API** (`lib/gemini-key.ts`) | Cổng AI hợp nhất với cơ chế tự động chuyển đổi dự phòng (Model Fallback Chain), hàng đợi tuần tự (`AiIdleQueueProvider`) và kiểm duyệt Y khoa/YMYL (`lib/medical-compliance.ts`). |

---

## 2. Các Phân hệ Nghiệp vụ Trọng tâm

### 2.1. Cửa hàng Trực tuyến & Nội dung Đa phương tiện (Storefront)
* **Bảo toàn 100% cấu trúc URL SEO từ hệ thống cũ (LoveItop):**
  * Danh sách kết thúc bằng dấu gạch chéo (`/san-pham/`, `/san-pham/<danh-muc>/`, `/thuc-duong/`, `/song-khoe/`).
  * Trang chi tiết kết thúc bằng `.html` (`/san-pham/<danh-muc>/<slug>.html`, `/<section>/<chuyen-muc>/<slug>.html`, `/gioi-thieu.html`, `/tu-van-nhanh.html`).
* **Trang đích chuyên biệt & Giờ vàng Flash Sale:**
  * Trang chuyên đề Canh Dưỡng Sinh (`/canh-duong-sinh`) tích hợp bộ đếm ngược, bảng so sánh, câu hỏi thường gặp và đặt mua nhanh.
  * Hệ thống Giờ vàng giá sốc (`FlashSaleShowcase`) cấu hình theo nhiều khung giờ trong ngày.
* **Thư viện Video & Tài liệu Thực dưỡng:**
  * Trang `/video` đồng bộ tự động từ kênh/playlist YouTube và nhận diện bài viết liên quan.
  * Trang `/tai-lieu` hỗ trợ xem trước, tải tài liệu PDF và cộng điểm thưởng cho thành viên.

### 2.2. Quản trị Bán lẻ, Kho vận, POS & Đồng bộ KiotViet (`/admin/`)
* **6 trạng thái đơn hàng chuẩn vận hành:** `new` (Mới) -> `confirmed` (Đã xác nhận) -> `shipping` (Đang giao) -> `done` (Hoàn thành), `returned` (Khách trả hàng / Hoàn kho) và `cancelled` (Đã hủy).
* **Bán hàng tại quầy / Telesale (`/admin/pos/`):** Tìm nhanh theo tên/mã SKU, tự động trừ kho, ghi thẻ kho (`stock_movements`) và lập phiếu thu vào đúng quỹ tương ứng.
* **Sổ quỹ Thu - Chi 3 Quỹ (`/admin/inventory/?tab=cashbook`):** Quản lý tách biệt Quỹ Tiền mặt (`cash`), Quỹ Chuyển khoản Ngân hàng (`bank_transfer`) và Quỹ Theo KiotViet (`kiotviet`), kèm Báo cáo cuối ngày (EOD) tính giá vốn (COGS) và lãi gộp.
* **In Hóa đơn chuẩn KiotViet (`/admin/orders/[id]/`):** Hỗ trợ khổ A5 Dọc, A5 Ngang, A4, K80 với 16 khối hiển thị tùy chỉnh, đọc số tiền bằng chữ tiếng Việt và mã VietQR động.
* **Đồng bộ KiotViet 2 chiều (`/admin/kiotviet/`):** Nhập hàng loạt từ file Excel/CSV KiotViet (preview, lọc dịch vụ, tự tạo nhóm hàng) và đồng bộ tồn kho nhiều trang qua REST API + Webhook xác thực chữ ký bí mật.

### 2.3. Thành viên, Tích điểm (Loyalty Ledger) & CRM Automation
* **4 hạng thẻ thành viên:** Đồng (`bronze`), Bạc (`silver` - giảm 2%, nhân 1.2x điểm), Vàng (`gold` - giảm 5%, nhân 1.5x điểm), Kim Cương (`diamond` - giảm 7%, nhân 2.0x điểm).
* **Sổ cái điểm thưởng hợp nhất (`point_transactions`):**
  * Cộng điểm tự động khi đơn hàng chuyển sang `done` (kể cả đơn POS có thông tin khách) và **tự động thu hồi điểm (`refund_reversal`)** nếu đơn đã hoàn thành bị hủy hoặc trả hàng.
  * Thưởng đăng ký mới (+50 điểm), điểm danh hằng ngày theo múi giờ `Asia/Ho_Chi_Minh` (+5 điểm/ngày, chuỗi 7 ngày +50 điểm, 30 ngày +200 điểm), giới thiệu bạn bè (`referrals`), đọc bài viết và đánh giá sản phẩm đã mua (`Verified Purchase`).
* **CRM Automation (`/admin/crm/`):** Tự động lên lịch chăm sóc khách hàng sau mua (+3 ngày hướng dẫn sử dụng, +25 ngày nhắc mua lại) và gửi email qua SMTP khi Cron được kích hoạt.

### 2.4. Hệ sinh thái Trợ lý AI & Tuân thủ Y khoa
* **Tư vấn Sức khỏe Nhanh (`/tu-van-nhanh.html` & `/admin/quick-consult/`):** Phân tích BMI, khẩu phần ăn 24h, bệnh lý nền và thói quen sinh hoạt để gợi ý phác đồ 3 trụ cột (Thức ăn nền tảng, Trợ phương thực dưỡng, Dược thảo hỗ trợ) kèm liên kết chia sẻ hồ sơ sức khỏe (`/ho-so-suc-khoe/[token]`).
* **Phân tích Phiếu Xét nghiệm AI (`/admin/lab-analysis/`):** Trích xuất chỉ số xét nghiệm từ ảnh/PDF bằng Gemini Vision qua hàng đợi khóa phiên D1 (`lab_analysis_jobs`).
* **AI Content & Image Studio:** Viết lại bài viết theo 9 Motif thực dưỡng (`/api/admin/ai-rewrite/`), viết mô tả sản phẩm chuẩn SEO (`/api/admin/products/ai-rewrite/`), tạo sơ đồ tư duy bài viết (`/api/admin/mindmap/`) và xóa watermark/số điện thoại trên ảnh (`/api/admin/ai-image-edit/`).
* **Tuân thủ Pháp luật Y tế & Google YMYL (`lib/medical-compliance.ts`):** Tự động lọc các cụm từ cam kết chữa khỏi bệnh tuyệt đối và chèn khung khuyến cáo y khoa (`lib/medical-disclaimer.ts`).

### 2.5. Phân quyền Quản trị 4 Vai trò (RBAC) & Bảo mật
* **4 vai trò quản trị (`lib/rbac.ts` & `lib/auth.ts`):**
  * `super_admin`: Toàn quyền hệ thống và quản lý tài khoản quản trị.
  * `admin`: Vận hành toàn bộ cửa hàng, kho, nội dung, AI và cài đặt.
  * `editor`: Chuyên trách nội dung (Bài viết, Danh mục, Bình luận, Trang tĩnh, Video, Tài liệu, Khối giao diện, Mã QR, Sitemaps).
  * `sales`: Chuyên trách bán hàng và chăm sóc khách (Đơn hàng, POS, Kho & Sổ quỹ, Sản phẩm, Flash Sale, Thành viên, Loyalty, CRM, Tư vấn AI).
* Mọi trang `/admin/*`, API `/api/admin/*` và Server Actions đều kiểm tra quyền trực tiếp ở tầng máy chủ qua `requireAdminPath()`, `currentAdminForPath()` và `requireAdminAction()`.

---

## 3. Yêu cầu Môi trường & Các Lệnh Vận hành

### 3.1. Yêu cầu cài đặt
* **Node.js:** Khuyên dùng **24.x** (xem `.nvmrc`), tương thích từ Node 20.x/22.x trở lên khi chạy kèm `tsx`.
* **Trình quản lý gói:** `npm` (đi kèm Node.js).

### 3.2. Bảng lệnh thường dùng

| Tác vụ | Câu lệnh | Mô tả |
|---|---|---|
| Cài đặt thư viện | `npm ci` (hoặc `npm install`) | Cài đặt đúng phiên bản các gói phụ thuộc từ `package-lock.json`. |
| Chạy máy chủ phát triển | `npm run dev` | Khởi chạy Next.js dev server tại `http://localhost:3000`. |
| Kiểm tra kiểu dữ liệu | `npm run typecheck` | Chạy `next typegen` và `tsc --noEmit` để kiểm tra toàn bộ kiểu TypeScript. |
| Chạy kiểm thử đơn vị | `npm test` | Chạy 24 bài kiểm thử đơn vị (RBAC, Checkout Pricing, Rate Limit, Media Magic-Byte, HTML Extract, Logger, Image URL, Backup Verify). |
| Đóng gói Cloudflare | `npm run cf:build` | Biên dịch ứng dụng sang định dạng OpenNext Worker (`.open-next/`). |
| Triển khai Production | `npm run cf:deploy` | Build và đẩy bản phát hành lên Cloudflare Workers (`thucduongshop.duyvo.win`). |
| Kiểm định file sao lưu D1 | `npm run backup:verify -- <file.sql>` | Kiểm tra tính toàn vẹn của bản xuất SQL D1 (bảng trọng yếu, câu lệnh INSERT). |
| Import bài viết (Offline CLI) | `npm run import:post -- <url>` | Cào bài viết và ảnh từ trang gốc bằng script cục bộ (`scripts/import-post.mjs`). |
| Import sản phẩm (Offline CLI) | `npm run import:products` | Cào danh mục và sản phẩm từ sitemap trang gốc (`scripts/import-products.mjs`). |

---

## 4. Cấu trúc Thư mục Dự án

```text
app/
  page.tsx                        Trang chủ (Flash Sale, Khối danh mục sản phẩm, Bài viết mới)
  san-pham/                       Danh sách sản phẩm, danh mục và chi tiết sản phẩm (.html)
  [section]/                      Chuyên mục bài viết (/thuc-duong/, /song-khoe/), chi tiết bài (.html), trang tĩnh
  canh-duong-sinh/                Landing page chuyên đề Canh Dưỡng Sinh King Kung
  tu-van-nhanh.html/              Giao diện Tư vấn Sức khỏe AI cho khách hàng
  ho-so-suc-khoe/[token]/         Bản báo cáo hồ sơ sức khỏe cá nhân hóa (in PDF / chia sẻ)
  tai-khoan/                      Cổng thành viên (Đăng nhập, Đăng ký, Điểm thưởng, Lịch sử đơn)
  cart/, checkout/                Giỏ hàng, thanh toán, áp mã giảm giá và đổi điểm
  admin/                          22 phân hệ Quản trị viên (Dashboard, POS, Orders, Inventory, Products, Posts, CRM, Loyalty, AI...)
    _actions/                     Server Actions phân tách theo miền nghiệp vụ (có bảo vệ RBAC)
  api/
    v2/add-to-cart/[id]/          API thêm sản phẩm vào giỏ hàng
    data-checkout/                API tính giá, trừ tồn kho, quy đổi điểm và tạo đơn hàng
    coupons/check/                API kiểm tra mã giảm giá và ưu đãi hạng thẻ
    media/[...path]/              API phát trực tiếp file/ảnh từ R2 (ưu tiên) hoặc D1 media_files
    cron/crm-automation/          Endpoint chạy tự động hóa CRM (yêu cầu CRON_SECRET)
    kiotviet/webhook/             Endpoint nhận đồng bộ thời gian thực từ KiotViet (yêu cầu chữ ký HMAC/Secret)
    admin/                        Hệ thống REST API phục vụ trang quản trị và các tác vụ AI
components/
  Header.tsx, Footer.tsx          Khung giao diện cửa hàng và nút Sửa nhanh theo quyền Admin
  CanhDuongSinhLanding.tsx        Giao diện trang chuyên đề Canh Dưỡng Sinh
  FlashSaleShowcase.tsx           Khung Giờ vàng giá sốc đếm ngược
  QuickConsultClient.tsx          Ứng dụng tương tác Tư vấn Sức khỏe AI
  admin/                          Bộ component quản trị (RichTextEditor, AiIdleQueueProvider, AdminHandbookDrawer...)
lib/
  db.ts                           Kết nối Cloudflare D1 (DB binding), SCHEMA 39 bảng, migrate() và async helpers (all, one, run, batch)
  auth.ts, rbac.ts                Xác thực phiên Admin (scrypt) và ma trận phân quyền 4 vai trò
  member-auth.ts                  Xác thực phiên Thành viên cửa hàng
  data.ts, admin-data.ts          Truy vấn dữ liệu cửa hàng, bộ tạo đường dẫn chuẩn url.* và truy vấn quản trị
  checkout-helpers.ts             Nguồn chân lý duy nhất (Single Source of Truth) tính giá đơn hàng, chiết khấu hạng thẻ, voucher và điểm
  loyalty.ts, loyalty-events.ts   Sổ cái điểm thưởng, chuỗi điểm danh, giới thiệu bạn bè và thu hồi điểm khi hủy/hoàn đơn
  inventory.ts, kiotviet.ts       Quản lý thẻ kho, sổ quỹ 3 quỹ, báo cáo cuối ngày và đồng bộ KiotViet
  crm.ts                          Tự động hóa lịch chăm sóc khách hàng và gửi email
  gemini-key.ts                   Cổng kết nối Google Gemini AI và chuỗi fallback mô hình
  quick-consult.ts, lab-analysis.ts, medical-compliance.ts, medical-disclaimer.ts
  media-assets.ts, r2-storage.ts, media-security.ts, image-url.ts
  rate-limit.ts, security.ts, logger.ts, cache.ts
  admin-handbook.ts               Dữ liệu Cẩm nang Hướng dẫn Quản trị viên tích hợp sẵn trong /admin/*
.agents/skills/                   Các kỹ năng chuyên biệt hướng dẫn AI Agent làm việc với dự án
.github/workflows/                Pipeline CI/CD triển khai Cloudflare Workers và Sao lưu D1 hằng ngày
artifacts/                        Hồ sơ Báo cáo Kiến trúc Hệ thống (.docx, .pdf, .md) và sơ đồ (.png, .html)
```

---

## 5. Sao lưu Dữ liệu & Vận hành Tự động (CI/CD)

* **Triển khai Tự động (`deploy-cloudflare.yml`):** Tự động kiểm tra kiểu dữ liệu, chạy bộ kiểm thử đơn vị, đóng gói OpenNext và triển khai lên Cloudflare Workers khi có thay đổi trên nhánh `main`.
* **Sao lưu Cơ sở dữ liệu D1 Hằng ngày (`d1-backup.yml`):** Tự động xuất toàn bộ dữ liệu D1 vào lúc 03:00 sáng (giờ Việt Nam), chạy `scripts/verify-d1-backup.mjs` để xác nhận đủ bảng và dữ liệu trước khi nén `.gz` lưu trữ 30 ngày trên GitHub Artifacts.

---

## 6. Tài liệu dành cho AI Coding Agents

Khi làm việc cùng các trợ lý lập trình AI (Google Antigravity, Claude Code, Cursor), toàn bộ quy tắc kiến trúc và quy trình kiểm định được định nghĩa tại:
* **`AGENTS.md`** (và **`CLAUDE.md`**): Quy chuẩn kỹ thuật cốt lõi của dự án.
* **[Skill `thucduong-shop`](.agents/skills/thucduong-shop/SKILL.md)**: Skill chung cho Admin, RBAC, ERP, loyalty, CRM, kiến trúc AI và quy trình kiểm thử, triển khai Cloudflare. Chỉ đọc tài liệu tham chiếu phù hợp với tác vụ đang làm.
