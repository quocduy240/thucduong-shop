# Hướng dẫn Build và Deploy thucduong-shop lên GitHub Actions và Cloudflare Workers

Tài liệu này hướng dẫn chi tiết quy trình chuẩn bị tài nguyên trên Cloudflare, build và deploy thủ công bằng CLI, thiết lập CI/CD tự động qua GitHub Actions, kiểm tra sau triển khai và xử lý sự cố cho dự án `thucduong-shop` (`https://thucduongshop.duyvo.win`).

## 1. Tổng quan kiến trúc Build và Deploy

Dự án được xây dựng bằng Next.js (`16.4.6`) chạy trên Edge Runtime của Cloudflare Workers thông qua adapter `@opennextjs/cloudflare` (`1.20.17`).

| Thành phần | Định danh trong dự án | Vai trò khi Build / Deploy |
|---|---|---|
| Adapter OpenNext | `open-next.config.ts` | Biên dịch Next.js thành `.open-next/worker.js` và tài nguyên tĩnh `.open-next/assets` |
| Cache phân tán | `kvIncrementalCache` + `withRegionalCache` | Cache ISR 300 giây kết hợp Cloudflare KV (`NEXT_INC_CACHE_KV`) |
| Cấu hình Workers | `wrangler.jsonc` | Khai báo `nodejs_compat`, `ASSETS`, `WORKER_SELF_REFERENCE`, `DB`, KV và custom domain |
| Database | `DB` (`thucduong-shop-db`) | Cloudflare D1 (SQLite tại edge, quản lý 49 bảng và 24 index hiệu năng) |
| Media Storage | `MEDIA_BUCKET` (`thucduong-media`, tùy chọn) | Lưu ảnh/file trên Cloudflare R2; tự động fallback về bảng D1 nếu chưa bật R2 |
| Tên miền Production | `thucduongshop.duyvo.win` | Custom Domain gắn vào Worker `thucduong-shop` trong `wrangler.jsonc` |
| Auto-build Hook | `scripts/ensure-opennext-build.mjs` | Chạy ở `postinstall`, tự động vá `deployCommand` để fallback build nếu thiếu `.open-next/.build/open-next.config.edge.mjs` |

Lưu ý về `app/layout.tsx`: Root Layout chủ động khai báo `export const dynamic = "force-dynamic"` để quá trình build trên CI không bị lỗi khi D1 chưa có dữ liệu ở thời điểm build. Dữ liệu storefront được tăng tốc qua `unstable_cache` / `cached()` và KV Regional Cache (`300s`).

## 2. Chuẩn bị tài nguyên trên Cloudflare (Thiết lập lần đầu)

Phần này chỉ cần làm một lần khi dựng môi trường Cloudflare mới hoặc chuyển sang tài khoản Cloudflare mới.

### 2.1. Cài đặt công cụ và đăng nhập Wrangler

Đảm bảo dùng đúng Node.js `>= 22.13` (khuyến nghị `24.22.1` theo `.nvmrc`), cài package và đăng nhập Cloudflare:

```powershell
nvm use 24.22.1
npm ci
npx wrangler login
npx wrangler whoami
```

### 2.2. Tạo và khởi tạo Cloudflare D1 (`thucduong-shop-db`)

1. Tạo database D1 mới trên Cloudflare:

```powershell
npx wrangler d1 create thucduong-shop-db
```

2. Sao chép `database_id` vừa tạo vào mục `d1_databases` trong `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "thucduong-shop-db",
    "database_id": "<THAY_BANG_DATABASE_ID_CUA_BAN>"
  }
]
```

3. Nạp schema chuẩn và index hiệu năng lên D1 Remote (Production):

```powershell
# Kiểm tra file schema trước khi nạp
node scripts/verify-d1-backup.mjs data/d1-dump.sql

# Khởi tạo toàn bộ 49 bảng, 24 index và cấu hình tối thiểu lên D1 remote
npm run cf:db:remote

# Hoặc áp dụng bổ sung file migration nếu DB đã tồn tại từ trước
npx wrangler d1 execute thucduong-shop-db --remote --file=migrations/0001_schema_sync.sql --yes
npx wrangler d1 execute thucduong-shop-db --remote --file=migrations/0002_performance_indexes.sql --yes
```

