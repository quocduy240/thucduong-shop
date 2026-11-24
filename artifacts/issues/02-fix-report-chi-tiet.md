# Báo cáo Chi tiết Khắc phục Các Phát hiện Kỹ thuật (Issue -> Solution -> Verification)

Tài liệu này ghi nhận chi tiết toàn bộ quá trình phân tích nguyên nhân gốc, giải pháp kỹ thuật đã triển khai, danh sách tệp đã cập nhật và kết quả kiểm định sau khi xử lý toàn bộ 7 nhóm phát hiện kỹ thuật (`ISS-01` đến `ISS-07`) cùng việc đồng bộ hóa thương hiệu sang **Thực Dưỡng Phúc Thọ**.

---

## 1. Tổng hợp Kết quả Xử lý

| Mã Issue | Hạng mục | Mức độ | Trạng thái | Tệp Sửa đổi / Bổ sung Chính |
|---|---|---|---|---|
| `ISS-01` | Bảo mật Fail-Closed Cron & Webhook KiotViet (HMAC-SHA256 + `safeEqualSecret`) | Cao | Đã hoàn thành | `app/api/cron/crm-automation/route.ts`, `app/api/cron/youtube-sync/route.ts`, `app/api/cron/compliance-sync/route.ts`, `app/api/kiotviet/webhook/route.ts` |
| `ISS-02` | Siết chặt phân quyền RBAC trên Pages, Export Routes & APIs khớp `AdminNav` | Cao | Đã hoàn thành | `lib/auth.ts` + 44 tệp trong `app/admin/**/page.tsx`, `app/admin/**/route.ts`, `app/api/admin/**/route.ts` |
| `ISS-03` | Đồng bộ tham số số lượng giỏ hàng Landing Page (`qty` / `quantity`) | Cao | Đã hoàn thành | `app/api/v2/add-to-cart/[id]/route.ts`, `components/CanhDuongSinhLanding.tsx`, `components/FlashSaleShowcase.tsx` |
| `ISS-04` | Bổ sung `await` còn thiếu trên các tác vụ D1 | Cao | Đã hoàn thành | `app/api/newsletter/route.ts`, `app/api/admin/blocks/route.ts` |
| `ISS-05` | Sửa kiểm tra kết quả gửi SMTP `if (ok.sent)` & chống HTML Injection trong CRM | Cao | Đã hoàn thành | `lib/crm.ts` (`runCrmEmailAutomation`) |
| `ISS-06` | Hỗ trợ đọc Media trực tiếp từ Cloudflare R2 `MEDIA_BUCKET` + D1 fallback kép | Cao / TB | Đã hoàn thành | `lib/r2-storage.ts`, `app/api/media/[...path]/route.ts`, `wrangler.jsonc` |
| `ISS-07` | Chuẩn hóa kiến trúc Caching & Tự động hóa lịch 3 Cron định kỳ | Trung bình | Đã hoàn thành | `.github/workflows/scheduled-crons.yml`, `lib/admin-handbook.ts` |
| `BRAND` | Làm sạch toàn bộ dấu vết thương hiệu cũ sang Phúc Thọ / `thucduongphuctho.net` | Bổ sung | Đã hoàn thành | `components/admin/ProductDescriptionAiPanel.tsx`, `scripts/import-post.mjs`, `scripts/import-products.mjs`, 2 tệp PNG trong `public/uploads/products/` |

---

## 2. Chi tiết Kỹ thuật: Vấn đề, Nguyên nhân & Giải pháp Từng Hạng mục

### 2.1. ISS-01: Bảo mật Fail-Closed cho Cron Endpoints & Webhook KiotViet

- **Issue (Vấn đề):**
  - `app/api/cron/crm-automation/route.ts` kiểm tra `if (secret)` trước khi xác thực: nếu biến môi trường `CRON_SECRET` chưa cấu hình trên Cloudflare Worker, bất kỳ người dùng ẩn danh nào cũng gọi được endpoint này; ngoài ra route dùng `!==` thông thường và chưa hỗ trợ fallback quyền Admin hoặc phương thức `POST`.
  - `app/api/kiotviet/webhook/route.ts` kiểm tra `if (cfg.webhookSecret)` (cho qua toàn bộ request nếu Admin chưa nhập secret), so sánh secret bằng `!==` qua header/query và chưa xác thực chữ ký `X-Hub-Signature` (HMAC-SHA256) của KiotViet.
  - `app/api/cron/youtube-sync/route.ts` và `app/api/cron/compliance-sync/route.ts` mới kiểm tra `currentAdmin()` ở bước fallback thay vì kiểm tra quyền theo phân hệ.
