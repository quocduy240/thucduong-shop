# Danh sách Các Phát hiện Kỹ thuật Trọng tâm từ Đợt Rà soát Mã nguồn

Tài liệu này tổng hợp và phân loại chi tiết 7 nhóm vấn đề kỹ thuật trọng tâm (`ISS-01` đến `ISS-07`) được phát hiện trong đợt rà soát toàn bộ mã nguồn dự án `thucduong-shop`, kèm theo đánh giá mức độ rủi ro, nguyên nhân gốc và phương án xử lý chuẩn hóa.

---

## Bảng Tổng hợp Nhanh

| Mã Issue | Nhóm Vấn đề | Mức độ | Tệp / Biểu tượng Ảnh hưởng Chính | Trạng thái |
|---|---|---|---|---|
| `ISS-01` | Bảo mật Cron & Webhook (Open-by-default & Timing Leak) | Cao | `app/api/cron/crm-automation/route.ts`, `app/api/cron/youtube-sync/route.ts`, `app/api/cron/compliance-sync/route.ts`, `app/api/kiotviet/webhook/route.ts` | Cần sửa ngay |
| `ISS-02` | Phân quyền RBAC chưa đồng bộ giữa UI và Page/API | Cao | `lib/auth.ts`, `app/admin/**/page.tsx`, `app/admin/*/export/route.ts`, `app/api/admin/**/route.ts` | Cần sửa ngay |
| `ISS-03` | Sai lệch tên trường số lượng giỏ hàng Landing Page | Cao | `components/CanhDuongSinhLanding.tsx`, `components/FlashSaleShowcase.tsx`, `app/api/v2/add-to-cart/[id]/route.ts` | Cần sửa ngay |
| `ISS-04` | Thiếu `await` trên các hàm bất đồng bộ D1 | Cao | `app/api/newsletter/route.ts`, `app/api/admin/blocks/route.ts` | Cần sửa ngay |
| `ISS-05` | Lỗi kiểm tra object kết quả SMTP và thiếu HTML Escape trong CRM | Cao | `lib/crm.ts` (`runCrmEmailAutomation`) | Cần sửa ngay |
| `ISS-06` | Hạ tầng Media R2 thiếu luồng đọc trực tiếp tại `/api/media/[...path]` | Cao / Trung bình | `lib/r2-storage.ts`, `app/api/media/[...path]/route.ts`, `wrangler.jsonc` | Cần sửa ngay |
| `ISS-07` | Caching tổng thể (`force-dynamic`) và thiếu lịch chạy định kỳ cho 3 Cron | Trung bình | `app/layout.tsx`, `wrangler.jsonc`, `.github/workflows/scheduled-crons.yml` | Cần chuẩn hóa |

---

## Chi tiết Từng Phát hiện Kỹ thuật

### ISS-01: Cron & Webhook cho phép chạy không xác thực khi thiếu secret và so sánh chuỗi không an toàn

- **Mức độ nghiêm trọng:** Cao (Bảo mật)
- **Tệp ảnh hưởng:**
  - `app/api/cron/crm-automation/route.ts`
  - `app/api/kiotviet/webhook/route.ts`
  - `app/api/cron/youtube-sync/route.ts`
  - `app/api/cron/compliance-sync/route.ts`
- **Mô tả hiện trạng & Nguyên nhân gốc:**
  1. Trong `app/api/cron/crm-automation/route.ts`, điều kiện `if (secret)` khiến toàn bộ khối kiểm tra xác thực bị bỏ qua nếu biến môi trường `CRON_SECRET` chưa được thiết lập (fail-open), dẫn tới bất kỳ ai gọi `GET /api/cron/crm-automation` cũng có thể kích hoạt gửi email hàng loạt. Ngoài ra, route này so sánh `auth !== \`Bearer ${secret}\`` và `urlSecret !== secret` bằng toán tử `!==` thông thường thay vì `safeEqualSecret()`, đồng thời chưa hỗ trợ fallback phiên đăng nhập Admin có quyền `/admin/crm/` hoặc phương thức `POST`.
  2. Trong `app/api/kiotviet/webhook/route.ts`, điều kiện `if (cfg.webhookSecret)` cũng rơi vào trạng thái fail-open khi Admin chưa điền `webhookSecret` trong `/admin/kiotviet/`. Nếu có cấu hình secret, hàm chỉ so sánh `provided !== cfg.webhookSecret` bằng toán tử `!==` thường và chưa hỗ trợ xác thực chuẩn chữ ký `X-Hub-Signature` (HMAC-SHA256) của KiotViet cũng như chưa xử lý mảng `Inventories[]` theo chi nhánh trong sự kiện `product.update`.
  3. Trong `app/api/cron/youtube-sync/route.ts` và `app/api/cron/compliance-sync/route.ts`, phần kiểm tra fallback mới chỉ gọi `currentAdmin()` (cho phép cả tài khoản vai trò thấp hơn nếu đang đăng nhập) thay vì siết đúng quyền theo đường dẫn module.
