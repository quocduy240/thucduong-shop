# Thực Dưỡng Shop — bản dựng thử (prototype)

Bản dựng lại site **thucduongthienan.com** (đang chạy trên nền tảng LoveItop) bằng **Next.js 16 + SQLite**.
Mục đích là **đánh giá có nên chuyển công nghệ hay không**, nên đây chỉ là bản chạy local, không dùng để public.

- Sơ đồ URL và các API giữ **giống site gốc**.
- Có sẵn 1 bài viết thật đã import kèm ảnh. Sản phẩm, danh mục và các bài còn lại là **dữ liệu mẫu**.
- Không cần cài database server: dùng SQLite có sẵn trong Node.js (`node:sqlite`). Không có module native nên chạy được trên Windows, macOS và Linux.

---

## 1. Yêu cầu

| Cần | Phiên bản |
|---|---|
| Node.js | **24.x** (khuyên dùng 24.22.1, xem `.nvmrc`). Tối thiểu 22.13 |
| npm | đi kèm Node |

Kiểm tra: `node -v`. Nếu dùng nvm thì chạy `nvm install && nvm use` trong thư mục project.

## 2. Chạy

```bash
npm install
npm run dev
```

Mở **http://localhost:3000**

Các trang nên xem thử:
- Trang chủ: http://localhost:3000/
- Danh mục: http://localhost:3000/san-pham/tra-duong-sinh/
- Chi tiết sản phẩm: http://localhost:3000/san-pham/tra-duong-sinh/tra-gao-lut-rang.html
- **Bài viết thật đã import:** http://localhost:3000/thuc-duong/thuc-duong-can-ban/cam-nang-du-lich-danh-cho-nguoi-thuc-duong.html
- Giỏ hàng → đặt hàng: thêm sản phẩm, vào http://localhost:3000/cart rồi bấm "Tiến hành đặt hàng"

Chạy bản production: `npm run build && npm start`

> Terminal có thể in `ExperimentalWarning: SQLite is an experimental feature`. Đây là cảnh báo bình thường của Node, không phải lỗi.

## 3. Dữ liệu

- Database nằm ở `data/shop.db` và đã có sẵn trong file zip, gồm dữ liệu mẫu và bài viết đã import. Chưa có đơn hàng hay bình luận nào.
- **Reset về dữ liệu mẫu:** tắt server, xóa thư mục `data/`, rồi chạy lại `npm run dev`. Database sẽ được tạo lại từ `lib/seed.ts`. Lưu ý: reset sẽ **mất bài viết đã import**, muốn có lại thì import lại (mục 4).
- Ảnh của bài import nằm ở `public/uploads/posts/<slug>/`.

## 4. Import bài viết từ site thật

```bash
npm run import:post -- https://thucduongthienan.com/thuc-duong/thuc-duong-can-ban/<slug>.html
```

Script này cần mạng. Nó tải tiêu đề, ngày đăng, mô tả, nội dung và toàn bộ ảnh của bài, đổi link về domain cũ thành đường dẫn tương đối, rồi lưu vào DB. Chạy lại thì bài chỉ được cập nhật, không bị nhân đôi. Server đang chạy cũng không sao, chỉ cần F5.

URL phải có dạng 3 cấp: `/<section>/<chuyen-muc>/<slug>.html`.

## 5. Sơ đồ URL (giống site gốc)

| URL | Trang | File |
|---|---|---|
| `/` | Trang chủ | `app/page.tsx` |
| `/san-pham/` | Tất cả sản phẩm | `app/san-pham/page.tsx` |
| `/san-pham/<danh-muc>/` | Danh mục sản phẩm | `app/san-pham/[category]/page.tsx` |
| `/san-pham/<danh-muc>/<slug>.html` | Chi tiết sản phẩm | `app/san-pham/[category]/[product]/page.tsx` |
| `/thuc-duong/`, `/song-khoe/`, `/thu-vien/` | Danh sách bài theo mục | `app/[section]/page.tsx` |
| `/<section>/<chuyen-muc>/` | Danh sách bài theo chuyên mục | `app/[section]/[slug]/page.tsx` |
| `/<section>/<chuyen-muc>/<slug>.html` | Chi tiết bài viết | `app/[section]/[slug]/[post]/page.tsx` |
| `/<chuyen-muc>/<slug>.html` | Bài viết (URL dạng ngắn) | `app/[section]/[slug]/page.tsx` |
| `/gioi-thieu.html`, `/lien-he.html` | Trang tĩnh | `app/[section]/page.tsx` |
| `/chinh-sach/<slug>.html` | Trang chính sách | `app/[section]/[slug]/page.tsx` |
| `/cart` → `/checkout` → `/checkout/thankyou` | Giỏ hàng, thanh toán, cảm ơn | `app/cart`, `app/checkout` |
| `/search/?q=` | Kết quả tìm kiếm | `app/search/page.tsx` |

## 6. API (cùng đường dẫn với site gốc)

| Endpoint | Việc |
|---|---|
| `POST /api/v2/add-to-cart/{id}` body `{ "qty": 1 }` | Thêm vào giỏ. Giỏ lưu trong cookie `cart` |
| `GET /add-to-cart/{id}` | Thêm 1 sản phẩm rồi chuyển tới `/cart` |
| `POST /api/data-checkout` | Tạo đơn hàng từ giỏ |
| `GET /api/v2/province`, `GET /api/v2/province/ward?province=<code>` | Danh sách tỉnh / phường |
| `GET /search/post/autocomplete?q=` | Gợi ý tìm kiếm ở header |
| `GET /load-comment?product_id=`, `POST /submit-comment` | Bình luận sản phẩm |

## 7. Cấu trúc thư mục

```
app/          Trang và API (Next.js App Router)
components/   Header, Footer, thẻ sản phẩm, form giỏ hàng/checkout, bình luận...
lib/
  db.ts       Kết nối SQLite + schema + migrate
  seed.ts     Dữ liệu mẫu (tự chạy khi DB trống)
  data.ts     Các hàm truy vấn + url.* (quy ước URL toàn site)
  cart.ts     Giỏ hàng (cookie)
  site.ts     Tên shop, hotline, email
scripts/
  import-post.mjs   Import bài viết từ site thật
data/shop.db  Database
public/uploads/     Ảnh đã import
```

## 8. Chưa có / giới hạn

- Sản phẩm và danh mục là dữ liệu mẫu, ảnh sản phẩm là ô màu giữ chỗ. Link trong bài import trỏ tới sản phẩm thật nên sẽ báo 404 cho đến khi import sản phẩm.
- Tỉnh/phường mới có vài mục mẫu.
- Chưa có trang quản trị, đăng nhập tài khoản, affiliate, captcha cho bình luận, thanh toán online, menu mobile dạng drawer.

## 9. Dùng với Claude Code / AI agent

Hướng dẫn cho agent nằm trong **`AGENTS.md`** (Claude Code đọc qua `CLAUDE.md`). Chỉ cần mở thư mục project bằng agent rồi nhờ nó, ví dụ:

> "Đọc AGENTS.md, chạy project lên và mở trang bài viết đã import."
> "Thêm script import sản phẩm từ site thật, giống scripts/import-post.mjs."