### 2.3. Tạo Cloudflare KV Namespace (`NEXT_INC_CACHE_KV`)

1. Tạo KV namespace dùng cho Next.js Incremental Cache:

```powershell
npx wrangler kv namespace create NEXT_INC_CACHE_KV
```

2. Cập nhật `id` trả về vào mục `kv_namespaces` trong `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "NEXT_INC_CACHE_KV",
    "id": "<THAY_BANG_KV_NAMESPACE_ID>"
  }
]
```

### 2.4. Kích hoạt Cloudflare R2 Media Storage (Tùy chọn)

Nếu không bật R2, hệ thống tự động lưu media vào D1 (`media_files`, `media_assets`) và phục vụ tại `/api/media/[...path]`. Để tối ưu dung lượng D1 và phân phối qua CDN:

1. Tạo R2 bucket:

```powershell
npx wrangler r2 bucket create thucduong-media
```

2. Mở comment khối `r2_buckets` trong `wrangler.jsonc`:

```jsonc
,"r2_buckets": [
  {
    "binding": "MEDIA_BUCKET",
    "bucket_name": "thucduong-media"
  }
]
```

3. Nếu gắn Custom Domain cho R2 bucket (ví dụ `https://cdn.thucduongshop.duyvo.win`), đặt biến môi trường `NEXT_PUBLIC_MEDIA_CDN_URL` trong Cloudflare Dashboard (Workers & Pages -> Settings -> Variables and Secrets). Nếu chưa đặt CDN URL, route `/api/media/[...path]/route.ts` vẫn đọc trực tiếp từ `MEDIA_BUCKET` thông qua `getMediaObject()`.

### 2.5. Cấu hình Runtime Secrets trên Cloudflare Workers

Nạp các khóa bí mật cho môi trường Production bằng Wrangler CLI (không lưu trực tiếp vào Git):

```powershell
# Khóa Gemini API cho Tư vấn nhanh AI, AI Rewrite, Lab Analysis
npx wrangler secret put GEMINI_API_KEY

# Khóa bảo mật chung cho các route /api/cron/* (bắt buộc fail-closed)
npx wrangler secret put CRON_SECRET

# Khóa bảo mật cho các background idle workers (/api/admin/*/idle-worker/)
npx wrangler secret put IDLE_WORKER_SECRET
```

Ngoài ra, các cấu hình như SMTP gửi mail, thông tin cửa hàng, hoặc KiotViet `webhookSecret` có thể cấu hình trực tiếp tại giao diện `/admin/settings/` và `/admin/kiotviet/`.

### 2.6. Gắn Custom Domain

Mục `routes` trong `wrangler.jsonc` đã khai báo sẵn `thucduongshop.duyvo.win` với `custom_domain: true`. Đảm bảo tên miền `duyvo.win` đã được thêm vào cùng tài khoản Cloudflare (Cloudflare DNS đang active) để Wrangler tự động tạo bản ghi DNS và cấp chứng chỉ SSL khi deploy.

## 3. Build và Deploy thủ công từ máy Local

Quy trình phù hợp khi cần kiểm tra bundle ở local hoặc deploy nóng trực tiếp từ máy cá nhân.

### 3.1. Kiểm tra chất lượng mã nguồn trước khi Build

```powershell
nvm use 24.22.1
npm ci
npm run typecheck
npm test
```

Ghi chú lệnh trong `package.json`:
- `npm run typecheck`: Chạy `next typegen && tsc --noEmit` để sinh type route của Next.js 16 trước khi kiểm tra kiểu TypeScript.
- `npm test`: Chạy `npx --yes tsx --test "lib/**/*.test.ts"` (hiện có 24 unit test trong `lib/`).

### 3.2. Build bundle OpenNext và Preview trên Local

```powershell
# Build Next.js (npm run build:next) và đóng gói cho Cloudflare Workers vào .open-next/
npm run cf:build

# Tùy chọn: chạy thử bản build bằng workerd local trước khi đẩy lên Production
npx opennextjs-cloudflare preview
```

### 3.3. Deploy lên Cloudflare Workers Production

```powershell
npm run cf:deploy
```