- **Tác động:** Người dùng ẩn danh có thể spam tác vụ CRM Email hoặc giả mạo webhook đẩy tồn kho sản phẩm về 0 hoặc sai lệch hàng loạt trên Production nếu cấu hình secret bị thiếu hoặc vô tình đặt rỗng.
- **Phương án xử lý:** Áp dụng nguyên tắc Fail-Closed trên toàn bộ Cron và Webhook, bắt buộc so sánh secret theo hằng thời gian (`safeEqualSecret()`), hỗ trợ HMAC-SHA256 cho KiotViet Webhook và siết quyền Admin fallback bằng `currentAdminForPath()`.

---

### ISS-02: Phân quyền Admin Pages & Admin APIs chưa khớp ma trận RBAC của `AdminNav`

- **Mức độ nghiêm trọng:** Cao (Phân quyền RBAC)
- **Tệp ảnh hưởng:**
  - `lib/auth.ts`
  - Các trang quản trị và route xuất CSV: `app/admin/orders/[id]/page.tsx`, `app/admin/orders/export/route.ts`, `app/admin/members/page.tsx`, `app/admin/members/export/route.ts`, `app/admin/loyalty/page.tsx`, `app/admin/sitemaps/page.tsx`, `app/admin/themes/page.tsx`, và các phân hệ quản trị khác trong `app/admin/*`
  - Các API quản trị trong `app/api/admin/**` (như `crm`, `loyalty`, `sitemaps`, `themes`, `quick-consult/send-email`, `quick-consult/analyze`, `blocks`, `videos/sync`, `lab-analysis`, `qr`, `ai-*`, `mindmap`, `admin/upload`)
- **Mô tả hiện trạng & Nguyên nhân gốc:**
  - Tệp `lib/rbac.ts` đã định nghĩa ma trận 4 vai trò (`super_admin`, `admin`, `editor`, `sales`) và hàm `canAccessAdminPath(role, pathname)` dùng để ẩn/hiện menu trên thanh `AdminNav`.
  - Tuy nhiên, nhiều page và route handler mới chỉ gọi `requireAdmin()` hoặc `currentAdmin()` (chỉ kiểm tra có đăng nhập là Admin hay không) mà không kiểm tra `canAccessAdminPath(admin.role, modulePath)`.
- **Tác động:** Một tài khoản có vai trò giới hạn như `editor` (chỉ được xem nội dung) có thể gõ trực tiếp URL `/admin/orders/[id]/`, `/admin/members/`, `/admin/loyalty/` hoặc gọi trực tiếp API `/api/admin/crm/`, `/api/admin/loyalty/`, `/admin/orders/export/` để xem dữ liệu khách hàng, doanh thu, đơn hàng; ngược lại tài khoản `sales` có thể truy cập hoặc gọi API cấu hình `themes`, `sitemaps`, `blocks`.
- **Phương án xử lý:** Bổ sung `requireAdminPath(...paths)` và `currentAdminForPath(...paths)` vào `lib/auth.ts` và áp dụng đồng bộ lên toàn bộ các trang `/admin/*`, export routes và `/api/admin/*`.

---

### ISS-03: Sai lệch tham số số lượng giữa Landing Page và API thêm vào giỏ hàng

- **Mức độ nghiêm trọng:** Cao (Lỗi Logic Nghiệp vụ)
- **Tệp ảnh hưởng:**
  - `components/CanhDuongSinhLanding.tsx`
  - `components/FlashSaleShowcase.tsx`
  - `app/api/v2/add-to-cart/[id]/route.ts`