- **Solution (Giải pháp đã áp dụng):**
  1. **Cron Fail-Closed & Constant-Time Comparison:** Trong cả 3 route cron (`/api/cron/crm-automation`, `/api/cron/youtube-sync`, `/api/cron/compliance-sync`), hợp nhất logic trích xuất secret từ 3 nguồn (`x-cron-secret`, `x-idle-secret`, `Authorization: Bearer <token>`), đối chiếu với `CRON_SECRET` / `IDLE_WORKER_SECRET` qua `safeEqualSecret()` (`crypto.timingSafeEqual`). Nếu không có secret khớp, chỉ cho phép thực thi khi có phiên Admin hợp lệ đúng module (`currentAdminForPath("/admin/crm/")`, `currentAdminForPath("/admin/videos/")`, `currentAdminForPath("/admin/quick-consult/", "/admin/posts/")`); ngược lại trả về `HTTP 401`.
  2. **KiotViet Webhook Fail-Closed & Xác thực HMAC-SHA256:**
     - Chặn ngay bằng `HTTP 503` nếu `cfg.webhookSecret` chưa được cấu hình trong `/admin/kiotviet/`.
     - Đọc nguyên bản `rawBody = await req.text()` để băm `HMAC-SHA256` bằng `cfg.webhookSecret` và so sánh với Header `X-Hub-Signature` / `x-signature` (cả dạng Hex, Base64 và có/không có tiền tố `sha256=`) thông qua `safeEqualSecret()`, đồng thời giữ tương thích cho `x-webhook-secret` và `?secret=`.
     - Mở rộng parser bóc tách payload hỗ trợ cả sự kiện `stock.update` (`ProductCode` + `OnHand`) lẫn `product.update` (`Code` + `Inventories[]` lọc theo `cfg.branchId`).

---

### 2.2. ISS-02: Đồng bộ Phân quyền RBAC trên Pages, Export Routes & Admin APIs

- **Issue (Vấn đề):**
  - `lib/rbac.ts` đã định nghĩa ma trận 4 vai trò (`super_admin`, `admin`, `editor`, `sales`) và hàm `canAccessAdminPath(role, path)` dùng để lọc menu trên `AdminNav`, nhưng 24 trang/export route (bao gồm `orders/[id]`, `members`, `members/export`, `loyalty`, `sitemaps`, `themes`, `blocks`, `posts`, `products`, `qr`, `videos`, `documents`, `pages`, `categories`, `comments`, `flash-sale`, `quick-consult`, `lab-analysis`) chỉ gọi `requireAdmin()`, còn 20 API routes (bao gồm `crm`, `loyalty`, `sitemaps`, `themes`, `quick-consult/send-email`, `orders/export`, `blocks`, `upload`, `ai-*`) chỉ gọi `currentAdmin()`.
- **Solution (Giải pháp đã áp dụng):**
  1. Bổ sung 2 hàm chuẩn hóa vào `lib/auth.ts`:
     - `requireAdminPath(...paths: string[])`: kiểm tra phiên đăng nhập và đối chiếu `canAccessAdminPath(a.role, p)`; nếu không đủ quyền sẽ chuyển hướng về `/admin/?error=...`.
     - `currentAdminForPath(...paths: string[])`: trả về đối tượng `Admin` chỉ khi vai trò được phép truy cập ít nhất 1 đường dẫn truyền vào; trả về `undefined` để route API trả mã `401/403`.
  2. Áp dụng đồng bộ `requireAdminPath(...)` lên toàn bộ 24 trang quản trị và route export CSV, và `currentAdminForPath(...)` lên toàn bộ 20 API quản trị (trong đó các endpoint dùng chung như `/admin/upload` hoặc `/api/admin/ai-image-edit/` truyền đầy đủ các prefix hợp lệ như `"/admin/upload", "/admin/posts/", "/admin/products/"`).

---

### 2.3. ISS-03: Đồng bộ Tham số Số lượng Giỏ hàng từ Landing Page Canh Dưỡng Sinh

- **Issue (Vấn đề):**
  - `components/CanhDuongSinhLanding.tsx` (dòng 149) và `components/FlashSaleShowcase.tsx` (dòng 90) gửi `{ quantity: qty }`, trong khi `app/api/v2/add-to-cart/[id]/route.ts` chỉ đọc `body.qty`, làm rơi về mặc định `1` khi khách chọn nhiều hộp trên Landing Page.
- **Solution (Giải pháp đã áp dụng):**
  - Nâng cấp `app/api/v2/add-to-cart/[id]/route.ts` đọc ưu tiên `body.qty ?? body.quantity ?? searchParams.get("quantity") ?? 1` và chuẩn hóa trong khoảng an toàn `1..999` (sau đó kiểm tra giới hạn tồn kho thực `prod.stock`).
  - Cập nhật `CanhDuongSinhLanding.tsx` và `FlashSaleShowcase.tsx` gửi cả hai khóa `{ qty, quantity }` để bảo đảm tương thích ngược và xuôi.

