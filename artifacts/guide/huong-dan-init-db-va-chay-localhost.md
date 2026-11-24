# Hướng dẫn Init Database (Cloudflare D1) và Chạy Thử trên Localhost

Tài liệu này hướng dẫn từng bước cách cài đặt môi trường, khởi tạo cơ sở dữ liệu Cloudflare D1 ở chế độ local, khởi chạy ứng dụng `thucduong-shop` trên `localhost` và xử lý các lỗi thường gặp trên Windows / PowerShell.

---

## 1. Yêu cầu hệ thống

Trước khi bắt đầu, máy tính cần cài đặt sẵn:

- **Node.js `>= 22.13`** (khuyến nghị phiên bản **`24.22.1`** theo file `.nvmrc`).
  - Lý do: Wrangler CLI (`4.164.0` trong `package.json`) yêu cầu tối thiểu Node.js `v22.12.0`. Nếu dùng Node `v20.x` trở xuống, các lệnh `wrangler d1 execute` hoặc `cf:db:local` sẽ báo lỗi.
- **npm** (đi kèm Node.js) và **Git**.
- Khuyến nghị quản lý nhiều phiên bản Node trên Windows bằng **nvm-windows**:

```powershell
nvm install 24.22.1
nvm use 24.22.1
node -v
```

---

## 2. Bước 1: Cài đặt thư viện (Dependencies)

Tại thư mục gốc dự án (`D:\Git\thucduong-shop`), chạy lệnh cài đặt gói từ lockfile:

```powershell
npm ci
```

Nếu bạn mới thêm hoặc cập nhật package thủ công, có thể dùng `npm install`.

---

## 3. Bước 2: Cấu hình biến môi trường Local (Tùy chọn)

Ứng dụng vẫn chạy bình thường mà không cần tạo file biến môi trường ngay từ đầu, vì các thiết lập như Gemini API key, SMTP, thông tin cửa hàng hay KiotViet đều có thể cấu hình trực tiếp trong trang `/admin/settings/` (lưu vào bảng `settings` của D1).

Tuy nhiên, nếu bạn muốn test các luồng **AI Gemini**, **Cron Jobs** hoặc **Idle Workers** qua biến môi trường:

- Với `npm run dev` (Next.js dev server), tạo file `.env.local` ở thư mục gốc dự án.
- Với `opennextjs-cloudflare preview` (mô phỏng Cloudflare Workers runtime), tạo file `.dev.vars` ở thư mục gốc dự án.

Ví dụ nội dung mẫu:

```dotenv
# Khóa Google Gemini API cho tính năng Tư vấn nhanh, AI Rewrite, Lab Analysis
GEMINI_API_KEY="AIza..."

# Khóa bảo mật cho các endpoint cron (/api/cron/crm-automation/, /api/cron/youtube-sync/, /api/cron/compliance-sync/)
CRON_SECRET="local-dev-cron-secret-change-me"

# Khóa bảo mật cho các background idle workers (/api/admin/*/idle-worker/)
IDLE_WORKER_SECRET="local-dev-idle-secret-change-me"
```

Lưu ý: Không commit `.env.local` hoặc `.dev.vars` lên Git.

---

## 4. Bước 3: Khởi tạo Cơ sở dữ liệu Cloudflare D1 Local

Dự án sử dụng Cloudflare D1 binding tên `DB` (`thucduong-shop-db` trong `wrangler.jsonc`). Khi chạy local, Wrangler lưu file SQLite cục bộ bên trong thư mục `.wrangler/state/v3/d1/`.

### Cách A: Khởi tạo DB sạch từ file schema chuẩn có sẵn (Khuyên dùng)

Dự án đã có sẵn file schema mẫu chuẩn tại `data/d1-dump.sql` gồm:

- **49 bảng** đầy đủ (đã gộp sẵn tất cả cột mở rộng của Catalog, Orders, Loyalty/CRM, Retail ERP, AI Quick Consult, Lab Analysis, Importers, Media).
- **24 index** (gồm `idx_admins_phone_unique` và 23 composite index hiệu năng từ `migrations/0002_performance_indexes.sql`).
- **6 nhóm dữ liệu cấu hình tối thiểu** (`settings`, `post_sections`, `provinces`/`wards` mẫu, `point_rules`, `flash_sale_slots`). Các bảng nghiệp vụ (`products`, `posts`, `orders`, `admins`) được để trống để bạn chủ động tạo tài khoản quản trị đầu tiên hoặc nhập liệu mới.

Thực hiện kiểm tra tính toàn vẹn file SQL và nạp vào D1 local:

```powershell
# 1. Đảm bảo đang dùng Node >= 22.13 (vd 24.22.1)
nvm use 24.22.1

# 2. Kiểm tra file dump hợp lệ (tùy chọn nhưng nên chạy)
node scripts/verify-d1-backup.mjs data/d1-dump.sql

# 3. Nạp schema và dữ liệu khởi tạo vào D1 local
npm run cf:db:local
```

Lệnh `npm run cf:db:local` sẽ thực thi:

```powershell
wrangler d1 execute thucduong-shop-db --local --file=data/d1-dump.sql --yes
```

Khi thành công, terminal sẽ hiển thị số câu lệnh SQL đã chạy thành công (ví dụ: `79 commands executed successfully.`).

### Cách B: Đồng bộ bản sao dữ liệu từ D1 Production (Remote) về Local

Nếu bạn cần test với dữ liệu thật từ D1 đang chạy trên Cloudflare:

```powershell
# 1. Đăng nhập Cloudflare CLI (nếu chưa đăng nhập)
npx wrangler login

# 2. Xuất dữ liệu từ D1 remote về data/d1-dump.sql
npx wrangler d1 export thucduong-shop-db --remote --output=data/d1-dump.sql

# 3. (Quan trọng) Xóa các dòng BEGIN TRANSACTION; hoặc COMMIT; nếu công cụ export sinh ra
#    vì `wrangler d1 execute --file` không cho phép câu lệnh transaction thủ công trong file SQL.

# 4. Nạp vào D1 local
npm run cf:db:local
```

### Kiểm tra danh sách bảng đã tạo trong D1 Local

```powershell
npx wrangler d1 execute thucduong-shop-db --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
```

### Cách Reset sạch hoàn toàn D1 Local khi cần làm lại

Khi muốn xóa toàn bộ dữ liệu test và khởi tạo lại từ đầu:

```powershell
Remove-Item -Recurse -Force .wrangler\state\v3\d1 -ErrorAction SilentlyContinue
npm run cf:db:local
```

---

## 5. Bước 4: Chạy ứng dụng trên Localhost

### Chế độ 1: Next.js Dev Server (`next dev`) - Phù hợp khi code hằng ngày

Có hỗ trợ Hot Module Replacement (tự tải lại khi sửa code) và kết nối D1 local qua `getCloudflareContext({ async: true })` của `@opennextjs/cloudflare`:

```powershell
npm run dev
```

Mở trình duyệt và truy cập: `http://localhost:3000`

### Chế độ 2: Preview trên Cloudflare Workers (`workerd`) - Giống môi trường Production

Dùng khi muốn kiểm tra bundle cuối cùng trước khi deploy lên Cloudflare (`nodejs_compat`, `ASSETS`, `WORKER_SELF_REFERENCE`, `NEXT_INC_CACHE_KV`):

```powershell
npm run cf:build
npx opennextjs-cloudflare preview
```

---

## 6. Bước 5: Tạo tài khoản Super Admin đầu tiên & Kiểm tra nhanh

1. Mở trình duyệt truy cập **`http://localhost:3000/admin/`**.
2. Khi bảng `admins` đang trống, giao diện sẽ tự động hiển thị form **"Tạo tài khoản admin"** (thực thi `setupAction` trong `app/admin/page.tsx`).
3. Nhập **Email**, **Số điện thoại (tùy chọn)** và **Mật khẩu** để tạo tài khoản `super_admin` đầu tiên và đăng nhập vào Dashboard.