- **Mô tả hiện trạng & Nguyên nhân gốc:**
  - `CanhDuongSinhLanding.tsx` (dòng 149) và `FlashSaleShowcase.tsx` (dòng 90) gửi payload JSON `{ quantity: qty }` tới `POST /api/v2/add-to-cart/[id]`.
  - Nhưng route handler `app/api/v2/add-to-cart/[id]/route.ts` (dòng 20) lại chỉ đọc `body.qty` (`Math.max(1, Math.floor(Number(body.qty) || 1))`), nên `body.qty` bị `undefined` và luôn rơi về mặc định `1`.
- **Tác động:** Khi khách hàng chọn mua 2, 3 hoặc nhiều hộp Canh Dưỡng Sinh trên trang landing `/canh-duong-sinh/` và bấm thêm giỏ / mua ngay, giỏ hàng chỉ nhận đúng 1 hộp, gây sai lệch đơn hàng và trải nghiệm mua sắm.
- **Phương án xử lý:** Cập nhật `app/api/v2/add-to-cart/[id]/route.ts` chấp nhận cả `body.qty`, `body.quantity` và query param `quantity` (kèm giới hạn an toàn `1..999`); đồng thời cập nhật `CanhDuongSinhLanding.tsx` và `FlashSaleShowcase.tsx` gửi cả `{ qty, quantity }` để tương thích hai chiều.

---

### ISS-04: Thiếu `await` trước các tác vụ bất đồng bộ D1 trong Route Handlers

- **Mức độ nghiêm trọng:** Cao (Lỗi Bất đồng bộ / Mất dữ liệu)
- **Tệp ảnh hưởng:**
  - `app/api/newsletter/route.ts`
  - `app/api/admin/blocks/route.ts`
- **Mô tả hiện trạng & Nguyên nhân gốc:**
  1. `app/api/newsletter/route.ts` gọi `run("INSERT INTO newsletter_subscribers ...", email, source)` mà không có từ khóa `await`. Trên Cloudflare Workers (`workerd`), HTTP Response trả về trước khi Promise ghi D1 hoàn tất có thể bị runtime hủy ngang, hoặc lỗi SQL bị nuốt mà API vẫn báo thành công.
  2. `app/api/admin/blocks/route.ts` trả về `Response.json({ items: getAllBlocks() })` mà không `await getAllBlocks()`. Do `getAllBlocks()` trả về một `Promise`, `JSON.stringify` tuần tự hóa Promise thành `{}` rỗng.
- **Tác động:** Đăng ký bản tin có nguy cơ mất dữ liệu hoặc không bắt lỗi ghi DB; API danh sách block `/api/admin/blocks/` luôn trả về `items: {}` thay vì mảng danh sách block thật.
- **Phương án xử lý:** Bổ sung `await` đầy đủ cho `run(...)` và `getAllBlocks()`, đồng thời bổ sung rate-limit IP cho `/api/newsletter` và bảo vệ `/api/admin/blocks` bằng `currentAdminForPath("/admin/blocks/")`.

---

### ISS-05: Lỗi kiểm tra truthiness trên object kết quả SMTP và thiếu HTML Escape trong CRM Email Automation

- **Mức độ nghiêm trọng:** Cao (Lỗi Logic & An toàn Nội dung Email)
- **Tệp ảnh hưởng:**
  - `lib/crm.ts` (`runCrmEmailAutomation`)
- **Mô tả hiện trạng & Nguyên nhân gốc:**
  - Hàm `sendEmail()` (trong `lib/mail.ts`) trả về một object dạng `{ sent: boolean; reason?: string }`.
  - Tại dòng 438-439 của `lib/crm.ts`, `runCrmEmailAutomation()` viết `const ok = await sendEmail(...); if (ok) { await markAutomationSent(...); sent++; }`. Trong JavaScript, bất kỳ object nào (`{ sent: false, reason: "..." }`) đều mang giá trị truthy.
  - Ngoài ra, `item.customerName` và `item.messageText` được nội suy trực tiếp vào chuỗi HTML email mà chưa qua `escapeHtml()`.
- **Tác động:** Ngay cả khi SMTP chưa cấu hình hoặc gửi thất bại, hệ thống vẫn đánh dấu khách hàng đã nhận email vào bảng log (`markAutomationSent`) và báo cáo tăng biến đếm `sent`, làm mất cơ hội chăm sóc khách hàng tự động ở các lần chạy sau.
- **Phương án xử lý:** Sửa điều kiện thành `if (ok.sent)` và bọc `escapeHtml(...)` cho mọi dữ liệu động đưa vào HTML email.

---