---

### 2.4. ISS-04: Bổ sung `await` trên Route Handlers Bất đồng bộ

- **Issue (Vấn đề):**
  - `app/api/newsletter/route.ts` gọi `run(...)` mà không `await`, có nguy cơ Worker kết thúc request trước khi lệnh INSERT vào Cloudflare D1 kịp thực thi.
  - `app/api/admin/blocks/route.ts` gọi `getAllBlocks()` mà không `await`, làm `JSON.stringify` tuần tự hóa Promise thành `{}`.
- **Solution (Giải pháp đã áp dụng):**
  - Thêm `await` trước `run(...)` trong `app/api/newsletter/route.ts`, đồng thời bổ sung rate limiting theo IP (`namespace: "newsletter"`, tối đa 8 lượt / 5 phút) chống spam đăng ký.
  - Thêm `await getAllBlocks()` trong `app/api/admin/blocks/route.ts` và nâng cấp kiểm tra quyền bằng `currentAdminForPath("/admin/blocks/")`.

---

### 2.5. ISS-05: Sửa Logic Kiểm tra Trạng thái Gửi Mail & Lọc HTML trong CRM Automation

- **Issue (Vấn đề):**
  - Hàm `sendEmail()` trong `lib/mail.ts` luôn trả về object `{ sent: boolean; error?: string }`. Trong `lib/crm.ts` (`runCrmEmailAutomation`), dòng `if (ok)` luôn đánh giá là `true` ngay cả khi `ok = { sent: false, error: "..." }`, gây đánh dấu sai trạng thái đã gửi mail (`markAutomationSent`). Ngoài ra, tên khách hàng và nội dung tin nhắn chưa được thoát HTML trước khi ghép vào mẫu email.
- **Solution (Giải pháp đã áp dụng):**
  - Sửa điều kiện thành `if (ok.sent)` để chỉ ghi nhận bảng log `crm_automation_logs` và tăng biến đếm `sent` khi SMTP gửi thành công thực sự.
  - Bọc `escapeHtml(item.customerName)` và `escapeHtml(item.messageText)` (từ `lib/security.ts`) khi tạo nội dung HTML email trong `runCrmEmailAutomation()`.

---

### 2.6. ISS-06: Hoàn thiện Cơ chế Đọc Media R2 Trực tiếp tại `/api/media/[...path]`

- **Issue (Vấn đề):**
  - `lib/r2-storage.ts` đã có `putMediaObject()` ghi vào Cloudflare R2 (`MEDIA_BUCKET`) nếu binding tồn tại và trả về URL `/api/media/<cleanKey>` khi chưa đặt `NEXT_PUBLIC_MEDIA_CDN_URL`. Tuy nhiên `app/api/media/[...path]/route.ts` chỉ truy vấn D1 (`media_files`) mà chưa có hàm đọc từ R2, cũng chưa dự phòng đọc bảng `media_assets` (do `lib/media-assets.ts` tạo ra).
  - Trong `wrangler.jsonc`, chưa có cấu hình mẫu `r2_buckets` để hướng dẫn kích hoạt bucket khi cần.
- **Solution (Giải pháp đã áp dụng):**
  1. Bổ sung phương thức `get?(key)` vào `R2BucketLike` và triển khai hàm `getMediaObject(mediaPath)` trong `lib/r2-storage.ts` (thử đọc đúng `cleanKey` và fallback khóa `media/${cleanKey}` khớp với `saveMediaAsset()`).
  2. Cập nhật `app/api/media/[...path]/route.ts` theo thứ tự ưu tiên 3 tầng: đọc R2 `MEDIA_BUCKET` trước (`X-Media-Storage: r2`) -> fallback bảng D1 `media_files` (`X-Media-Storage: d1-files`) -> fallback bảng D1 `media_assets` cho đường dẫn đơn (`X-Media-Storage: d1-assets`).
  3. Bổ sung khối chú thích cấu hình `r2_buckets` trong `wrangler.jsonc` (giữ ở dạng comment có hướng dẫn `npx wrangler r2 bucket create thucduong-media` để không làm gãy lệnh `npm run cf:deploy` trên các môi trường chưa tạo bucket R2).

---

### 2.7. ISS-07: Kiến trúc Caching trên Cloudflare Edge & Tự động hóa 3 Cron Định kỳ