Lệnh này chạy tuần tự `opennextjs-cloudflare build && opennextjs-cloudflare deploy`. Khi hoàn tất, terminal in ra URL `*.workers.dev` và custom domain `https://thucduongshop.duyvo.win`.

Lưu ý cơ chế tự động vá lỗi CI (`scripts/ensure-opennext-build.mjs`): Khi `npm ci` hoặc `npm install` chạy, script `postinstall` sẽ kiểm tra và bổ sung fallback tự động gọi `buildCommand()` trong `node_modules/@opennextjs/cloudflare/dist/cli/commands/deploy.js` nếu chưa có file `.open-next/.build/open-next.config.edge.mjs`. Điều này giúp `npx opennextjs-cloudflare deploy` không bị lỗi ngay cả trên các nền tảng CI chỉ chạy lệnh deploy.

## 4. Thiết lập CI/CD tự động trên GitHub Actions

Kho mã nguồn đã cấu hình sẵn 4 workflow trong `.github/workflows/`.

### 4.1. Cấu hình Secrets và Variables trên GitHub

Trên GitHub, truy cập **Repository -> Settings -> Secrets and variables -> Actions** và khai báo các giá trị sau:

| Loại | Tên biến | Bắt buộc | Cách lấy và mục đích sử dụng |
|---|---|---|---|
| Repository Secret | `CLOUDFLARE_API_TOKEN` | Có (nếu deploy/backup từ GitHub) | Tạo tại Cloudflare Dashboard -> My Profile -> API Tokens -> Custom Token với các quyền bên dưới |
| Repository Secret | `CLOUDFLARE_ACCOUNT_ID` | Có (nếu deploy/backup từ GitHub) | Lấy từ URL Cloudflare Dashboard hoặc chạy `npx wrangler whoami` |
| Repository Secret | `CRON_SECRET` | Có (cho Cron workflow) | Phải khớp chính xác với giá trị `CRON_SECRET` đã đặt trên Cloudflare Worker (`wrangler secret put CRON_SECRET`) |
| Repository Variable | `R2_BACKUP_BUCKET` | Tùy chọn | Tên R2 bucket nếu muốn mirror file backup `.sql.gz` lên R2 (ví dụ `thucduong-backups`) |

Quyền tối thiểu nên cấp cho `CLOUDFLARE_API_TOKEN`:
- **Account -> Workers Scripts -> Edit**
- **Account -> D1 -> Edit**
- **Account -> Workers KV Storage -> Edit**
- **Account -> Account Settings -> Read**
- **Account -> Workers R2 Storage -> Edit** (nếu sử dụng R2 cho media hoặc backup)
- **Zone -> Workers Routes -> Edit** (nếu deploy tự cập nhật custom domain)

### 4.2. Chi tiết 4 Workflow trong `.github/workflows/`

#### Workflow 1: `deploy-cloudflare.yml` (Build & Deploy Production)
- **Thời điểm kích hoạt:** Tự động khi push lên nhánh `main` (bỏ qua thay đổi chỉ nằm ở `README.md`, `AGENTS.md`, `**/*.test.ts`, `**/*.test.mjs`), hoặc chạy thủ công qua nút **Run workflow** (`workflow_dispatch`).
- **Concurrency:** Nhóm `cloudflare-deploy-${{ github.ref }}` với `cancel-in-progress: true` để hủy job cũ nếu có commit mới đẩy lên liên tiếp.
- **Các bước thực thi:**
  1. Checkout code và cài Node.js 24 với cache npm.
  2. `npm ci` (tự chạy `postinstall` vá OpenNext fallback).
  3. `npm run typecheck` và chạy bộ unit test (`lib/*.test.ts`).
  4. `npm run build` (tương đương `opennextjs-cloudflare build`).
  5. Nếu `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID` đã cấu hình:
     - Chạy `npx wrangler d1 execute thucduong-shop-db --remote --file=migrations/0002_performance_indexes.sql --yes` để đảm bảo đủ index.
     - Chạy `npx opennextjs-cloudflare deploy` để phát hành lên Production.
  6. Nếu chưa cấu hình 2 Secret Cloudflare trên GitHub, workflow vẫn chạy bước kiểm tra typecheck, unit test, build thành công và bỏ qua bước deploy để nhường cho Cloudflare Workers Builds tích hợp sẵn.

