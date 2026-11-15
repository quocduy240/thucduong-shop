"use client";

import { useRef, useState } from "react";

/** Textarea for HTML content with a button that uploads an image and inserts an <img> tag at the cursor. */
export default function ContentEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function wrap(before: string, after: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    el.setRangeText(before + value.slice(s, e) + after, s, e, "end");
    el.focus();
  }

  async function upload(file: File) {
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload lỗi.");
      wrap(`\n<p><img src="${data.url}" alt=""></p>\n`, "");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const btn = "rounded border bg-white px-2 py-1 text-sm hover:bg-gray-50";
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={() => wrap("<h2>", "</h2>")}>Tiêu đề</button>
        <button type="button" className={`${btn} font-bold`} onClick={() => wrap("<strong>", "</strong>")}>B</button>
        <button type="button" className={`${btn} italic`} onClick={() => wrap("<em>", "</em>")}>I</button>
        <button type="button" className={btn} onClick={() => wrap("<p>", "</p>")}>Đoạn</button>
        <button type="button" className={btn} onClick={() => wrap("<ul>\n<li>", "</li>\n</ul>")}>Danh sách</button>
        <label className={`${btn} cursor-pointer`}>
          {busy ? "Đang tải..." : "🖼 Chèn ảnh"}
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </label>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
      <textarea
        ref={ref}
        name={name}
        defaultValue={defaultValue}
        rows={18}
        className="w-full rounded border p-3 font-mono text-sm"
      />
      <p className="mt-1 text-xs text-gray-500">Nội dung dạng HTML. Dùng các nút phía trên, hoặc dán HTML trực tiếp.</p>
    </div>
  );
}