- **Issue & Phân tích Kiến trúc:**
  - `app/layout.tsx` khai báo `export const dynamic = "force-dynamic"`. Qua kiểm tra lịch sử commit (`8522202`) và hướng dẫn dự án (`AGENTS.md`), cấu hình này là **có chủ đích** để OpenNext / Next.js 16 không cố gắng prerender tĩnh các route phụ thuộc D1 trong quá trình CI build khi D1 cục bộ chưa được nạp schema/dữ liệu. Do đó, việc giữ `force-dynamic` tại Root Layout là bắt buộc để bảo đảm build thành công; cơ chế tối ưu tốc độ đọc và giảm tải D1 được thực hiện thông qua Data Cache gắn tag KV (`unstable_cache` / `cached()` kết hợp `CACHE_TAGS` và `invalidateStorefront()` trong `lib/cache.ts` và `lib/cache-tags.ts`).
  - Ba route cron (`/api/cron/crm-automation/`, `/api/cron/youtube-sync/`, `/api/cron/compliance-sync/`) trước đó chưa có lịch kích hoạt tự động. Do `@opennextjs/cloudflare` sinh bundle `.open-next/worker.js` theo handler `fetch` mà không tự động ánh xạ `triggers.crons` tới route App Router nếu không viết wrapper worker tùy chỉnh, giải pháp ổn định nhất là cấu hình lịch chạy qua GitHub Actions Cron gọi thẳng HTTPS endpoint kèm header `x-cron-secret`.
- **Solution (Giải pháp đã áp dụng):**
  - Tạo workflow `.github/workflows/scheduled-crons.yml` thiết lập 3 lịch chạy định kỳ và hỗ trợ chạy thủ công (`workflow_dispatch`):
    - `08:00` giờ Việt Nam hằng ngày (`0 1 * * *` UTC): `POST https://thucduongshop.duyvo.win/api/cron/youtube-sync/`
    - `09:00` giờ Việt Nam hằng ngày (`0 2 * * *` UTC): `POST https://thucduongshop.duyvo.win/api/cron/crm-automation/`
    - `10:00` giờ Việt Nam thứ Hai hằng tuần (`0 3 * * 1` UTC): `POST https://thucduongshop.duyvo.win/api/cron/compliance-sync/`
  - Workflow gửi kèm header `x-cron-secret: ${{ secrets.CRON_SECRET }}` khớp cơ chế Fail-Closed đã triển khai ở `ISS-01`.

---

### 2.8. Làm sạch Dấu vết Thương hiệu & Đồng bộ Cẩm nang Quản trị

- **Thay thế từ khóa thương hiệu cũ sang Phúc Thọ / `thucduongphuctho.net`:**
  - `components/admin/ProductDescriptionAiPanel.tsx`: cập nhật placeholder tên miền ví dụ từ `thucduongthienan.com` sang `thucduongphuctho.net`.
  - `scripts/import-post.mjs` và `scripts/import-products.mjs`: cập nhật `ORIGIN` và `SOURCE_HOSTS` sang `thucduongphuctho.net` và `www.thucduongphuctho.net`.
  - Đổi tên 2 tệp ảnh trong `public/uploads/products/` từ `*-thuc-duong-thien-an.png` sang `*-thuc-duong-phuc-tho.png` (đã quét toàn bộ mã nguồn để xác nhận không có liên kết bị gãy).
- **Đồng bộ Cẩm nang Quản trị (`lib/admin-handbook.ts`):**
  - Cập nhật mục hướng dẫn Bảo mật RBAC, Fail-Closed Cron/Webhook và Cơ chế đọc Media R2/D1 theo đúng quy chuẩn `Admin Handbook Auto-Sync Rule`.

---

## 3. Kết quả Kiểm định Tổng thể Sau Khi Sửa lỗi

- **Kiểm thử đơn vị (`npx --yes tsx --test ...`):** Toàn bộ **24/24** test case trong 8 bộ kiểm thử (`backup-verify.test.ts`, `checkout-helpers.test.ts`, `html-extract.test.ts`, `image-url.test.ts`, `logger.test.ts`, `media-security.test.ts`, `rate-limit.test.ts`, `rbac.test.ts`) đạt 100%, 0 lỗi (lưu ý: `package.json` hiện chưa khai báo script `"test"` riêng nên chạy trực tiếp qua `tsx --test`).
- **Kiểm tra kiểu TypeScript (`npm run typecheck`):** `next typegen && tsc --noEmit` hoàn tất với mã thoát `0` (0 lỗi kiểu dữ liệu trên toàn bộ route và library).
- **Quét dấu vết thương hiệu cũ & quy tắc trình bày:** 0 kết quả khớp từ khóa thương hiệu cũ trong mã nguồn, tài liệu gốc hay tên tệp ảnh; 0 ký tự gạch ngang cấm (`U+2013` / `U+2014`) trong các tài liệu mới.