### ISS-06: Hạ tầng Media R2 thiếu luồng đọc trực tiếp khi chưa bật Custom CDN Domain

- **Mức độ nghiêm trọng:** Cao / Trung bình (Hạ tầng Media)
- **Tệp ảnh hưởng:**
  - `lib/r2-storage.ts`
  - `app/api/media/[...path]/route.ts`
  - `wrangler.jsonc`
- **Mô tả hiện trạng & Nguyên nhân gốc:**
  - Khi R2 `MEDIA_BUCKET` được gắn vào Worker nhưng biến môi trường `NEXT_PUBLIC_MEDIA_CDN_URL` chưa được thiết lập, `putMediaObject()` ghi file vào R2 thành công và trả về đường dẫn tương đối `/api/media/<cleanKey>`, bỏ qua việc ghi vào bảng `media_files` của D1.
  - Tuy nhiên `app/api/media/[...path]/route.ts` chỉ truy vấn `SELECT mime, data_base64 FROM media_files WHERE path = ?` từ D1 mà không đọc từ R2 (`MEDIA_BUCKET`), dẫn tới trả về `HTTP 404` cho mọi tệp vừa tải lên R2.
  - Đồng thời `wrangler.jsonc` chưa có cấu hình tham chiếu `r2_buckets` (cần lưu ý không khai báo binding trỏ vào bucket chưa tạo trên Cloudflare Account để tránh lỗi `cf:deploy`).
- **Tác động:** Ảnh và tài liệu mới upload khi bật R2 mà chưa cấu hình CDN domain sẽ bị lỗi gãy ảnh (`404 Not Found`).
- **Phương án xử lý:** Bổ sung `getMediaObject(mediaPath)` vào `lib/r2-storage.ts` để đọc trực tiếp từ `MEDIA_BUCKET`, cập nhật `/api/media/[...path]` ưu tiên đọc R2 trước rồi mới fallback D1 `media_files`, và ghi chú rõ cấu hình mẫu `r2_buckets` để bật ngay khi tạo bucket trên Cloudflare.

---

### ISS-07: Cấu hình Caching (`force-dynamic`) và thiếu lịch chạy tự động cho 3 Cron Routes

- **Mức độ nghiêm trọng:** Trung bình (Hiệu năng Caching & Vận hành Tự động)
- **Tệp ảnh hưởng:**
  - `app/layout.tsx`
  - `wrangler.jsonc`
  - `.github/workflows/scheduled-crons.yml` (cần bổ sung)
- **Mô tả hiện trạng & Nguyên nhân gốc:**
  1. `app/layout.tsx` đặt `export const dynamic = "force-dynamic"`. Thiết lập này là có chủ đích để ngăn lỗi build Next.js cố prerender tĩnh các trang công khai khi D1 cục bộ trong bước build CI chưa có dữ liệu/bảng, nhưng đồng thời vô hiệu hóa cơ chế `revalidate` cấp trang của các route con. Giải pháp tối ưu đúng chuẩn kiến trúc Edge D1 là giữ `force-dynamic` trên Root Layout và dùng `unstable_cache` (`cached()` + `CACHE_TAGS` trong `lib/cache.ts`) cho các truy vấn nóng.
  2. Có 3 route cron định kỳ đã viết sẵn (`/api/cron/crm-automation`, `/api/cron/youtube-sync`, `/api/cron/compliance-sync`) nhưng dự án chưa có lịch kích hoạt tự động (`triggers.crons` trên Worker OpenNext mặc định không tự định tuyến thẳng HTTP URL nếu thiếu custom `scheduled()` handler bên ngoài bundle `.open-next/worker.js`, nên dùng GitHub Actions Cron hoặc Cloudflare Worker Cron gọi endpoint có xác thực `CRON_SECRET` là an toàn và bền vững nhất).
- **Tác động:** Nếu không có bộ kích hoạt lịch định kỳ, các tác vụ gửi email CRM sau mua (+3 ngày / +25 ngày), đồng bộ video YouTube mới và kiểm tra tuân thủ y khoa hằng tuần sẽ không tự chạy nếu quản trị viên không bấm tay.
- **Phương án xử lý:** Tạo workflow `.github/workflows/scheduled-crons.yml` chạy định kỳ qua HTTPS kèm header `x-cron-secret` (fail-closed) cho cả 3 route cron, và rà soát tối ưu cache tag trong `lib/cache.ts`.