#### Workflow 2: `backup-d1.yml` (Sao lưu D1 hàng ngày)
- **Thời điểm kích hoạt:** Tự động lúc `20:00 UTC` mỗi ngày (tức `03:00` sáng giờ Việt Nam UTC+7), hoặc chạy tay (`workflow_dispatch`).
- **Các bước thực thi:**
  1. Export D1 remote bằng `npx wrangler d1 export thucduong-shop-db --remote --output=...`.
  2. Kiểm tra tính toàn vẹn file SQL bằng `node scripts/verify-d1-backup.mjs`.
  3. Nén `gzip -9` và tạo file checksum `.sha256`.
  4. Tải file backup lên GitHub Actions Artifacts (lưu giữ `30 ngày`).
  5. Nếu biến `vars.R2_BACKUP_BUCKET` được thiết lập, tự động đẩy thêm một bản vào đường dẫn `d1-backups/` trên R2.

#### Workflow 3: `scheduled-crons.yml` (Kích hoạt tác vụ định kỳ)
- **Thời điểm kích hoạt:**
  - `0 1 * * *` UTC (`08:00` sáng ICT mỗi ngày): Gọi `POST https://thucduongshop.duyvo.win/api/cron/youtube-sync/`
  - `0 2 * * *` UTC (`09:00` sáng ICT mỗi ngày): Gọi `POST https://thucduongshop.duyvo.win/api/cron/crm-automation/`
  - `0 3 * * 1` UTC (`10:00` sáng Thứ Hai ICT hàng tuần): Gọi `POST https://thucduongshop.duyvo.win/api/cron/compliance-sync/`
  - Hoặc chạy thủ công (`workflow_dispatch`) với tùy chọn `target`: `all`, `crm`, `youtube`, `compliance`.
- **Xác thực:** Truyền header `x-cron-secret: ${CRON_SECRET}` (so sánh constant-time bằng `safeEqualSecret()` phía server).

#### Workflow 4: `security-audit.yml` (Kiểm tra bảo mật tự động)
- **Thời điểm kích hoạt:** Khi push hoặc mở Pull Request vào `main`, và định kỳ Thứ Hai hàng tuần lúc `02:00 UTC`.
- **Gồm 3 job song song:**
  1. `typecheck-and-npm-audit`: Chạy `npm run security:check` (`npm audit --omit=dev --audit-level=high && npm run typecheck`).
  2. `semgrep-sast`: Quét mã nguồn với bộ rule `p/typescript`, `p/react`, `p/owasp-top-ten`.
  3. `trivy-vuln-and-secrets`: Quét lỗ hổng thư viện, rò rỉ secret và lỗi cấu hình (chặn ở mức `HIGH`, `CRITICAL`).

### 4.3. Lưu ý khi chọn giữa GitHub Actions Deploy và Cloudflare Workers Builds

| Tiêu chí | Deploy qua GitHub Actions (`deploy-cloudflare.yml`) | Deploy qua Cloudflare Workers Builds (tích hợp sẵn) |
|---|---|---|
| Kiểm soát chất lượng | Có thể chặn deploy nếu fail `typecheck` hoặc `test` | Tùy cấu hình build command trên Cloudflare Dashboard |
| Đồng bộ D1 index | Tự chạy `0002_performance_indexes.sql` trước khi deploy | Cần tự chạy tay hoặc đưa vào build command |
| Cách chọn dùng | Khai báo đủ `CLOUDFLARE_API_TOKEN` & `CLOUDFLARE_ACCOUNT_ID` trên GitHub và tắt auto-deploy trên Cloudflare Dashboard | Không khai báo `CLOUDFLARE_API_TOKEN` trên GitHub; để Cloudflare Dashboard tự build và deploy khi push `main` |

Khuyến nghị: Chỉ kích hoạt deploy tự động ở một nơi (GitHub Actions hoặc Cloudflare Workers Builds) để tránh hai hệ thống cùng build và ghi đè deployment song song khi bạn push commit lên `main`.

## 5. Kiểm tra sau Deploy và Rollback

### 5.1. Checklist kiểm tra nhanh sau khi Deploy

