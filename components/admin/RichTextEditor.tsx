"use client";

import { useEffect, useRef, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitize-html";

export default function RichTextEditor({
  name,
  defaultValue = "",
  highlightsName = "highlights",
  defaultHighlights = "",
}: {
  name: string;
  defaultValue?: string;
  highlightsName?: string;
  defaultHighlights?: string;
}) {
  const [html, setHtml] = useState(defaultValue);
  const [highlights, setHighlights] = useState(defaultHighlights);
  const [mode, setMode] = useState<"visual" | "html" | "split">("visual");
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const visualRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visualRef.current && visualRef.current.innerHTML !== html) {
      visualRef.current.innerHTML = html;
    }
  }, [mode]); // sync when switching back to visual/split mode

  // Initialize visualRef once on mount
  useEffect(() => {
    if (visualRef.current) {
      visualRef.current.innerHTML = defaultValue;
    }
  }, [defaultValue]);

  function syncFromVisual() {
    if (visualRef.current) {
      setHtml(visualRef.current.innerHTML);
    }
  }

  function execCmd(cmd: string, value?: string) {
    if (mode === "html") setMode("visual");
    setTimeout(() => {
      visualRef.current?.focus();
      document.execCommand(cmd, false, value);
      syncFromVisual();
    }, 10);
  }

  function insertSnippet(snippet: string) {
    if (mode === "html") {
      setHtml((prev) => `${prev}\n${snippet}`);
      return;
    }
    visualRef.current?.focus();
    document.execCommand("insertHTML", false, snippet);
    syncFromVisual();
  }

  async function onUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setStatusMsg("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setStatusMsg(data.error ?? "Tải ảnh thất bại.");
      } else {
        insertSnippet(`<figure><img src="${data.url}" alt="" /><figcaption>Chú thích hình ảnh</figcaption></figure>`);
        setStatusMsg("✓ Đã chèn ảnh vào bài review.");
      }
    } finally {
      setUploading(false);
    }
  }

  function autoGenerateReview() {
    const form = visualRef.current?.closest("form");
    const titleInput = (form?.querySelector('[name="title"]') as HTMLInputElement)?.value?.trim() || "Tài liệu Thực dưỡng";
    const folderInput = (form?.querySelector('[name="folder_path"]') as HTMLInputElement)?.value?.trim() || "Thư viện Thực dưỡng";
    const typeSelect = (form?.querySelector('[name="doc_type"]') as HTMLSelectElement)?.value || "pdf";
    const pagesInput = (form?.querySelector('[name="pages"]') as HTMLInputElement)?.value || "45";
    const summaryInput =
      (form?.querySelector('[name="summary"]') as HTMLTextAreaElement)?.value?.trim() ||
      `Tài liệu hướng dẫn thực hành ${titleInput} theo phương pháp Thực Dưỡng Hiện Đại và Chữa Lành Tự Nhiên.`;

    const typeLabel =
      typeSelect === "ppt"
        ? "Bộ Slide Bài Giảng (PPTX)"
        : typeSelect === "doc"
          ? "Tài Liệu Biểu Mẫu (DOCX)"
          : typeSelect === "book"
            ? "Sách / Ấn Phẩm Thực Dưỡng"
            : "Tài Liệu Chuyên Đề (PDF)";

    const generatedHighlights = [
      `Hệ thống hóa kiến thức trọng tâm về "${titleInput}" ngắn gọn, dễ hiểu`,
      `Thuộc chuyên mục: ${folderInput} (${typeLabel} · ${pagesInput} trang)`,
      `Hướng dẫn từng bước áp dụng vào bữa ăn và lối sống hàng ngày cho gia đình`,
      `Đúc kết từ bài giảng thực tế trên kênh YouTube Duy Vo (@quocduy2401) & Thực Dưỡng Phúc Thọ`,
    ].join("\n");

    const generatedHtml = `<h3>1. Tổng quan &amp; Giá trị cốt lõi</h3>
<p><strong>${titleInput}</strong> là ${typeLabel.toLowerCase()} nằm trong thư mục <em>${folderInput}</em>. ${summaryInput}</p>
<blockquote><p>💡 <strong>Điểm nhấn quan trọng:</strong> Tài liệu được trình bày trực quan, kết hợp giữa nguyên lý Âm Dương của Thực dưỡng cổ truyền và góc nhìn dinh dưỡng học hiện đại (Whole-Food Plant-Based).</p></blockquote>
<h3>2. Tóm tắt Mục lục &amp; Nội dung chính</h3>
<ul>
  <li><strong>Phần 1 — Nền tảng nhận thức:</strong> Hiểu đúng nguyên nhân gốc rễ và cơ chế tự cân bằng của cơ thể.</li>
  <li><strong>Phần 2 — Hướng dẫn thực hành:</strong> Cách lựa chọn nguyên liệu, chế biến và định lượng phù hợp thể trạng.</li>
  <li><strong>Phần 3 — Lưu ý &amp; Câu hỏi thường gặp:</strong> Những sai lầm cần tránh trong quá trình áp dụng thực tế.</li>
</ul>
<h3>3. Ai nên đọc tài liệu này?</h3>
<p>Tài liệu đặc biệt hữu ích cho người mới bắt đầu tìm hiểu thực dưỡng, người đang muốn chủ động chăm sóc sức khỏe tự nhiên cho bản thân và gia đình mà không lạm dụng thuốc.</p>`;

    setHighlights(generatedHighlights);
    setHtml(generatedHtml);
    if (visualRef.current) {
      visualRef.current.innerHTML = generatedHtml;
    }
    setStatusMsg("✨ Đã tự động phân tích thông tin tài liệu và tạo khung Review + Điểm nổi bật!");
  }

  const btn =
    "rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:border-brand hover:bg-green-50 hover:text-brand";

  return (
    <div className="space-y-4">
      {/* Highlights / Key Takeaways Box */}
      <div className="rounded-xl border border-green-200 bg-green-50/40 p-4">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-bold text-brand">
            📌 Khung Điểm Nổi Bật / Mục Lục Tóm Tắt (Hiển thị ở khung Review nhanh)
          </label>
          <button
            type="button"
            onClick={autoGenerateReview}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-dark"
          >
            ✨ Tự động phân tích &amp; Tạo Review mẫu
          </button>
        </div>
        <textarea
          name={highlightsName}
          rows={4}
          value={highlights}
          onChange={(e) => setHighlights(e.target.value)}
          placeholder="Mỗi dòng 1 ý chính nổi bật hoặc chương mục lục của tài liệu..."
          className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none focus:border-brand"
        />
        <p className="mt-1 text-xs text-gray-500">
          Mỗi dòng sẽ hiển thị thành một mục dấu tích xanh (✓) trong khung xem trước tài liệu để người đọc nắm bắt nhanh giá trị trước khi tải.
        </p>
      </div>

      {/* Main Rich Text WYSIWYG Editor */}
      <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
        {/* Editor Header & Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gray-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={() => execCmd("formatBlock", "H3")} className={btn} title="Tiêu đề mục (H3)">
              H3 Tiêu đề
            </button>
            <button type="button" onClick={() => execCmd("formatBlock", "P")} className={btn} title="Đoạn văn thường">
              Đoạn văn
            </button>
            <span className="mx-0.5 text-gray-300">|</span>
            <button type="button" onClick={() => execCmd("bold")} className={`${btn} font-bold`} title="In đậm">
              B
            </button>
            <button type="button" onClick={() => execCmd("italic")} className={`${btn} italic`} title="In nghiêng">
              I
            </button>
            <button type="button" onClick={() => execCmd("underline")} className={`${btn} underline`} title="Gạch chân">
              U
            </button>
            <span className="mx-0.5 text-gray-300">|</span>
            <button type="button" onClick={() => execCmd("insertUnorderedList")} className={btn} title="Danh sách chấm">
              • Danh sách
            </button>
            <button type="button" onClick={() => execCmd("insertOrderedList")} className={btn} title="Danh sách đánh số">
              1. Đánh số
            </button>
            <span className="mx-0.5 text-gray-300">|</span>
            <button
              type="button"
              onClick={() =>
                insertSnippet(
                  `<blockquote><p>💡 <strong>Ghi chú / Trích dẫn quan trọng:</strong> Nhập nội dung điểm nhấn tại đây...</p></blockquote>`,
                )
              }
              className={btn}
            >
              💡 Khung lưu ý
            </button>
            <button
              type="button"
              onClick={() =>
                insertSnippet(
                  `<h3>📑 Mục lục tài liệu</h3><ul><li><strong>Chương 1:</strong> Giới thiệu tổng quan</li><li><strong>Chương 2:</strong> Nguyên tắc thực hành</li><li><strong>Chương 3:</strong> Thực đơn &amp; Ứng dụng</li></ul>`,
                )
              }
              className={btn}
            >
              📑 Mẫu Mục lục
            </button>
            <button
              type="button"
              onClick={() =>
                insertSnippet(
                  `<table><thead><tr><th>Nội dung</th><th>Chi tiết hướng dẫn</th></tr></thead><tbody><tr><td>Nhóm thực phẩm nên dùng</td><td>Gạo lứt, đậu hạt, rau củ hữu cơ theo mùa</td></tr><tr><td>Nhóm cần hạn chế</td><td>Đường tinh luyện, thực phẩm đóng hộp, dầu tinh luyện</td></tr></tbody></table>`,
                )
              }
              className={btn}
            >
              📊 Chèn Bảng
            </button>
            <button
              type="button"
              onClick={() => {
                const url = prompt("Nhập đường dẫn liên kết (URL):", "https://");
                if (url) execCmd("createLink", url);
              }}
              className={btn}
            >
              🔗 Link
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onUploadImage}
              className="hidden"
            />
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={btn}>
              {uploading ? "Đang tải..." : "🖼️ Chèn ảnh"}
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex rounded-lg border bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("visual")}
              className={`rounded-md px-2.5 py-1 font-medium ${
                mode === "visual" ? "bg-brand text-white" : "text-gray-600 hover:text-brand"
              }`}
            >
              👁️ Trực quan
            </button>
            <button
              type="button"
              onClick={() => setMode("split")}
              className={`rounded-md px-2.5 py-1 font-medium ${
                mode === "split" ? "bg-brand text-white" : "text-gray-600 hover:text-brand"
              }`}
            >
              ◫ Song song
            </button>
            <button
              type="button"
              onClick={() => setMode("html")}
              className={`rounded-md px-2.5 py-1 font-medium ${
                mode === "html" ? "bg-brand text-white" : "text-gray-600 hover:text-brand"
              }`}
            >
              &lt;/&gt; Mã HTML
            </button>
          </div>
        </div>

        {/* Hidden textarea submitted with form */}
        <textarea name={name} value={html} readOnly className="hidden" />

        {/* Editor Body */}
        <div className={mode === "split" ? "grid divide-x md:grid-cols-2" : ""}>
          {(mode === "visual" || mode === "split") && (
            <div className="p-4">
              <div
                ref={visualRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncFromVisual}
                onBlur={syncFromVisual}
                className="prose-content min-h-[280px] rounded-lg border border-dashed border-gray-200 p-3 outline-none focus:border-brand"
              />
            </div>
          )}
          {(mode === "html" || mode === "split") && (
            <div className="p-4 bg-gray-900 text-gray-100">
              <textarea
                rows={13}
                value={html}
                onChange={(e) => {
                  setHtml(e.target.value);
                  // nosemgrep: typescript.react.security.audit.react-unsanitized-property.react-unsanitized-property
                  if (visualRef.current) visualRef.current.innerHTML = sanitizeHtml(e.target.value);
                }}
                placeholder="Nhập mã HTML bài review chi tiết..."
                className="w-full bg-transparent font-mono text-xs leading-relaxed text-green-300 outline-none"
              />
            </div>
          )}
        </div>

        {statusMsg && (
          <div className="border-t bg-green-50 px-3 py-1.5 text-xs font-medium text-brand">{statusMsg}</div>
        )}
      </div>
    </div>
  );
}
