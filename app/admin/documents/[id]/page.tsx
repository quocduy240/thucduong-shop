import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmButton from "@/components/admin/ConfirmButton";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { ui } from "@/components/admin/ui";
import { requireAdminPath } from "@/lib/auth";
import { getDocumentById, getProducts } from "@/lib/data";
import { deleteDocumentAction, saveDocumentAction } from "../../actions";

export const metadata = { title: "Soạn thảo Tài liệu & Sách | Quản trị" };

const DEFAULT_FOLDERS = [
  "01. Thực Dưỡng Căn Bản / Nền Tảng Âm Dương",
  "01. Thực Dưỡng Căn Bản / Nấu Ăn Dưỡng Sinh",
  "02. Phác Đồ & Chữa Lành Tự Nhiên / Tiểu Đường & Tim Mạch",
  "02. Phác Đồ & Chữa Lành Tự Nhiên / Tiêu Hoá & Thải Độc",
  "02. Phác Đồ & Chữa Lành Tự Nhiên / Thận & Xương Khớp",
  "03. Bài Trình Chiếu & Slide Bài Giảng / Slide Livestream Duy Vo",
  "03. Bài Trình Chiếu & Slide Bài Giảng / Slide Dinh Dưỡng",
  "04. Tủ Sách Thực Dưỡng & Affiliate / Sách Gối Đầu Giường",
  "04. Tủ Sách Thực Dưỡng & Affiliate / Ebook Chuyên Sâu",
];