1. Mở trang chủ và các route chính:
   - `https://thucduongshop.duyvo.win/` (kiểm tra Flash Sale, danh mục, hình ảnh).
   - `https://thucduongshop.duyvo.win/san-pham/` và một trang chi tiết `.html`.
   - `https://thucduongshop.duyvo.win/tu-van-nhanh.html`.
   - `https://thucduongshop.duyvo.win/admin/` (kiểm tra đăng nhập và phân quyền).
2. Theo dõi log runtime trực tiếp trên Edge Worker để phát hiện lỗi bất thường:

```powershell
npx wrangler tail thucduong-shop
```

3. Kiểm tra chạy thử thủ công một tác vụ Cron trong GitHub Actions: tab **Actions -> Scheduled Cron Jobs -> Run workflow** -> chọn `crm` hoặc `youtube`.

### 5.2. Cách Rollback khi bản Deploy mới gặp sự cố

- **Cách 1 (Trên Cloudflare Dashboard):** Vào **Workers & Pages -> thucduong-shop -> Deployments**, chọn phiên bản ổn định trước đó và nhấn **Rollback to this deployment**.
- **Cách 2 (Qua CLI):**

```powershell
npx wrangler deployments list
npx wrangler rollback
```

## 6. Xử lý sự cố thường gặp khi Build & Deploy

### 6.1. Lỗi `Wrangler requires at least Node.js v22.12.0`
- **Triệu chứng:** Khi chạy `npm run cf:build` hoặc `cf:deploy` ở máy local bị dừng ngay với lỗi phiên bản Node cũ.
- **Cách sửa:** Chạy `nvm use 24.22.1` ở local; trong GitHub Actions đảm bảo các workflow dùng `node-version: "24"`.

### 6.2. GitHub Actions báo `CLOUDFLARE_API_TOKEN chưa cấu hình` và bỏ qua bước deploy
- **Nguyên nhân:** Repository chưa thêm `CLOUDFLARE_API_TOKEN` hoặc `CLOUDFLARE_ACCOUNT_ID` vào Settings -> Secrets and variables -> Actions (hoặc đang chạy workflow từ fork PR).
- **Cách sửa:** Kiểm tra đúng tên hai Secret trên GitHub. Nếu bạn cố tình dùng Cloudflare Workers Builds để deploy thay cho GitHub Actions thì trạng thái bỏ qua bước deploy này là bình thường.

### 6.3. Lỗi HTTP `401 Unauthorized` khi chạy `scheduled-crons.yml`
- **Nguyên nhân:** Giá trị `CRON_SECRET` trong GitHub Secrets không khớp với `CRON_SECRET` đã cài trên Cloudflare Worker, hoặc chưa cài trên Cloudflare Worker (`expectedSecret` rỗng sẽ bị từ chối fail-closed).
- **Cách sửa:** Đặt lại cùng một chuỗi bí mật cho cả `npx wrangler secret put CRON_SECRET` và GitHub Secret `CRON_SECRET`.

### 6.4. Lỗi khi build OpenNext trên CI (`Missing .open-next/.build/open-next.config.edge.mjs`)
- **Nguyên nhân:** Lệnh CI chỉ chạy `next build` hoặc `opennextjs-cloudflare deploy` trực tiếp mà bỏ qua bước `opennextjs-cloudflare build`.
- **Cách sửa:** Đảm bảo không chạy `npm ci --ignore-scripts` để `scripts/ensure-opennext-build.mjs` được thực thi ở bước `postinstall`, hoặc cấu hình Build command là `npm run cf:build`.

### 6.5. Lỗi ảnh vừa upload bị 404 sau khi bật R2
- **Nguyên nhân:** Đã cấu hình `NEXT_PUBLIC_MEDIA_CDN_URL` nhưng domain CDN R2 chưa gắn Public Bucket hoặc DNS chưa trỏ đúng.
- **Cách sửa:** Kiểm tra cài đặt Public Access / Custom Domain của bucket `thucduong-media` trên Cloudflare R2 Dashboard, hoặc tạm bỏ biến `NEXT_PUBLIC_MEDIA_CDN_URL` để `/api/media/[...path]` tự đọc và stream an toàn qua `MEDIA_BUCKET`.