Danh sách URL hữu ích để kiểm tra nhanh các phân hệ sau khi chạy:

| Khu vực | Đường dẫn trên Localhost | Ghi chú |
|---|---|---|
| Trang chủ Storefront | `http://localhost:3000/` | Banner, Flash Sale, danh mục, bài viết |
| Danh mục sản phẩm | `http://localhost:3000/san-pham/` | Danh sách sản phẩm |
| Trang Tư vấn nhanh AI | `http://localhost:3000/tu-van-nhanh.html` | Quy trình tư vấn sức khỏe thực dưỡng |
| Cổng thành viên | `http://localhost:3000/tai-khoan/` | Đăng nhập / đăng ký thành viên, tích điểm |
| Quản trị Admin & Setup | `http://localhost:3000/admin/` | Tạo admin đầu tiên / Tổng quan ERP |
| Cài đặt hệ thống | `http://localhost:3000/admin/settings/` | Nhập Gemini API key, SMTP, thông tin shop |
| Đồng bộ KiotViet | `http://localhost:3000/admin/kiotviet/` | Cấu hình API & đồng bộ 2 chiều |

---

## 7. Bước 6: Kiểm tra chất lượng mã nguồn trước khi Commit / Deploy

Chạy lần lượt các lệnh sau để đảm bảo không phát sinh lỗi TypeScript, logic hay bundle Cloudflare:

```powershell
# Kiểm tra typegen của Next.js 16 và TypeScript
npm run typecheck

# Chạy toàn bộ unit test (tsx --test)
npm test

# Build thử bundle OpenNext Cloudflare (tạo .open-next/)
npm run cf:build
```

---

## 8. Xử lý sự cố thường gặp (Troubleshooting)

### Lỗi 1: `Wrangler requires at least Node.js v22.12.0. You are using v20.x.x.`
- **Nguyên nhân:** Terminal hiện tại đang dùng Node v20 hoặc thấp hơn.
- **Cách sửa:** Chuyển sang Node v24 đã cấu hình trong `.nvmrc`:
  ```powershell
  nvm use 24.22.1
  ```

### Lỗi 2: `Wrangler could not process the provided SQL file, as it contains several transactions.`
- **Nguyên nhân:** Wrangler CLI tự động bọc quá trình chạy file SQL trong transaction riêng và dùng bộ quét văn bản thô để chặn các từ khóa `BEGIN TRANSACTION` hoặc `COMMIT`. Ngay cả khi hai từ khóa này nằm trong dòng chú thích (`-- ...`), Wrangler vẫn có thể nhận nhầm và báo lỗi.
- **Cách sửa:** Mở file `.sql`, xóa mọi dòng lệnh `BEGIN TRANSACTION;`, `COMMIT;` và tránh viết hai cụm từ này trong comment `--` của file dump. File `data/d1-dump.sql` mẫu hiện tại đã được xử lý sạch lỗi này.

### Lỗi 3: Lỗi thiếu bảng hoặc thiếu cột khi nâng cấp code mới
- **Nguyên nhân:** File SQLite cũ trong `.wrangler/state/v3/d1` được tạo từ schema cũ.
- **Cách sửa:** Áp dụng lại schema chuẩn (an toàn với `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`) hoặc reset sạch D1 local:
  ```powershell
  npm run cf:db:local
  # Hoặc nếu đổi cấu trúc cột trong bảng đã có sẵn:
  Remove-Item -Recurse -Force .wrangler\state\v3\d1
  npm run cf:db:local
  ```

### Lỗi 4: Cổng `3000` đã có ứng dụng khác sử dụng
- **Cách sửa:** Chạy `next dev` trên cổng khác, ví dụ `3001`:
  ```powershell
  npx next dev -p 3001
  ```