export default async function DocumentEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPath("/admin/documents/");
  const { id: rawId } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const id = rawId === "new" ? 0 : Number(rawId);
  if (rawId !== "new" && !Number.isInteger(id)) notFound();
  const [doc, products] = await Promise.all([
    id ? getDocumentById(id) : Promise.resolve(undefined),
    getProducts(200),
  ]);
  if (id && !doc) notFound();

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <Link href="/admin/documents/" className="text-sm text-gray-500 hover:underline">
        ← Danh sách Tài liệu &amp; Sách
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">
        {doc ? `Chỉnh sửa: ${doc.title}` : "Thêm Tài liệu / Slide / Sách mới"}
      </h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form action={saveDocumentAction} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="cover" value={doc?.cover ?? ""} />

        {/* Section 1: Basic Info & Folder Tree Path */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={ui.label}>Tên tài liệu / Bài trình chiếu / Sách *</label>
            <input
              name="title"
              required
              defaultValue={doc?.title}
              placeholder="VD: Cẩm Nang Thực Dưỡng Hiện Đại Cho Người Mới"
              className={ui.input}
            />
          </div>
          <div>
            <label className={ui.label}>Đường dẫn (slug)</label>
            <input
              name="slug"
              defaultValue={doc?.slug}
              placeholder="Để trống tự tạo từ tên"
              className={ui.input}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={ui.label}>
              📁 Đường dẫn Cây thư mục Google Drive (dùng dấu &quot;/&quot; để phân cấp thư mục con)
            </label>
            <input
              name="folder_path"
              list="drive-folder-suggestions"
              defaultValue={doc?.folder_path ?? DEFAULT_FOLDERS[0]}
              placeholder="VD: 01. Thực Dưỡng Căn Bản / Nền Tảng Âm Dương"
              className={ui.input}
            />
            <datalist id="drive-folder-suggestions">
              {DEFAULT_FOLDERS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={ui.label}>Loại tài liệu *</label>
            <select name="doc_type" defaultValue={doc?.doc_type ?? "pdf"} className={ui.input}>
              <option value="pdf">📕 Tài liệu PDF (.pdf)</option>
              <option value="doc">📘 Văn bản Word / Google Docs (.doc/.docx)</option>
              <option value="ppt">📙 Bài trình chiếu Slide (.ppt/.pptx)</option>
              <option value="book">📗 Sách in / Ebook / Affiliate</option>
            </select>
          </div>
        </div>

        {/* Section 2: Google Drive Links, File Upload & Specs */}
        <div className="grid gap-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4 sm:grid-cols-2">
          <div>
            <label className={ui.label}>🔗 Link File trên Google Drive (hoặc URL tải trực tiếp)</label>
            <input
              name="drive_url"
              defaultValue={doc?.drive_url ?? ""}
              placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
              className={`${ui.input} bg-white`}
            />
            <p className="mt-1 text-xs text-gray-500">
              Hỗ trợ link Google Drive File, Google Docs, Google Slides hoặc tải file trực tiếp bên phải.
            </p>
          </div>
          <div>
            <label className={ui.label}>📤 Hoặc tải file trực tiếp từ máy tính (PDF, DOCX, PPTX ≤ 25MB)</label>
            <input
              name="doc_file"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Nếu tải file lên, hệ thống sẽ tự động điền dung lượng và link tải.
            </p>
          </div>
          <div>
            <label className={ui.label}>📂 Link Thư mục Google Drive chứa tài liệu (tuỳ chọn)</label>
            <input
              name="drive_folder_url"
              defaultValue={doc?.drive_folder_url ?? ""}
              placeholder="https://drive.google.com/drive/folders/..."
              className={`${ui.input} bg-white`}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={ui.label}>Số trang/slide</label>
              <input name="pages" type="number" min={0} defaultValue={doc?.pages ?? 45} className={`${ui.input} bg-white`} />
            </div>
            <div>
              <label className={ui.label}>Dung lượng</label>
              <input name="file_size" defaultValue={doc?.file_size ?? "4.2 MB"} placeholder="VD: 4.2 MB" className={`${ui.input} bg-white`} />
            </div>
            <div>
              <label className={ui.label}>Thứ tự</label>
              <input name="sort" type="number" defaultValue={doc?.sort ?? 1} className={`${ui.input} bg-white`} />
            </div>
          </div>
        </div>

        {/* Section 3: Access Mode, Survey/Task Gate, Product Bundle & Affiliate */}
        <div className="grid gap-4 rounded-xl border border-amber-200 bg-amber-50/30 p-4 sm:grid-cols-2">
          <div>
            <label className={ui.label}>🔐 Cơ chế mở khóa / Tải tài liệu *</label>
            <select name="access_mode" defaultValue={doc?.access_mode ?? "free"} className={`${ui.input} bg-white`}>
              <option value="free">1. Miễn phí — Bấm tải hoặc đọc ngay</option>
              <option value="survey">2. Hoàn thành Khảo sát / Nhiệm vụ trước khi tải</option>
              <option value="bundle">3. Tặng phẩm kèm khi mua Sản phẩm Thực dưỡng</option>
              <option value="paid">4. Trả phí / Ủng hộ kinh phí biên soạn (hoặc nhập mã đơn)</option>
              <option value="affiliate">5. Giới thiệu Sách (Mua trên site hoặc Link Affiliate)</option>
            </select>
          </div>
          <div>
            <label className={ui.label}>💰 Giá bán / Phí ủng hộ (VNĐ — để 0 nếu miễn phí)</label>
            <input name="price" type="number" min={0} defaultValue={doc?.price ?? 0} className={`${ui.input} bg-white`} />
          </div>

          <div>
            <label className={ui.label}>🎁 Sản phẩm Thực dưỡng liên kết (Tặng kèm tài liệu này hoặc Mua sách trên site)</label>
            <select name="bundle_product_id" defaultValue={doc?.bundle_product_id ?? ""} className={`${ui.input} bg-white`}>
              <option value="">— Không liên kết sản phẩm —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.sku || p.id} · {p.name} ({ (p.sale_price ?? p.price).toLocaleString("vi-VN") }₫)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={ui.label}>🛒 Link Affiliate mua sách (Shopee, Tiki, Fahasa...)</label>
            <input
              name="affiliate_url"
              defaultValue={doc?.affiliate_url ?? ""}
              placeholder="https://shopee.vn/..."
              className={`${ui.input} bg-white`}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={ui.label}>
              📝 Câu hỏi Khảo sát / Yêu cầu Nhiệm vụ (Dành cho chế độ &quot;Khảo sát / Nhiệm vụ&quot;)
            </label>
            <input
              name="task_prompt"
              defaultValue={doc?.task_prompt ?? ""}
              placeholder="VD: Bạn đang quan tâm đến vấn đề sức khỏe nào nhất? Hãy chia sẻ để mở khóa tải tài liệu nhé!"
              className={`${ui.input} bg-white`}
            />
          </div>
        </div>

        {/* Section 4: Author, Cover Image & Short Summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={ui.label}>Tác giả / Nguồn biên soạn</label>
            <input
              name="author"
              defaultValue={doc?.author ?? "Duy Vo & Thực Dưỡng Phúc Thọ"}
              className={ui.input}
            />
          </div>
          <div>
            <label className={ui.label}>Ảnh bìa tài liệu / Bìa sách (tuỳ chọn)</label>
            {doc?.cover && (
              <div className="mb-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={doc.cover} alt="" className="h-16 w-12 rounded border object-cover" />
                <label className="text-xs">
                  <input type="checkbox" name="remove_cover" value="1" /> Xoá ảnh bìa
                </label>
              </div>
            )}
            <input name="cover_file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="text-xs" />
          </div>
        </div>

        <div>
          <label className={ui.label}>Mô tả tóm tắt (Hiển thị trên thẻ tài liệu)</label>
          <textarea
            name="summary"
            rows={2}
            defaultValue={doc?.summary ?? ""}
            placeholder="Tóm tắt 1–2 câu về giá trị của tài liệu/cuốn sách..."
            className={ui.input}
          />
        </div>

        {/* Section 5: Professional WYSIWYG Rich Text Editor & Auto-Analyzer for Document Review */}
        <div>
          <label className="mb-2 block text-base font-bold text-gray-900">
            ✍️ Nội dung Review &amp; Giới thiệu chi tiết tài liệu (Trình soạn thảo chuyên nghiệp)
          </label>
          <RichTextEditor
            name="review_html"
            defaultValue={doc?.review_html ?? ""}
            highlightsName="highlights"
            defaultHighlights={doc?.highlights ?? ""}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button className="rounded-xl bg-brand px-6 py-2.5 font-bold text-white shadow hover:bg-brand-dark">
            💾 Lưu tài liệu &amp; Xuất bản
          </button>
          <Link href="/admin/documents/" className={ui.secondary}>
            Huỷ
          </Link>
        </div>
      </form>

      {doc && (
        <form action={deleteDocumentAction} className="mt-8 border-t pt-6">
          <input type="hidden" name="id" value={doc.id} />
          <ConfirmButton
            message="Xoá tài liệu này cùng dữ liệu khảo sát của nó?"
            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Xoá tài liệu này
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
