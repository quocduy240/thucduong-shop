"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { vnd } from "@/lib/site";
import AiImageRegenerateModal from "./AiImageRegenerateModal";
import EditorColorPopover from "./EditorColorPopover";
import ProductDescriptionAiPanel from "./ProductDescriptionAiPanel";

export type EditorProductItem = {
  id: number;
  name: string;
  slug: string;
  category_slug: string;
  category_name: string;
  price: number;
  sale_price: number | null;
  image: string | null;
  sku: string;
  brand: string;
  unit: string;
  summary: string;
};

const GOOGLE_DOCS_PALETTE = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#efefef", "#ffffff",
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#9900ff",
  "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#d9d2e9",
  "#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#b4a7d6",
  "#a61c00", "#cc0000", "#e69138", "#f1c232", "#2f7d32", "#134f5c", "#1155cc", "#674ea7",
];

function extractYtId(raw: string): string | null {
  const s = (raw || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m =
    s.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
    s.match(/youtube\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function ContentEditor({
  name,
  defaultValue,
  products = [],
  defaultComboIds = "",
  defaultComboTitle = "",
  sourceUrl = "",
  enableProductAiRewrite = false,
  variant = "post",
}: {
  name: string;
  defaultValue: string;
  products?: EditorProductItem[];
  defaultComboIds?: string;
  defaultComboTitle?: string;
  sourceUrl?: string;
  enableProductAiRewrite?: boolean;
  variant?: "post" | "product";
}) {
  const isProductMode = variant === "product";
  const [showAdvancedTools, setShowAdvancedTools] = useState(!isProductMode);
  const [html, setHtml] = useState(defaultValue);
  const [mode, setMode] = useState<"visual" | "split" | "html">("visual");
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [err, setErr] = useState("");

  // Product picker modal state
  const [pickerModal, setPickerModal] = useState<"single" | "combo" | null>(null);
  const [prodQuery, setProdQuery] = useState("");
  const [imgWidthPct, setImgWidthPct] = useState<number>(100);

  // Reusable Blocks picker modal state
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [reusableBlocks, setReusableBlocks] = useState<
    { id: number; slug: string; title: string; style_variant: string; positions: string; content_html: string }[]
  >([]);

  // Dynamic QR_Block picker modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrBlocks, setQrBlocks] = useState<
    { id: number; slug: string; name: string; target_url: string; caption: string; scans: number }[]
  >([]);

  // AI Gemini Multi-Source & Customizable Motif Studio state
  const [aiSourceType, setAiSourceType] = useState<"auto" | "web" | "youtube" | "gdocs" | "deep_research">("auto");
  const [aiUrl, setAiUrl] = useState("");
  const [aiRawText, setAiRawText] = useState("");
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [aiMotifEditorOpen, setAiMotifEditorOpen] = useState(false);
  const [aiMotif, setAiMotif] = useState("duyvo");
  const [aiMotifList, setAiMotifList] = useState<
    {
      id: string;
      name: string;
      badge: string;
      introPrefix: string;
      perspectiveTitle: string;
      perspectiveBody: string;
      conclusionTitle: string;
      promptInstruction: string;
      defaultMindmap: boolean;
      defaultCover: boolean;
      defaultProducts: boolean;
      defaultRefs: boolean;
      isBuiltin?: boolean;
    }[]
  >([]);
  const [editMotifId, setEditMotifId] = useState("");
  const [editMotifName, setEditMotifName] = useState("");
  const [editMotifBadge, setEditMotifBadge] = useState("Tuỳ chỉnh");
  const [editMotifIntro, setEditMotifIntro] = useState("Phân tích Chuyên sâu & Giải pháp Thực Dưỡng");
  const [editMotifPerspTitle, setEditMotifPerspTitle] = useState("Góc nhìn Thực Dưỡng Hiện Đại & Ứng dụng Thực tế");
  const [editMotifPerspBody, setEditMotifPerspBody] = useState("");
  const [editMotifConclusion, setEditMotifConclusion] = useState("Tổng kết & Khuyến nghị Thực hành");
  const [editMotifPrompt, setEditMotifPrompt] = useState("");
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const [aiMindmap, setAiMindmap] = useState(true);
  const [aiCover, setAiCover] = useState(true);
  const [aiProducts, setAiProducts] = useState(true);
  const [aiRefs, setAiRefs] = useState(true);
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const reportFileRef = useRef<HTMLInputElement>(null);
  const motifConfigFileRef = useRef<HTMLInputElement>(null);

  // Post-level Combo / Set state
  const [comboIds, setComboIds] = useState<number[]>(() =>
    (defaultComboIds || "")
      .split(/[\s,]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0),
  );
  const [comboTitle, setComboTitle] = useState(
    defaultComboTitle || "Combo Sản Phẩm Thực Dưỡng Khuyên Dùng Theo Bài Viết",
  );

  const visualRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [colorPopover, setColorPopover] = useState<"text" | "highlight" | null>(null);
  const [textColor, setTextColor] = useState("#2f7d32");
  const [highlightColor, setHighlightColor] = useState("#fef08a");

  // Voice-to-Text (vi-VN Web Speech API) state
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceInterim, setVoiceInterim] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Block Drag-and-Drop & Layout Control state
  const [activeBlockIdx, setActiveBlockIdx] = useState<number | null>(null);
  const [activeBlockTop, setActiveBlockTop] = useState<number>(0);
  const [activeBlockLabel, setActiveBlockLabel] = useState<string>("Khối");
  const [dragBlockIdx, setDragBlockIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  // Inline AI Selection Rewriter state
  const [selectedText, setSelectedText] = useState("");
  const [selAiOpen, setSelAiOpen] = useState(false);
  const [selTone, setSelTone] = useState("chuyen_gia_thuc_duong");
  const [selCustomPrompt, setSelCustomPrompt] = useState("");
  const [selBusy, setSelBusy] = useState(false);
  const [selPreviewHtml, setSelPreviewHtml] = useState("");

  // Click-image -> Gemini AI Image Regenerator state
  const [aiImgTarget, setAiImgTarget] = useState<{ el: HTMLImageElement; url: string } | null>(null);

  useEffect(() => {
    if (visualRef.current && visualRef.current.innerHTML !== defaultValue) {
      visualRef.current.innerHTML = defaultValue;
    }
  }, [defaultValue]);

  useEffect(() => {
    if (visualRef.current && visualRef.current.innerHTML !== html) {
      visualRef.current.innerHTML = html;
    }
  }, [mode]);

  useEffect(() => {
    function onInsertEvent(e: Event) {
      const detail = (e as CustomEvent<{ html?: string }>).detail;
      if (detail?.html) {
        setHtml((prev) => {
          const next = `${detail.html}\n${prev}`;
          // nosemgrep: typescript.react.security.audit.react-unsanitized-property.react-unsanitized-property
          if (visualRef.current) visualRef.current.innerHTML = sanitizeHtml(next);
          return next;
        });
      }
    }
    function onReplaceEvent(e: Event) {
      const detail = (e as CustomEvent<{ targetName?: string; html?: string; statusMsg?: string }>).detail;
      if (typeof detail?.html !== "string") return;
      if (detail.targetName && detail.targetName !== name) return;
      const cleaned = sanitizeHtml(detail.html);
      setHtml(cleaned);
      // nosemgrep: typescript.react.security.audit.react-unsanitized-property.react-unsanitized-property
      if (visualRef.current) visualRef.current.innerHTML = cleaned;
      if (detail.statusMsg) setStatusMsg(detail.statusMsg);
    }
    window.addEventListener("td:insert-html", onInsertEvent);
    window.addEventListener("td:replace-html", onReplaceEvent);
    return () => {
      window.removeEventListener("td:insert-html", onInsertEvent);
      window.removeEventListener("td:replace-html", onReplaceEvent);
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    fetch("/api/admin/blocks")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items)) setReusableBlocks(d.items);
      })
      .catch(() => {});

    fetch("/api/admin/qr")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items)) setQrBlocks(d.items);
      })
      .catch(() => {});

    fetch("/api/admin/ai-motifs")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items) && d.items.length > 0) {
          setAiMotifList(d.items);
        }
      })
      .catch(() => {});
  }, []);

  function selectMotifFromDropdown(motifId: string) {
    setAiMotif(motifId);
    const found = aiMotifList.find((m) => m.id === motifId);
    if (found) {
      setAiMindmap(found.defaultMindmap);
      setAiCover(found.defaultCover);
      setAiProducts(found.defaultProducts);
      setAiRefs(found.defaultRefs);
      setEditMotifId(found.id);
      setEditMotifName(found.name);
      setEditMotifBadge(found.badge);
      setEditMotifIntro(found.introPrefix);
      setEditMotifPerspTitle(found.perspectiveTitle);
      setEditMotifPerspBody(found.perspectiveBody);
      setEditMotifConclusion(found.conclusionTitle);
      setEditMotifPrompt(found.promptInstruction);
    }
  }

  async function saveCustomMotifPreset() {
    if (!editMotifName.trim()) {
      setErr("Vui lòng nhập Tên Mô-típ để hiển thị trong danh sách Dropdown.");
      return;
    }
    setErr("");
    try {
      const res = await fetch("/api/admin/ai-motifs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          preset: {
            id: editMotifId.trim() || undefined,
            name: editMotifName.trim(),
            badge: editMotifBadge.trim() || "Tuỳ chỉnh",
            introPrefix: editMotifIntro.trim(),
            perspectiveTitle: editMotifPerspTitle.trim(),
            perspectiveBody: editMotifPerspBody.trim(),
            conclusionTitle: editMotifConclusion.trim(),
            promptInstruction: editMotifPrompt.trim(),
            defaultMindmap: aiMindmap,
            defaultCover: aiCover,
            defaultProducts: aiProducts,
            defaultRefs: aiRefs,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.items)) throw new Error(data.error ?? "Không thể lưu cấu hình Mô-típ.");
      setAiMotifList(data.items);
      const saved = data.items.find((x: { name: string }) => x.name === editMotifName.trim()) ?? data.items[data.items.length - 1];
      if (saved) setAiMotif(saved.id);
      setAiMotifEditorOpen(false);
      setStatusMsg(`✓ Đã lưu Mô-típ "${editMotifName}" vào file cấu hình data/ai-motifs.json và cập nhật Dropdown!`);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function deleteCustomMotifPreset(id: string) {
    try {
      const res = await fetch("/api/admin/ai-motifs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (Array.isArray(data.items)) {
        setAiMotifList(data.items);
        setAiMotif(data.items[0]?.id ?? "duyvo");
        setStatusMsg("✓ Đã xoá Mô-típ tuỳ chỉnh khỏi danh sách.");
      }
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  function exportMotifConfigFile() {
    const blob = new Blob([JSON.stringify(aiMotifList, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-motifs-thucduong-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg("📥 Đã xuất file cấu hình Mô-típ viết bài (.json) về máy tính!");
  }

  async function importMotifConfigFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const presets = Array.isArray(parsed) ? parsed : [parsed];
      const res = await fetch("/api/admin/ai-motifs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", presets }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.items)) throw new Error(data.error ?? "File cấu hình không hợp lệ.");
      setAiMotifList(data.items);
      setStatusMsg(`📤 Đã nạp thành công ${presets.length} Mô-típ từ file "${file.name}" vào Dropdown List!`);
    } catch (e) {
      setErr(`Lỗi đọc file cấu hình Mô-típ: ${(e as Error).message}`);
    }
  }

  async function handleReportFileUpload(file: File) {
    try {
      const text = await file.text();
      setAiRawText(text);
      setAiSourceType("deep_research");
      setStatusMsg(`📄 Đã nạp báo cáo "${file.name}" (${text.length.toLocaleString()} ký tự) sẵn sàng phân tích!`);
    } catch {
      setErr("Không thể đọc nội dung file báo cáo.");
    }
  }

  function syncFromVisual() {
    if (visualRef.current) {
      setHtml(visualRef.current.innerHTML);
    }
  }

  function execCmd(cmd: string, val?: string) {
    if (mode === "html") setMode("visual");
    setTimeout(() => {
      visualRef.current?.focus();
      document.execCommand(cmd, false, val);
      syncFromVisual();
    }, 10);
  }

  function saveCurrentSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function toggleColorPopover(kind: "text" | "highlight") {
    saveCurrentSelection();
    setColorPopover((prev) => (prev === kind ? null : kind));
  }

  function applyColor(kind: "text" | "highlight", color: string) {
    if (mode === "html") setMode("visual");
    setColorPopover(null);
    if (kind === "text") setTextColor(color === "inherit" ? "#1f2937" : color);
    else setHighlightColor(color === "transparent" ? "#fef08a" : color);

    setTimeout(() => {
      visualRef.current?.focus();
      const sel = window.getSelection();
      if (savedRangeRef.current && sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
      // CSS variables (var(--brand), etc.) are not supported by execCommand("foreColor") in all browsers
      if (color.startsWith("var(") && sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const span = document.createElement("span");
        if (kind === "text") span.style.color = color;
        else span.style.backgroundColor = color;
        span.appendChild(range.extractContents());
        range.insertNode(span);
        sel.removeAllRanges();
        const nextRange = document.createRange();
        nextRange.selectNodeContents(span);
        sel.addRange(nextRange);
        syncFromVisual();
        return;
      }
      try {
        document.execCommand("styleWithCSS", false, "true");
      } catch {
        /* ignore */
      }
      if (kind === "text") {
        document.execCommand("foreColor", false, color === "inherit" ? "inherit" : color);
      } else {
        const ok = document.execCommand("hiliteColor", false, color);
        if (!ok) document.execCommand("backColor", false, color);
      }
      syncFromVisual();
    }, 10);
  }

  function insertTextAtCursor(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const toInsert = `${clean} `;

    if (mode === "html" && htmlTextareaRef.current) {
      const ta = htmlTextareaRef.current;
      const start = ta.selectionStart ?? html.length;
      const end = ta.selectionEnd ?? html.length;
      const next = html.slice(0, start) + toInsert + html.slice(end);
      setHtml(next);
      // nosemgrep: typescript.react.security.audit.react-unsanitized-property.react-unsanitized-property
      if (visualRef.current) visualRef.current.innerHTML = sanitizeHtml(next);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + toInsert.length;
        ta.setSelectionRange(pos, pos);
      });
      return;
    }

    if (visualRef.current) {
      visualRef.current.focus();
      const sel = window.getSelection();
      if (savedRangeRef.current && sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
      document.execCommand("insertText", false, toInsert);
      if (sel && sel.rangeCount > 0) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
      syncFromVisual();
    }
  }

  function toggleVoiceDictation() {
    if (voiceListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      setVoiceListening(false);
      setVoiceInterim("");
      return;
    }

    setErr("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setErr("Trình duyệt hiện tại chưa hỗ trợ nhập liệu giọng nói. Vui lòng dùng Google Chrome hoặc Microsoft Edge.");
      return;
    }

    // Save current cursor range inside Visual editor before starting
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && visualRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }

    const recognition = new SpeechRec();
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setVoiceListening(true);
      setVoiceInterim("");
      setStatusMsg("🎙️ Đang bật micro tiếng Việt — Hãy đặt con trỏ vào vị trí cần nhập và đọc...");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0]?.transcript ?? "";
        if (res.isFinal) {
          finalChunk += transcript;
        } else {
          interimChunk += transcript;
        }
      }
      setVoiceInterim(interimChunk.trim());
      if (finalChunk.trim()) {
        insertTextAtCursor(finalChunk);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      const code = event?.error as string | undefined;
      if (code === "no-speech") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setErr("Không có quyền truy cập Micro. Vui lòng cho phép quyền Micro trên thanh địa chỉ trình duyệt.");
      } else if (code !== "aborted") {
        setErr(`Lỗi nhận diện giọng nói (${code ?? "unknown"}).`);
      }
      setVoiceListening(false);
      setVoiceInterim("");
    };

    recognition.onend = () => {
      setVoiceListening(false);
      setVoiceInterim("");
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setErr((e as Error).message || "Không thể khởi động Micro.");
      setVoiceListening(false);
    }
  }

  function findTopLevelBlock(node: Node | null): { el: HTMLElement; idx: number; label: string } | null {
    const root = visualRef.current;
    if (!root || !node) return null;
    let cur: Node | null = node;
    while (cur && cur !== root && cur.parentNode !== root) {
      cur = cur.parentNode;
    }
    if (!cur || cur === root || !(cur instanceof HTMLElement)) return null;
    const children = Array.from(root.children);
    const idx = children.indexOf(cur);
    if (idx < 0) return null;

    const tag = cur.tagName.toLowerCase();
    const txt = cur.textContent?.trim() ?? "";
    let label = "Đoạn văn";
    if (tag === "figure" || cur.querySelector("img")) label = "🖼️ Hình ảnh";
    else if (cur.classList.contains("mindmap-box") || cur.querySelector("svg")) label = "🧠 Biểu đồ / Sơ đồ";
    else if (tag === "table") label = "📊 Bảng";
    else if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") label = `📌 ${tag.toUpperCase()}`;
    else if (tag === "ul" || tag === "ol") label = "☰ Danh sách";
    else if (tag === "blockquote") label = "❝ Trích dẫn";
    else if (txt.includes("[[block:") || txt.includes("[[qr:") || txt.includes("[[product")) label = "🧩 Block / QR";

    return { el: cur, idx, label };
  }

  function updateActiveBlockFromTarget(target: EventTarget | null) {
    if (!(target instanceof Node)) return;
    const info = findTopLevelBlock(target);
    if (!info) return;
    setActiveBlockIdx(info.idx);
    setActiveBlockLabel(info.label);
    setActiveBlockTop(Math.max(0, info.el.offsetTop - 6));
  }

  function moveBlock(fromIdx: number, toIdx: number) {
    const root = visualRef.current;
    if (!root) return;
    const children = Array.from(root.children) as HTMLElement[];
    if (fromIdx < 0 || fromIdx >= children.length || toIdx < 0 || toIdx >= children.length || fromIdx === toIdx) {
      return;
    }
    const dragged = children[fromIdx];
    const target = children[toIdx];
    if (fromIdx < toIdx) {
      root.insertBefore(dragged, target.nextSibling);
    } else {
      root.insertBefore(dragged, target);
    }
    syncFromVisual();
    setActiveBlockIdx(toIdx);
    setActiveBlockTop(Math.max(0, dragged.offsetTop - 6));
  }

  function styleActiveBlock(
    action: "left" | "center" | "right" | "float-left" | "float-right" | "w-50" | "w-75" | "w-100" | "delete",
  ) {
    const root = visualRef.current;
    if (!root || activeBlockIdx === null) return;
    const el = root.children[activeBlockIdx] as HTMLElement | undefined;
    if (!el) return;

    if (action === "delete") {
      el.remove();
      setActiveBlockIdx(null);
      syncFromVisual();
      return;
    }

    if (action === "left") {
      el.style.float = "none";
      el.style.marginLeft = "0";
      el.style.marginRight = "auto";
      el.style.textAlign = "left";
    } else if (action === "center") {
      el.style.float = "none";
      el.style.marginLeft = "auto";
      el.style.marginRight = "auto";
      el.style.textAlign = "center";
    } else if (action === "right") {
      el.style.float = "none";
      el.style.marginLeft = "auto";
      el.style.marginRight = "0";
      el.style.textAlign = "right";
    } else if (action === "float-left") {
      el.style.float = "left";
      el.style.margin = "4px 18px 12px 0";
      if (!el.style.width || el.style.width === "100%") el.style.width = "48%";
    } else if (action === "float-right") {
      el.style.float = "right";
      el.style.margin = "4px 0 12px 18px";
      if (!el.style.width || el.style.width === "100%") el.style.width = "48%";
    } else if (action === "w-50") {
      el.style.width = "50%";
    } else if (action === "w-75") {
      el.style.width = "75%";
    } else if (action === "w-100") {
      el.style.float = "none";
      el.style.width = "100%";
      el.style.margin = "12px 0";
    }
    syncFromVisual();
  }

  function handleVisualSelectionCheck() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !visualRef.current?.contains(sel.anchorNode)) {
      return;
    }
    const txt = sel.toString().trim();
    if (txt.length >= 4) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      setSelectedText(txt);
    } else if (!selAiOpen) {
      setSelectedText("");
    }
  }

  async function runSelectionAiRewrite() {
    if (!selectedText.trim()) return;
    setSelBusy(true);
    setErr("");
    setSelPreviewHtml("");
    try {
      const form = visualRef.current?.closest("form");
      const titleInput = form?.querySelector('[name="title"], [name="name"]') as HTMLInputElement | null;
      const res = await fetch("/api/admin/ai-rewrite-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText,
          tone: selTone,
          customInstruction: selCustomPrompt,
          contextTitle: titleInput?.value?.trim() || "",
          geminiApiKey: aiApiKey,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; rewrittenHtml?: string; error?: string; note?: string };
      if (!res.ok || !data.ok || !data.rewrittenHtml) {
        throw new Error(data.error || "Không thể viết lại đoạn đã chọn.");
      }
      setSelPreviewHtml(data.rewrittenHtml);
      if (data.note) setStatusMsg(data.note);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSelBusy(false);
    }
  }

  function applySelectionRewrite(modeApply: "replace" | "append") {
    if (!selPreviewHtml || !visualRef.current) return;
    visualRef.current.focus();
    const sel = window.getSelection();
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges();
      if (modeApply === "append") {
        const endRange = savedRangeRef.current.cloneRange();
        endRange.collapse(false);
        sel.addRange(endRange);
      } else {
        sel.addRange(savedRangeRef.current);
      }
    }
    document.execCommand("insertHTML", false, selPreviewHtml);
    syncFromVisual();
    setSelAiOpen(false);
    setSelPreviewHtml("");
    setSelectedText("");
    setStatusMsg("✨ Đã cập nhật đoạn văn bản viết lại bằng AI!");
  }

  function insertHtmlSnippet(snippet: string) {
    if (mode === "html") {
      setHtml((prev) => `${prev}\n${snippet}`);
      return;
    }
    visualRef.current?.focus();
    document.execCommand("insertHTML", false, snippet);
    syncFromVisual();
  }

  async function compressImageToWebp(file: File): Promise<File> {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif" || file.size <= 120 * 1024) {
      return file;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const maxW = 1200;
      const scale = bitmap.width > maxW ? maxW / bitmap.width : 1;
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
      if (!blob || blob.size >= file.size) return file;
      const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
      return new File([blob], `${baseName}.webp`, { type: "image/webp" });
    } catch {
      return file;
    }
  }

  async function uploadImage(file: File) {
    setBusy(true);
    setErr("");
    setStatusMsg("");
    try {
      const optimized = await compressImageToWebp(file);
      const fd = new FormData();
      fd.append("file", optimized);
      const res = await fetch("/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload ảnh thất bại.");
      insertHtmlSnippet(
        `<figure style="text-align:center;margin:16px 0;"><img src="${data.url}" alt="Hình minh họa" loading="lazy" decoding="async" style="width:${imgWidthPct}%;max-width:100%;border-radius:12px;" /><figcaption>Hình minh họa thực dưỡng</figcaption></figure><p></p>`,
      );
      const savedPct = file.size > optimized.size ? ` (đã nén WebP giảm ${Math.round(((file.size - optimized.size) / file.size) * 100)}%)` : "";
      setStatusMsg(`✓ Đã tải và chèn ảnh${savedPct} (rộng ${imgWidthPct}%).`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runAiRewrite() {
    if (!aiUrl.trim() && !aiRawText.trim()) {
      setErr(
        "Vui lòng dán đường link (Website / Video YouTube / Google Docs) hoặc dán nội dung Báo cáo chuyên sâu Deep Research.",
      );
      return;
    }
    setAiBusy(true);
    setErr("");
    setStatusMsg("");
    try {
      const res = await fetch("/api/admin/ai-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: aiSourceType,
          url: aiUrl.trim(),
          rawText: aiRawText.trim(),
          motif: aiMotif,
          customPrompt: aiCustomPrompt,
          includeMindmap: aiMindmap,
          includeProducts: aiProducts,
          includeReferences: aiRefs,
          generateCover: aiCover,
          geminiApiKey: aiApiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Không thể phân tích dữ liệu nguồn.");
      }

      // Populate form fields (title/name, slug, excerpt/summary) automatically
      const form = visualRef.current?.closest("form");
      if (form) {
        const titleEl = (form.querySelector('[name="title"]') ||
          form.querySelector('[name="name"]')) as HTMLInputElement | null;
        const slugEl = form.querySelector('[name="slug"]') as HTMLInputElement | null;
        const excerptEl = (form.querySelector('[name="excerpt"]') ||
          form.querySelector('[name="summary"]')) as HTMLTextAreaElement | null;
        if (titleEl && data.title) titleEl.value = data.title;
        if (slugEl && data.slug) slugEl.value = data.slug;
        if (excerptEl && data.excerpt) excerptEl.value = data.excerpt;
      }

      if (data.coverUrl) {
        window.dispatchEvent(new CustomEvent("td:update-cover", { detail: { url: data.coverUrl } }));
      }
      if (Array.isArray(data.comboIds) && data.comboIds.length > 0) {
        setComboIds(data.comboIds);
      }
      if (data.comboTitle) {
        setComboTitle(data.comboTitle);
      }

      setHtml(data.contentHtml);
      if (visualRef.current) {
        visualRef.current.innerHTML = data.contentHtml;
      }
      setStatusMsg(
        `✨ Đã phân tích [${data.sourceLabel || "Dữ liệu nguồn"}] theo mô-típ "${data.motifName || aiMotif}", vẽ Sơ đồ tư duy Mindmap và hoàn thiện bài viết mới chuẩn SEO${
          data.usedGemini ? " (bằng Gemini AI)" : ""
        }!`,
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  function insertSingleProductBlock(p: EditorProductItem) {
    const prodHref = `/san-pham/${p.category_slug}/${p.slug}.html`;
    const effPrice = p.sale_price ?? p.price;
    const priceText = effPrice > 0 ? vnd(effPrice) : "Liên hệ";
    const oldPriceHtml =
      p.sale_price && p.sale_price < p.price
        ? `<span style="text-decoration:line-through;color:#9ca3af;font-size:13px;margin-left:8px;">${vnd(p.price)}</span>`
        : "";
    const metaText = [p.brand, p.unit].filter(Boolean).join(" · ");

    const snippet = `
<div data-shop-product-id="${p.id}" class="my-5 flex flex-col gap-4 rounded-2xl border-2 border-green-600/30 bg-green-50/60 p-4 sm:flex-row sm:items-center" style="border:2px solid #86efac;background:#f0fdf4;border-radius:16px;padding:16px;margin:20px 0;">
  ${
    p.image
      ? `<img src="${p.image}" alt="${p.name}" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid #d1d5db;flex-shrink:0;" />`
      : ""
  }
  <div style="flex:1;min-width:0;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#15803d;letter-spacing:0.04em;">
      🌱 Sản phẩm khuyên dùng trong bài viết ${metaText ? `· ${metaText}` : ""}
    </div>
    <div style="font-size:16px;font-weight:700;color:#111827;margin-top:2px;">
      <a href="${prodHref}" style="color:#111827;text-decoration:none;">${p.name}</a>
    </div>
    <div style="margin-top:4px;">
      <span style="font-size:17px;font-weight:800;color:#c62828;">${priceText}</span>
      ${oldPriceHtml}
    </div>
    ${p.summary ? `<p style="font-size:13px;color:#4b5563;margin:4px 0 0;">${p.summary}</p>` : ""}
  </div>
  <div style="flex-shrink:0;">
    <a href="${prodHref}" data-add-product-id="${p.id}" style="display:inline-block;background:#2f7d32;color:#ffffff;font-weight:700;font-size:13px;padding:10px 18px;border-radius:12px;text-decoration:none;">
      🛒 Mua ngay / Xem chi tiết →
    </a>
  </div>
</div><p></p>`;

    insertHtmlSnippet(snippet);
    setPickerModal(null);
    setStatusMsg(`✓ Đã chèn Block sản phẩm "${p.name}" vào bài viết!`);
  }

  function insertComboBlockToContent() {
    const selected = products.filter((p) => comboIds.includes(p.id));
    if (selected.length === 0) {
      setErr("Vui lòng chọn ít nhất 1 sản phẩm cho Gói/Set.");
      return;
    }
    const totalCombo = selected.reduce((sum, p) => sum + (p.sale_price ?? p.price), 0);
    const cardsHtml = selected
      .map((p) => {
        const href = `/san-pham/${p.category_slug}/${p.slug}.html`;
        const priceStr = (p.sale_price ?? p.price) > 0 ? vnd(p.sale_price ?? p.price) : "Liên hệ";
        return `
      <div data-shop-product-id="${p.id}" style="background:#ffffff;border:1px solid #d1d5db;border-radius:12px;padding:12px;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="font-size:11px;color:#2f7d32;font-weight:600;">${[p.brand, p.unit].filter(Boolean).join(" · ")}</div>
          <a href="${href}" style="font-size:14px;font-weight:700;color:#111827;text-decoration:none;display:block;margin-top:2px;">${p.name}</a>
        </div>
        <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-weight:800;color:#c62828;font-size:14px;">${priceStr}</span>
          <a href="${href}" style="font-size:12px;font-weight:700;color:#2f7d32;text-decoration:underline;">Xem SP →</a>
        </div>
      </div>`;
      })
      .join("");

    const snippet = `
<div data-shop-combo-ids="${comboIds.join(",")}" style="border:2px solid #2f7d32;background:#f0fdf4;border-radius:16px;padding:18px;margin:24px 0;">
  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;border-bottom:1px solid #bbf7d0;padding-bottom:10px;">
    <div>
      <span style="background:#2f7d32;color:#ffffff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;text-transform:uppercase;">🎁 Gói Sản Phẩm Theo Bài Viết</span>
      <h3 style="margin:6px 0 0;font-size:18px;font-weight:800;color:#14532d;">${comboTitle}</h3>
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;color:#4b5563;">Trọn bộ ${selected.length} sản phẩm:</div>
      <div style="font-size:18px;font-weight:800;color:#c62828;">${vnd(totalCombo)}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
    ${cardsHtml}
  </div>
</div><p></p>`;

    insertHtmlSnippet(snippet);
    setPickerModal(null);
    setStatusMsg(`✓ Đã chèn Block Set "${comboTitle}" (${selected.length} sản phẩm) vào bài viết!`);
  }

  function toggleComboProduct(pid: number) {
    setComboIds((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  }

  const filteredProducts = useMemo(() => {
    const q = prodQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 40);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          p.category_name.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [products, prodQuery]);

  const selectedComboProducts = useMemo(
    () => products.filter((p) => comboIds.includes(p.id)),
    [products, comboIds],
  );

  // Word & reading time stats
  const stats = useMemo(() => {
    const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const words = plain ? plain.split(" ").length : 0;
    const chars = plain.length;
    const readMins = Math.max(1, Math.ceil(words / 220));
    return { words, chars, readMins };
  }, [html]);

  const tbtn =
    "inline-flex items-center justify-center rounded border border-transparent px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-white hover:text-brand transition";

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 flex flex-col bg-gray-100 p-4 overflow-auto" : "space-y-4"}>
      {/* Hidden inputs for form submission */}
      <textarea name={name} value={html} readOnly className="hidden" />
      <input type="hidden" name="related_product_ids" value={comboIds.join(",")} />
      <input type="hidden" name="combo_title" value={comboTitle} />

      {/* AI GEMINI MULTI-SOURCE & EXPANDABLE MOTIF ARTICLE STUDIO (Blog / Post mode only) */}
      {!isProductMode && (
      <div className="rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-r from-green-50/90 via-emerald-50/50 to-teal-50/70 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-base font-bold text-white shadow-xs">
              🤖
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Trợ lý AI Gemini: Phân Tích Đa Nguồn (Web · YouTube · Google Docs · Deep Research) → Viết Bài Chuẩn SEO
              </h3>
              <p className="text-[11px] text-gray-600">
                Đọc nội dung Website, lấy nội dung &amp; phụ đề Video YouTube, đọc tài liệu Google Docs trên Drive hoặc Báo cáo chuyên sâu Gemini Deep Research theo Mô-típ tuỳ chỉnh.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAiConfigOpen((o) => !o)}
              className="rounded-xl border border-brand/40 bg-white px-3 py-1.5 text-xs font-bold text-brand hover:bg-green-50 cursor-pointer"
            >
              ⚙️ {aiConfigOpen ? "Thu gọn cấu hình Mô-típ" : "Quản lý Mô-típ & Cấu hình AI"}
            </button>
          </div>
        </div>

        {/* Thanh chọn nguồn dữ liệu đầu vào (Source Type Tabs) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {[
            { id: "auto", label: "🔄 Tự động nhận diện", hint: "Dán link Web, YouTube hoặc Google Docs bất kỳ" },
            { id: "web", label: "🌐 Link Website / Báo chí", hint: "Đọc bài viết từ trang web bất kỳ" },
            { id: "youtube", label: "🎬 Link Video YouTube", hint: "Trích xuất tiêu đề, mô tả, phụ đề & nhúng video" },
            { id: "gdocs", label: "📄 Google Docs (Drive)", hint: "Đọc trực tiếp nội dung văn bản từ Google Document" },
            { id: "deep_research", label: "🔬 Báo cáo Deep Research", hint: "Dán báo cáo chuyên sâu hoặc tải file .md / .txt" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setAiSourceType(tab.id as typeof aiSourceType);
                if (tab.id === "youtube") selectMotifFromDropdown("youtube_lecture");
                else if (tab.id === "gdocs") selectMotifFromDropdown("gdocs_handbook");
                else if (tab.id === "deep_research") selectMotifFromDropdown("deep_research");
              }}
              title={tab.hint}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                aiSourceType === tab.id
                  ? "bg-brand text-white shadow-xs"
                  : "border border-emerald-200 bg-white/80 text-gray-700 hover:bg-white hover:text-brand"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Hàng chọn nhanh Mô-típ trong Dropdown List + Ô nhập Link nguồn */}
        <div className="grid gap-2 md:grid-cols-[290px_1fr_auto]">
          <div>
            <select
              value={aiMotif}
              onChange={(e) => selectMotifFromDropdown(e.target.value)}
              className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2.5 text-xs font-bold text-gray-800 outline-none focus:border-brand"
              title="Chọn Mô-típ viết bài từ danh sách cấu hình"
            >
              {aiMotifList.length > 0 ? (
                aiMotifList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="duyvo">🌿 Chuyên gia Thực Dưỡng Hiện Đại (Phong cách Duy Vo)</option>
                  <option value="deep_research">🔬 Tổng hợp Báo cáo Chuyên sâu (Gemini Deep Research)</option>
                  <option value="youtube_lecture">🎬 Chuyển thể Bài giảng Video YouTube</option>
                  <option value="gdocs_handbook">📄 Biên tập Tài liệu Google Docs / Cẩm nang</option>
                  <option value="step_by_step">📖 Cẩm nang Hướng dẫn Thực hành từng bước</option>
                  <option value="medical_wfpb">🧬 Phân tích Khoa học Đông Tây Y &amp; WFPB</option>
                  <option value="storytelling">🧘 Truyền cảm hứng Chuyển hóa Lối sống &amp; Tâm An</option>
                  <option value="seo_conversion">🎯 Chuẩn SEO Chuyển đổi cao &amp; Gợi ý Trợ phương</option>
                </>
              )}
            </select>
          </div>

          <input
            value={aiUrl}
            onChange={(e) => setAiUrl(e.target.value)}
            placeholder={
              aiSourceType === "youtube"
                ? "Dán link Video YouTube (VD: https://www.youtube.com/watch?v=... hoặc https://youtu.be/...)"
                : aiSourceType === "gdocs"
                  ? "Dán link Google Docs trên Drive (VD: https://docs.google.com/document/d/.../edit)"
                  : aiSourceType === "deep_research"
                    ? "Dán link chia sẻ báo cáo Gemini/Docs (hoặc nhập nội dung báo cáo ở khung bên dưới)"
                    : "Dán link Website, Video YouTube hoặc Google Docs bất kỳ..."
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand"
          />

          <button
            type="button"
            disabled={aiBusy}
            onClick={runAiRewrite}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-dark to-brand px-5 py-2.5 text-xs font-bold text-white shadow transition hover:opacity-95 disabled:opacity-50 sm:text-sm cursor-pointer"
          >
            {aiBusy ? "⏳ Đang phân tích & viết bài..." : "✨ Phân Tích & Viết Bài Mới"}
          </button>
        </div>

        {/* Khung nhập / tải file Báo cáo Chuyên sâu Gemini Deep Research hoặc Nội dung bổ sung */}
        {(aiSourceType === "deep_research" || aiRawText.length > 0) && (
          <div className="rounded-xl border border-blue-200 bg-white p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-blue-900">
                🔬 Nội dung Báo cáo Chuyên sâu (Gemini Deep Research / Tài liệu thô / Ghi chú bài giảng):
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={reportFileRef}
                  type="file"
                  accept=".md,.txt,.html,.json,.csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleReportFileUpload(f);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => reportFileRef.current?.click()}
                  className="rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                >
                  📂 Tải file báo cáo (.md, .txt, .html)
                </button>
                {aiRawText && (
                  <button
                    type="button"
                    onClick={() => setAiRawText("")}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    Xoá nội dung
                  </button>
                )}
              </div>
            </div>
            <textarea
              rows={5}
              value={aiRawText}
              onChange={(e) => setAiRawText(e.target.value)}
              placeholder="Dán toàn bộ báo cáo chuyên sâu từ AI Gemini Deep Research, nội dung tài liệu Google Docs hoặc kịch bản video vào đây để AI tổng hợp thành bài viết chuẩn SEO..."
              className="w-full rounded-lg border border-gray-300 p-2.5 text-xs leading-relaxed outline-none focus:border-brand"
            />
          </div>
        )}

        {/* Bảng Quản lý Mô-típ Mở rộng & Cấu hình File (.json) */}
        {aiConfigOpen && (
          <div className="rounded-xl border border-green-200 bg-white p-4 text-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <div className="font-bold text-gray-900 text-sm">
                  🎛️ Quản lý Mô-típ Viết Bài &amp; Lưu File Cấu Hình (data/ai-motifs.json)
                </div>
                <p className="text-[11px] text-gray-500">
                  Thiết lập các Mô-típ văn phong khác nhau để chọn nhanh từ Dropdown List, hoặc xuất/nhập file cấu hình JSON.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const current = aiMotifList.find((m) => m.id === aiMotif);
                    if (current) {
                      setEditMotifId(current.id);
                      setEditMotifName(current.name);
                      setEditMotifBadge(current.badge);
                      setEditMotifIntro(current.introPrefix);
                      setEditMotifPerspTitle(current.perspectiveTitle);
                      setEditMotifPerspBody(current.perspectiveBody);
                      setEditMotifConclusion(current.conclusionTitle);
                      setEditMotifPrompt(current.promptInstruction);
                    }
                    setAiMotifEditorOpen((o) => !o);
                  }}
                  className="rounded-lg bg-emerald-50 border border-emerald-300 px-2.5 py-1.5 font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                >
                  ✏️ Sửa Mô-típ đang chọn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMotifId("");
                    setEditMotifName("");
                    setEditMotifBadge("Chuyên đề mới");
                    setEditMotifIntro("Góc nhìn Thực Dưỡng & Chăm sóc Sức khỏe");
                    setEditMotifPerspTitle("Phân tích Chuyên gia & Ứng dụng Thực tế");
                    setEditMotifPerspBody(
                      "Kết hợp chế độ ăn thực dưỡng quân bình Âm Dương cùng lối sống thuận tự nhiên giúp cơ thể phục hồi bền vững.",
                    );
                    setEditMotifConclusion("Tổng kết & Lời khuyên Thực hành");
                    setEditMotifPrompt("Viết bài chuẩn SEO, chia mục H2/H3 rõ ràng, văn phong gần gũi và thuyết phục.");
                    setAiMotifEditorOpen(true);
                  }}
                  className="rounded-lg bg-brand px-2.5 py-1.5 font-bold text-white hover:bg-brand-dark cursor-pointer"
                >
                  ➕ Thêm Mô-típ mới
                </button>
                <button
                  type="button"
                  onClick={exportMotifConfigFile}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  📥 Xuất file cấu hình (.json)
                </button>
                <input
                  ref={motifConfigFileRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importMotifConfigFile(f);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => motifConfigFileRef.current?.click()}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  📤 Nhập file cấu hình (.json)
                </button>
              </div>
            </div>

            {/* Khung Tạo mới / Chỉnh sửa một Mô-típ để lưu vào Dropdown */}
            {aiMotifEditorOpen && (
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900">
                    {editMotifId ? `Đang chỉnh sửa Mô-típ: ${editMotifId}` : "✨ Thiết lập Mô-típ Viết Bài Mới"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAiMotifEditorOpen(false)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    ✕ Đóng
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-bold text-gray-700">Tên Mô-típ (Hiển thị trong Dropdown) *</label>
                    <input
                      value={editMotifName}
                      onChange={(e) => setEditMotifName(e.target.value)}
                      placeholder="VD: 🍵 Phác đồ Thực Dưỡng Chữa Lành Tiêu Hóa"
                      className="w-full rounded-lg border bg-white px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">Nhãn phân loại (Badge)</label>
                    <input
                      value={editMotifBadge}
                      onChange={(e) => setEditMotifBadge(e.target.value)}
                      placeholder="VD: Phác đồ"
                      className="w-full rounded-lg border bg-white px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">Cụm tiêu đề phụ SEO (Intro Prefix)</label>
                    <input
                      value={editMotifIntro}
                      onChange={(e) => setEditMotifIntro(e.target.value)}
                      className="w-full rounded-lg border bg-white px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">Tiêu đề mục Góc nhìn chuyên gia</label>
                    <input
                      value={editMotifPerspTitle}
                      onChange={(e) => setEditMotifPerspTitle(e.target.value)}
                      className="w-full rounded-lg border bg-white px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">Tiêu đề mục Kết luận</label>
                    <input
                      value={editMotifConclusion}
                      onChange={(e) => setEditMotifConclusion(e.target.value)}
                      className="w-full rounded-lg border bg-white px-3 py-1.5"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-1 block font-bold text-gray-700">
                      Nội dung Triết lý / Quan điểm cốt lõi của Mô-típ:
                    </label>
                    <textarea
                      rows={2}
                      value={editMotifPerspBody}
                      onChange={(e) => setEditMotifPerspBody(e.target.value)}
                      className="w-full rounded-lg border bg-white px-3 py-1.5"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-1 block font-bold text-gray-700">
                      Prompt chỉ dẫn văn phong cho AI Gemini (System Instruction):
                    </label>
                    <textarea
                      rows={2}
                      value={editMotifPrompt}
                      onChange={(e) => setEditMotifPrompt(e.target.value)}
                      className="w-full rounded-lg border bg-white px-3 py-1.5"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveCustomMotifPreset}
                      className="rounded-lg bg-brand px-4 py-1.5 font-bold text-white hover:bg-brand-dark cursor-pointer"
                    >
                      💾 Lưu Mô-típ vào File Cấu Hình &amp; Dropdown
                    </button>
                    {editMotifId && !aiMotifList.find((m) => m.id === editMotifId)?.isBuiltin && (
                      <button
                        type="button"
                        onClick={() => deleteCustomMotifPreset(editMotifId)}
                        className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        🗑️ Xoá Mô-típ này
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500">Tự động lưu vào: data/ai-motifs.json</span>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-bold text-gray-700">
                  Yêu cầu bổ sung cho bài viết hiện tại (Tuỳ chọn):
                </label>
                <input
                  value={aiCustomPrompt}
                  onChange={(e) => setAiCustomPrompt(e.target.value)}
                  placeholder="VD: Nhấn mạnh cách nấu cháo nano gạo lứt cho người lớn tuổi..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-gray-700">
                  Gemini API Key (Tuỳ chọn — để trống sẽ dùng bộ tổng hợp AI nội bộ):
                </label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="AIzaSy... (Tự động lưu cho các lần sau)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" checked={aiMindmap} onChange={(e) => setAiMindmap(e.target.checked)} />
                <span>🧠 Tự động vẽ Sơ đồ tư duy (Mindmap)</span>
              </label>
              <label className="flex items-center gap-1.5 font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" checked={aiCover} onChange={(e) => setAiCover(e.target.checked)} />
                <span>🖼️ Tự tạo Ảnh đại diện AI theo ngữ cảnh</span>
              </label>
              <label className="flex items-center gap-1.5 font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" checked={aiProducts} onChange={(e) => setAiProducts(e.target.checked)} />
                <span>🛍️ Tự động khớp &amp; chèn Block Sản phẩm phù hợp</span>
              </label>
              <label className="flex items-center gap-1.5 font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" checked={aiRefs} onChange={(e) => setAiRefs(e.target.checked)} />
                <span>📌 Chèn Khung Video &amp; Link tham khảo cuối bài</span>
              </label>
            </div>
          </div>
        )}
      </div>
      )}

      {/* GOOGLE DOCS WORKSPACE CONTAINER */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-300 bg-gray-100 shadow-sm">
        {/* Top Bar: Document Mode + Stats + Fullscreen */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-sm">
              📝
            </span>
            <div>
              <div className="text-xs font-bold text-gray-800">
                {isProductMode ? "Trình soạn thảo Mô tả Sản phẩm" : "Google Docs Article Studio"}
              </div>
              <div className="text-[11px] text-gray-400">
                {stats.words} từ · {stats.chars} ký tự · ~{stats.readMins} phút đọc
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode("visual")}
                className={`rounded-md px-2.5 py-1 font-semibold ${
                  mode === "visual" ? "bg-white text-brand shadow-sm" : "text-gray-600 hover:text-brand"
                }`}
              >
                📄 Trang giấy (Visual)
              </button>
              <button
                type="button"
                onClick={() => setMode("split")}
                className={`rounded-md px-2.5 py-1 font-semibold ${
                  mode === "split" ? "bg-white text-brand shadow-sm" : "text-gray-600 hover:text-brand"
                }`}
              >
                ◫ Song song
              </button>
              <button
                type="button"
                onClick={() => setMode("html")}
                className={`rounded-md px-2.5 py-1 font-semibold ${
                  mode === "html" ? "bg-white text-brand shadow-sm" : "text-gray-600 hover:text-brand"
                }`}
              >
                &lt;/&gt; Mã HTML
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFullscreen((f) => !f)}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:border-brand hover:text-brand"
            >
              {fullscreen ? "✕ Thu nhỏ" : "⛶ Toàn màn hình"}
            </button>
          </div>
        </div>

        {/* Hidden file input always mounted so both basic & advanced image buttons work */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadImage(f);
            e.target.value = "";
          }}
        />

        {/* Ribbon Row 1: Essential Formatting Tools (+ Advanced tools when expanded) */}
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-[#edf2fa] px-3 py-1.5">
          <button type="button" onClick={() => execCmd("undo")} className={tbtn} title="Hoàn tác (Ctrl+Z)">
            ↶
          </button>
          <button type="button" onClick={() => execCmd("redo")} className={tbtn} title="Làm lại (Ctrl+Y)">
            ↷
          </button>
          <button type="button" onClick={() => execCmd("removeFormat")} className={tbtn} title="Xoá định dạng">
            🧹
          </button>

          <span className="mx-1 h-4 w-px bg-gray-300" />

          {/* Heading / Block style */}
          <select
            onChange={(e) => {
              if (e.target.value) execCmd("formatBlock", e.target.value);
              e.target.value = "";
            }}
            defaultValue=""
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 outline-none"
          >
            <option value="" disabled>
              Kiểu đoạn văn...
            </option>
            <option value="P">Văn bản thường</option>
            {!isProductMode && <option value="H1">Tiêu đề 1 (H1)</option>}
            <option value="H2">Tiêu đề mục (H2)</option>
            <option value="H3">Tiêu đề nhỏ (H3)</option>
            <option value="BLOCKQUOTE">Trích dẫn (Quote)</option>
          </select>

          {/* Font size (Advanced) */}
          {showAdvancedTools && (
            <select
              onChange={(e) => {
                if (e.target.value) execCmd("fontSize", e.target.value);
                e.target.value = "";
              }}
              defaultValue=""
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 outline-none"
            >
              <option value="" disabled>
                Cỡ chữ...
              </option>
              <option value="2">Nhỏ</option>
              <option value="3">Bình thường</option>
              <option value="4">Lớn vừa</option>
              <option value="5">Lớn</option>
              <option value="6">Rất lớn</option>
            </select>
          )}

          <span className="mx-1 h-4 w-px bg-gray-300" />

          <button type="button" onClick={() => execCmd("bold")} className={`${tbtn} font-bold`} title="In đậm (Ctrl+B)">
            B
          </button>
          <button type="button" onClick={() => execCmd("italic")} className={`${tbtn} italic`} title="In nghiêng (Ctrl+I)">
            I
          </button>
          {showAdvancedTools && (
            <>
              <button type="button" onClick={() => execCmd("underline")} className={`${tbtn} underline`} title="Gạch chân (Ctrl+U)">
                U
              </button>
              <button type="button" onClick={() => execCmd("strikeThrough")} className={`${tbtn} line-through`} title="Gạch ngang">
                S
              </button>

              {/* Google Docs Style Text Color (A + indicator bar) & Highlight Color (Marker + indicator bar) */}
              <div className="relative inline-flex items-center gap-0.5">
                {/* Text Color Button */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleColorPopover("text")}
                  className="inline-flex flex-col items-center justify-center rounded border border-transparent px-2 py-0.5 hover:border-gray-300 hover:bg-white transition cursor-pointer"
                  title="Màu chữ (Text Color)"
                >
                  <span className="text-[13px] font-extrabold leading-none text-gray-800">A</span>
                  <span
                    className="mt-0.5 h-[3px] w-4 rounded-full"
                    style={{ backgroundColor: textColor }}
                  />
                </button>

                {/* Highlight / Fill Color Button */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleColorPopover("highlight")}
                  className="inline-flex flex-col items-center justify-center rounded border border-transparent px-2 py-0.5 hover:border-gray-300 hover:bg-white transition cursor-pointer"
                  title="Màu nền chữ (Highlight Color)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 text-gray-800"
                  >
                    <path d="m9 11-6 6v3h9l3-3" />
                    <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
                  </svg>
                  <span
                    className="mt-0.5 h-[3px] w-4 rounded-full border border-gray-300/60"
                    style={{ backgroundColor: highlightColor }}
                  />
                </button>

                {/* Color Swatch Grid Popover */}
                {colorPopover && (
                  <EditorColorPopover
                    kind={colorPopover}
                    currentTextColor={textColor}
                    currentHighlightColor={highlightColor}
                    onApply={(c) => applyColor(colorPopover, c)}
                    onClose={() => setColorPopover(null)}
                  />
                )}
              </div>

              <span className="mx-1 h-4 w-px bg-gray-300" />

              {/* Alignment */}
              <button type="button" onClick={() => execCmd("justifyLeft")} className={tbtn} title="Căn trái">
                ⬅
              </button>
              <button type="button" onClick={() => execCmd("justifyCenter")} className={tbtn} title="Căn giữa">
                ⬌
              </button>
              <button type="button" onClick={() => execCmd("justifyRight")} className={tbtn} title="Căn phải">
                ➡
              </button>
              <button type="button" onClick={() => execCmd("justifyFull")} className={tbtn} title="Căn đều 2 bên">
                ☰
              </button>
            </>
          )}

          <span className="mx-1 h-4 w-px bg-gray-300" />

          {/* Lists */}
          <button type="button" onClick={() => execCmd("insertUnorderedList")} className={tbtn} title="Danh sách chấm">
            • Danh sách
          </button>
          <button type="button" onClick={() => execCmd("insertOrderedList")} className={tbtn} title="Danh sách số">
            1. Đánh số
          </button>

          {showAdvancedTools && (
            <>
              <button type="button" onClick={() => execCmd("outdent")} className={tbtn} title="Giảm thụt lề">
                ⇤
              </button>
              <button type="button" onClick={() => execCmd("indent")} className={tbtn} title="Tăng thụt lề">
                ⇥
              </button>

              <span className="mx-1 h-4 w-px bg-gray-300" />

              {/* Voice-to-Text Dictation (vi-VN) */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleVoiceDictation}
                title="Đặt con trỏ vào vị trí cần nhập rồi bấm để đọc thành văn bản tiếng Việt"
                className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  voiceListening
                    ? "animate-pulse border-red-400 bg-red-600 text-white shadow-xs"
                    : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white"
                }`}
              >
                <span>{voiceListening ? "🔴" : "🎤"}</span>
                <span>{voiceListening ? "Đang nghe... (Dừng)" : "Nhập giọng nói"}</span>
              </button>
            </>
          )}

          {isProductMode && (
            <>
              <span className="mx-1 h-4 w-px bg-gray-300" />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-brand hover:text-brand"
              >
                {busy ? "Đang tải..." : "🖼️ Chèn ảnh"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const u = prompt("Nhập đường dẫn liên kết (URL):", "https://");
                  if (u) execCmd("createLink", u);
                }}
                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-brand hover:text-brand"
              >
                🔗 Liên kết
              </button>
              <button
                type="button"
                onClick={() => setShowAdvancedTools((v) => !v)}
                className={`ml-auto rounded-lg border px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  showAdvancedTools
                    ? "border-brand bg-brand text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-brand hover:text-brand"
                }`}
              >
                {showAdvancedTools ? "− Ẩn công cụ nâng cao" : "+ Công cụ nâng cao"}
              </button>
            </>
          )}
        </div>

        {/* Ribbon Row 2: Rich Media Inserts + Shoppable Product & Combo Blocks */}
        {showAdvancedTools && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-brand hover:bg-green-50 hover:text-brand"
            >
              {busy ? "Đang tải..." : "🖼️ Chèn ảnh"}
            </button>
            <select
              value={imgWidthPct}
              onChange={(e) => setImgWidthPct(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 outline-none"
              title="Kích thước ảnh khi chèn vào bài viết"
            >
              <option value={100}>Cỡ ảnh: 100%</option>
              <option value={80}>Cỡ ảnh: 80%</option>
              <option value={60}>Cỡ ảnh: 60%</option>
              <option value={50}>Cỡ ảnh: 50%</option>
            </select>

            <button
              type="button"
              onClick={() => {
                const u = prompt("Dán link video YouTube cần chèn vào bài viết:");
                if (!u) return;
                const vid = extractYtId(u);
                if (!vid) return alert("Link YouTube không hợp lệ.");
                insertHtmlSnippet(
                  `<div style="margin:16px 0;border-radius:12px;overflow:hidden;"><iframe src="https://www.youtube.com/embed/${vid}" style="width:100%;aspect-ratio:16/9;border:0;" allowfullscreen></iframe></div><p></p>`,
                );
              }}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-brand hover:bg-green-50 hover:text-brand"
            >
              🎬 Video YouTube
            </button>

            <button
              type="button"
              onClick={() =>
                insertHtmlSnippet(
                  `<blockquote><p>💡 <strong>Lời khuyên Thực dưỡng:</strong> Nhai kỹ mỗi miếng ăn từ 50 – 100 lần giúp tiết kiệm enzyme tiêu hóa và kích hoạt khả năng tự chữa lành tự nhiên.</p></blockquote><p></p>`,
                )
              }
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-brand hover:bg-green-50 hover:text-brand"
            >
              💡 Hộp Lưu ý
            </button>

            <button
              type="button"
              onClick={() =>
                insertHtmlSnippet(
                  `<table><thead><tr><th>Thực phẩm Quân bình / Dương</th><th>Thực phẩm Âm (Cần hạn chế)</th></tr></thead><tbody><tr><td>Gạo lứt, đậu đỏ Azuki, tương Tamari, Miso, mơ muối lâu năm</td><td>Đường tinh luyện, nước ngọt có ga, thực phẩm đóng hộp</td></tr></tbody></table><p></p>`,
                )
              }
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-brand hover:bg-green-50 hover:text-brand"
            >
              📊 Bảng so sánh
            </button>

            <button
              type="button"
              onClick={() => {
                const url = prompt("Nhập đường dẫn liên kết (URL):", "https://");
                if (url) execCmd("createLink", url);
              }}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-brand hover:bg-green-50 hover:text-brand"
            >
              🔗 Liên kết
            </button>

            <button
              type="button"
              onClick={() => execCmd("insertHorizontalRule")}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-brand hover:bg-green-50 hover:text-brand"
            >
              ➖ Kẻ ngang
            </button>
          </div>

          {/* Shoppable Product & Reusable Block Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBlockModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-brand bg-green-50 px-3 py-1.5 text-xs font-bold text-brand shadow-xs transition hover:bg-brand hover:text-white cursor-pointer"
            >
              🧩 + Chèn Block Thường Dùng ({reusableBlocks.length})
            </button>
            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs transition hover:bg-emerald-700 hover:text-white cursor-pointer"
            >
              📱 + Chèn QR Code ({qrBlocks.length})
            </button>
            <button
              type="button"
              onClick={() => {
                insertHtmlSnippet(
                  `<div data-social-block="" style="border:2px dashed #0284c7;background:#f0f9ff;border-radius:12px;padding:12px;margin:14px 0;font-size:13px;color:#0c4a6e;">🌐 <strong>Block Liên kết MXH &amp; Sàn TMĐT</strong> <code>[[social]]</code></div><p></p>`,
                );
                setStatusMsg("✓ Đã chèn Block Liên kết MXH & Sàn [[social]] vào nội dung!");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-sky-600 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 shadow-xs transition hover:bg-sky-700 hover:text-white cursor-pointer"
            >
              🌐 + Chèn MXH &amp; Sàn
            </button>
            {products.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setProdQuery("");
                    setPickerModal("single");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-dark"
                >
                  🛍️ + Chèn Block 1 Sản phẩm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProdQuery("");
                    setPickerModal("combo");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
                >
                  🎁 + Chèn Block Gói / Set ({comboIds.length})
                </button>
              </>
            )}
          </div>
        </div>
        )}

        {/* In Product mode, place the 1-click AI Rewrite bar right above the paper so it's immediately accessible */}
        {isProductMode && (enableProductAiRewrite || name === "description") && (
          <div className="border-b border-indigo-100 bg-indigo-50/30 px-4 py-3">
            <ProductDescriptionAiPanel
              targetName={name}
              sourceUrl={sourceUrl}
            />
          </div>
        )}

        {/* Live Voice Dictation Interim Bar */}
        {voiceListening && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 bg-red-50/80 px-4 py-2 text-xs text-red-900">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block h-2.5 w-2.5 shrink-0 animate-ping rounded-full bg-red-600" />
              <span className="font-bold shrink-0">🎙️ Đang nghe (Tiếng Việt):</span>
              <span className="italic text-red-700 truncate">
                {voiceInterim ? `"${voiceInterim}"` : "Hãy đọc nội dung, văn bản sẽ tự chèn tại vị trí con trỏ..."}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleVoiceDictation}
              className="rounded bg-red-600 px-2.5 py-0.5 font-bold text-white hover:bg-red-700 cursor-pointer"
            >
              Dừng Micro
            </button>
          </div>
        )}

        {/* Inline AI Selection Rewrite Bar */}
        {selectedText && (
          <div className="border-b border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 px-4 py-2 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="rounded bg-indigo-100 px-2 py-0.5 font-bold text-indigo-800">
                  ✨ Đang tô chọn {selectedText.length} ký tự
                </span>
                <span className="truncate italic text-gray-600 max-w-md">“{selectedText}”</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSelAiOpen((o) => !o)}
                  className="rounded-lg bg-indigo-600 px-3 py-1 font-bold text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
                >
                  {selAiOpen ? "▲ Đóng AI Viết lại" : "✨ Viết lại đoạn này bằng AI"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedText("");
                    setSelAiOpen(false);
                    setSelPreviewHtml("");
                  }}
                  className="rounded px-2 py-1 text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            {selAiOpen && (
              <div className="rounded-xl border border-indigo-200 bg-white p-3.5 shadow-sm space-y-3 text-xs">
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">Chọn văn phong mới:</label>
                    <select
                      value={selTone}
                      onChange={(e) => setSelTone(e.target.value)}
                      className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
                    >
                      <option value="chuyen_gia_thuc_duong">🌿 Chuyên gia Thực dưỡng (Ấm áp, quân bình)</option>
                      <option value="y_khoa_khoa_hoc">🩺 Y khoa Hiện đại (Khoa học, chuẩn mực)</option>
                      <option value="ban_hang_thuyet_phuc">🛍️ Bán hàng Chuyên nghiệp (Thu hút, chuyển đổi)</option>
                      <option value="suc_tich_de_hieu">⚡ Súc tích, Dễ hiểu (Ngắn gọn, gạch đầu dòng)</option>
                      <option value="ke_chuyen_gan_gui">💬 Kể chuyện Gần gũi (Đồng cảm, truyền cảm hứng)</option>
                      <option value="custom">✍️ Tuỳ chỉnh tự do theo chỉ dẫn</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">Tuỳ chỉnh thêm cho AI (tuỳ chọn):</label>
                    <input
                      value={selCustomPrompt}
                      onChange={(e) => setSelCustomPrompt(e.target.value)}
                      placeholder="VD: Viết ngắn hơn 30%, thêm nhấn mạnh công dụng..."
                      className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">🔑 Gemini API Key (AIza...):</label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="Để trống nếu đã lưu trên server"
                      className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-emerald-800">
                    Đoạn văn bản viết mới (AI tạo ra hoặc bạn tự chỉnh sửa trực tiếp):
                  </label>
                  <textarea
                    rows={4}
                    value={selPreviewHtml || selectedText}
                    onChange={(e) => setSelPreviewHtml(e.target.value)}
                    className="w-full rounded-lg border border-emerald-200 bg-emerald-50/30 p-2.5 text-xs leading-relaxed focus:border-brand focus:outline-none"
                    placeholder="Bấm 'Tạo bản viết lại bằng AI' hoặc nhập trực tiếp nội dung mới..."
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={selBusy}
                    onClick={runSelectionAiRewrite}
                    className="rounded-lg bg-brand px-4 py-1.5 font-bold text-white hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
                  >
                    {selBusy ? "⏳ AI đang viết lại..." : "⚡ Tạo bản viết lại bằng AI"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selPreviewHtml) setSelPreviewHtml(`<p>${selectedText}</p>`);
                      setTimeout(() => applySelectionRewrite("replace"), 0);
                    }}
                    className="rounded-lg bg-emerald-600 px-3.5 py-1.5 font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                  >
                    ✓ Thay thế đoạn cũ bằng đoạn văn bản viết mới
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selPreviewHtml) setSelPreviewHtml(`<p>${selectedText}</p>`);
                      setTimeout(() => applySelectionRewrite("append"), 0);
                    }}
                    className="rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    ➕ Chèn bên dưới đoạn cũ
                  </button>
                </div>

                {selPreviewHtml && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                    <div className="mb-1 text-[10px] font-bold uppercase text-emerald-700">Xem trước hiển thị HTML:</div>
                    <div className="prose-content max-w-none text-xs" dangerouslySetInnerHTML={{ __html: selPreviewHtml }} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Document Canvas (Google Docs Paper Sheet Style + Block Drag-Drop & Align) */}
        <div className={mode === "split" ? "grid divide-x md:grid-cols-2" : ""}>
          {(mode === "visual" || mode === "split") && (
            <div className="relative bg-[#f8f9fa] p-4 md:p-6">
              {/* Floating Block Controls (Drag-and-Drop, Move Up/Down, Left/Center/Right/Float, Width, Delete) */}
              {activeBlockIdx !== null && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  style={{ top: `${Math.max(8, activeBlockTop)}px` }}
                  className="sticky z-20 mx-auto mb-2 flex max-w-3xl flex-wrap items-center justify-between gap-1.5 rounded-xl border border-emerald-300 bg-white/95 px-2.5 py-1.5 text-[11px] shadow-md backdrop-blur-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      draggable
                      onDragStart={(e) => {
                        setDragBlockIdx(activeBlockIdx);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(activeBlockIdx));
                      }}
                      onDragEnd={() => {
                        setDragBlockIdx(null);
                        setDropTargetIdx(null);
                      }}
                      title="Giữ và kéo thả khối này lên hoặc xuống vị trí khác"
                      className="cursor-grab active:cursor-grabbing rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-900 select-none"
                    >
                      ⋮⋮ Kéo thả · {activeBlockLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveBlock(activeBlockIdx, activeBlockIdx - 1)}
                      title="Di chuyển khối lên trên"
                      className="rounded border px-1.5 py-0.5 font-bold hover:bg-gray-100 cursor-pointer"
                    >
                      ⬆️
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(activeBlockIdx, activeBlockIdx + 1)}
                      title="Di chuyển khối xuống dưới"
                      className="rounded border px-1.5 py-0.5 font-bold hover:bg-gray-100 cursor-pointer"
                    >
                      ⬇️
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {activeBlockLabel.includes("Hình ảnh") && (
                      <button
                        type="button"
                        onClick={() => {
                          const blockEl = visualRef.current?.children[activeBlockIdx] as HTMLElement | undefined;
                          const imgEl = blockEl?.querySelector("img");
                          if (imgEl) {
                            setAiImgTarget({ el: imgEl, url: imgEl.getAttribute("src") || imgEl.src });
                          }
                        }}
                        title="Dùng Gemini AI tạo lại ảnh mới từ ảnh gốc"
                        className="rounded border border-indigo-300 bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white cursor-pointer"
                      >
                        🎨 AI Tạo lại ảnh
                      </button>
                    )}
                    <button type="button" onClick={() => styleActiveBlock("left")} title="Đưa sang trái" className="rounded border px-1.5 py-0.5 hover:bg-gray-100 cursor-pointer">⬅</button>
                    <button type="button" onClick={() => styleActiveBlock("center")} title="Căn giữa" className="rounded border px-1.5 py-0.5 hover:bg-gray-100 cursor-pointer">⬌</button>
                    <button type="button" onClick={() => styleActiveBlock("right")} title="Đưa sang phải" className="rounded border px-1.5 py-0.5 hover:bg-gray-100 cursor-pointer">➡</button>
                    <button type="button" onClick={() => styleActiveBlock("float-left")} title="Đặt bên trái (chữ ôm bên phải)" className="rounded border px-1.5 py-0.5 hover:bg-emerald-50 cursor-pointer">◧ Trôi trái</button>
                    <button type="button" onClick={() => styleActiveBlock("float-right")} title="Đặt bên phải (chữ ôm bên trái)" className="rounded border px-1.5 py-0.5 hover:bg-emerald-50 cursor-pointer">◨ Trôi phải</button>
                    <button type="button" onClick={() => styleActiveBlock("w-50")} title="Rộng 50%" className="rounded border px-1.5 py-0.5 hover:bg-gray-100 cursor-pointer">50%</button>
                    <button type="button" onClick={() => styleActiveBlock("w-75")} title="Rộng 75%" className="rounded border px-1.5 py-0.5 hover:bg-gray-100 cursor-pointer">75%</button>
                    <button type="button" onClick={() => styleActiveBlock("w-100")} title="Đầy khung 100%" className="rounded border px-1.5 py-0.5 hover:bg-gray-100 cursor-pointer">100%</button>
                    <button type="button" onClick={() => styleActiveBlock("delete")} title="Xoá khối này" className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-red-600 hover:bg-red-100 cursor-pointer">🗑️</button>
                  </div>
                </div>
              )}

              <div
                ref={visualRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncFromVisual}
                onBlur={syncFromVisual}
                onMouseMove={(e) => {
                  if (dragBlockIdx === null) updateActiveBlockFromTarget(e.target);
                }}
                onClick={(e) => {
                  updateActiveBlockFromTarget(e.target);
                  if (e.target instanceof HTMLImageElement) {
                    const src = e.target.getAttribute("src") || e.target.src;
                    if (src) setAiImgTarget({ el: e.target, url: src });
                  }
                }}
                onMouseUp={handleVisualSelectionCheck}
                onKeyUp={handleVisualSelectionCheck}
                onDragOver={(e) => {
                  if (dragBlockIdx === null) return;
                  e.preventDefault();
                  const info = findTopLevelBlock(e.target instanceof Node ? e.target : null);
                  if (info) setDropTargetIdx(info.idx);
                }}
                onDrop={(e) => {
                  if (dragBlockIdx === null) return;
                  e.preventDefault();
                  const info = findTopLevelBlock(e.target instanceof Node ? e.target : null);
                  const targetIdx = info ? info.idx : dropTargetIdx;
                  if (targetIdx !== null && targetIdx !== dragBlockIdx) {
                    moveBlock(dragBlockIdx, targetIdx);
                  }
                  setDragBlockIdx(null);
                  setDropTargetIdx(null);
                }}
                className="prose-content mx-auto min-h-[480px] max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm outline-none focus:ring-2 focus:ring-brand/20 md:p-10"
              />
            </div>
          )}

          {(mode === "html" || mode === "split") && (
            <div className="bg-gray-900 p-4 text-gray-100">
              <textarea
                ref={htmlTextareaRef}
                rows={22}
                value={html}
                onChange={(e) => {
                  setHtml(e.target.value);
                  // nosemgrep: typescript.react.security.audit.react-unsanitized-property.react-unsanitized-property
                  if (visualRef.current) visualRef.current.innerHTML = sanitizeHtml(e.target.value);
                }}
                className="w-full bg-transparent font-mono text-xs leading-relaxed text-green-300 outline-none"
                placeholder="Mã HTML của bài viết..."
              />
            </div>
          )}
        </div>

        {!isProductMode && (enableProductAiRewrite || name === "description") && (
          <div className="border-t border-indigo-100 bg-indigo-50/20 px-4 py-3">
            <ProductDescriptionAiPanel
              targetName={name}
              sourceUrl={sourceUrl}
            />
          </div>
        )}

        {(statusMsg || err) && (
          <div
            className={`border-t px-4 py-2 text-xs font-medium ${
              err ? "bg-red-50 text-red-700" : "bg-green-50 text-brand"
            }`}
          >
            {err || statusMsg}
          </div>
        )}
      </div>

      {/* ATTACHED PRODUCT SET / COMBO PANEL FOR THIS POST (Blog / Post mode only) */}
      {!isProductMode && products.length > 0 && (
        <div className="rounded-2xl border border-green-200 bg-green-50/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-brand">
                🎁 Gói / Set Sản phẩm Thực dưỡng gắn kèm cuối bài viết ({selectedComboProducts.length} sản phẩm)
              </h3>
              <p className="text-xs text-gray-600">
                Các sản phẩm trong Set này sẽ hiển thị thành khối <strong>&quot;Mua trọn gói theo bài viết (1 chạm thêm cả Set vào giỏ)&quot;</strong> ở ngoài trang đọc bài viết.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setProdQuery("");
                setPickerModal("combo");
              }}
              className="rounded-xl border border-brand bg-white px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-white transition"
            >
              ⚙️ Chọn / Thay đổi Sản phẩm trong Set
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Tiêu đề Gói / Set sản phẩm:</label>
            <input
              value={comboTitle}
              onChange={(e) => setComboTitle(e.target.value)}
              placeholder="VD: Combo Trợ Phương Tiêu Hóa Khuyên Dùng Trong Bài Viết"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          {selectedComboProducts.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-3">
              {selectedComboProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl border bg-white p-2.5 shadow-xs"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-gray-800">{p.name}</div>
                    <div className="text-xs font-semibold text-accent">
                      {vnd(p.sale_price ?? p.price)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleComboProduct(p.id)}
                    className="shrink-0 rounded bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                    title="Gỡ khỏi Set"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-gray-500">
              Chưa chọn sản phẩm nào cho Set (hệ thống sẽ tự động gợi ý 3 sản phẩm nổi bật nếu để trống).
            </p>
          )}
        </div>
      )}

      {/* MODAL: PICK SINGLE PRODUCT OR COMBO SET */}
      {pickerModal && (
        <div
          onClick={() => setPickerModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b bg-brand px-5 py-3.5 text-white">
              <div>
                <h3 className="text-base font-bold">
                  {pickerModal === "single"
                    ? "🛍️ Chọn Sản phẩm để chèn Block Mua hàng vào giữa bài viết"
                    : "🎁 Thiết lập Gói / Set Sản phẩm liên quan đến bài viết"}
                </h3>
                <p className="text-xs text-green-100">
                  {pickerModal === "single"
                    ? "Bấm 'Chèn vào bài' ở sản phẩm bất kỳ để đặt thẻ mua hàng ngay tại vị trí con trỏ."
                    : "Đánh dấu chọn từ 2 – 4 sản phẩm kết hợp thành một Set/Combo cho người đọc."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerModal(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-sm font-bold text-white hover:bg-white/30"
              >
                ✕
              </button>
            </div>

            <div className="border-b bg-gray-50 p-3">
              <input
                value={prodQuery}
                onChange={(e) => setProdQuery(e.target.value)}
                placeholder="Tìm sản phẩm theo tên, mã SKU (VD: PT-037), thương hiệu, danh mục..."
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand"
                autoFocus
              />
            </div>

            <div className="flex-1 divide-y overflow-y-auto p-3">
              {filteredProducts.map((p) => {
                const isSelected = comboIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-3 rounded-xl p-2.5 transition ${
                      pickerModal === "combo" && isSelected ? "bg-green-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" className="h-12 w-12 shrink-0 rounded-lg border object-cover" />
                      ) : (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-green-100 text-xs font-bold text-brand">
                          SP
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-gray-900">{p.name}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {p.sku && <span className="font-mono">#{p.sku}</span>}
                          {p.brand && <span>· {p.brand}</span>}
                          {p.unit && <span>· {p.unit}</span>}
                          <span className="font-bold text-accent">{vnd(p.sale_price ?? p.price)}</span>
                        </div>
                      </div>
                    </div>

                    {pickerModal === "single" ? (
                      <button
                        type="button"
                        onClick={() => insertSingleProductBlock(p)}
                        className="shrink-0 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-dark"
                      >
                        + Chèn vào bài
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleComboProduct(p.id)}
                        className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                          isSelected
                            ? "bg-brand text-white"
                            : "border border-gray-300 bg-white text-gray-700 hover:border-brand hover:text-brand"
                        }`}
                      >
                        {isSelected ? "✓ Đã chọn vào Set" : "+ Chọn vào Set"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {pickerModal === "combo" && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-gray-50 px-5 py-3.5">
                <div className="text-xs text-gray-600">
                  Đã chọn <strong>{comboIds.length}</strong> sản phẩm trong Set.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickerModal(null)}
                    className="rounded-xl border border-brand bg-white px-4 py-2 text-xs font-bold text-brand hover:bg-green-50"
                  >
                    ✓ Chỉ lưu Set cuối bài
                  </button>
                  <button
                    type="button"
                    onClick={insertComboBlockToContent}
                    className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow hover:opacity-90"
                  >
                    🎁 Chèn luôn Block Set này vào giữa bài viết
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: PICK REUSABLE CONTENT BLOCK (SYNCED OR UNSYNCED / BLOCK-IN-BLOCK) */}
      {blockModalOpen && (
        <div
          onClick={() => setBlockModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b bg-brand px-5 py-3.5 text-white">
              <div>
                <h3 className="text-base font-bold">🧩 Chọn Block Thường Dùng để chèn vào nội dung</h3>
                <p className="text-xs text-green-100">
                  Hỗ trợ chèn Block Đồng Bộ <code>[[block:slug]]</code> (tự cập nhật khi sửa Block gốc, hỗ trợ lồng Block trong Block) hoặc chèn Bản Sao HTML độc lập.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBlockModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-sm font-bold text-white hover:bg-white/30"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 divide-y overflow-y-auto p-4">
              {reusableBlocks.map((b) => (
                <div key={b.id} className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">{b.title}</span>
                      <code className="rounded bg-green-100 px-2 py-0.5 font-mono text-[11px] font-bold text-brand">
                        [[block:{b.slug}]]
                      </code>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Vị trí tự động: <strong>{b.positions}</strong> · Kiểu khung: <strong>{b.style_variant}</strong>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        insertHtmlSnippet(
                          `<div data-reusable-block="${b.slug}" style="border:2px dashed #2f7d32;background:#f0fdf4;border-radius:12px;padding:12px;margin:14px 0;font-size:13px;color:#14532d;">🧩 <strong>Block Đồng Bộ:</strong> ${b.title} <code>[[block:${b.slug}]]</code></div><p></p>`,
                        );
                        setBlockModalOpen(false);
                        setStatusMsg(`✓ Đã chèn Block đồng bộ [[block:${b.slug}]] vào bài!`);
                      }}
                      className="rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-dark"
                    >
                      🔄 Chèn Đồng Bộ [[block:{b.slug}]]
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        insertHtmlSnippet(`<div style="margin:14px 0;">${b.content_html}</div><p></p>`);
                        setBlockModalOpen(false);
                        setStatusMsg(`✓ Đã chèn bản sao nội dung Block "${b.title}" vào bài!`);
                      }}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-brand hover:text-brand"
                    >
                      📋 Chèn Bản Sao HTML
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* MODAL: PICK DYNAMIC QR_BLOCK */}
      {qrModalOpen && (
        <div
          onClick={() => setQrModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b bg-emerald-800 px-5 py-3.5 text-white">
              <div>
                <h3 className="text-base font-bold">📱 Chọn Mã QR Động (QR_Block) để chèn vào nội dung</h3>
                <p className="text-xs text-emerald-100">
                  Khi bạn đổi link đích của mã QR trong Quản trị QR, mọi bài viết/sản phẩm/block đang nhúng <code>[[qr:slug]]</code> sẽ tự động chuyển hướng theo link mới.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-sm font-bold text-white hover:bg-white/30 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 divide-y overflow-y-auto p-4">
              {qrBlocks.map((q) => (
                <div key={q.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/qr/${encodeURIComponent(q.slug)}`}
                      alt={q.name}
                      className="h-14 w-14 shrink-0 rounded-lg border p-1"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{q.name}</span>
                        <code className="rounded bg-green-100 px-2 py-0.5 font-mono text-[11px] font-bold text-brand">
                          [[qr:{q.slug}]]
                        </code>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-500">
                        Đích: <strong>{q.target_url}</strong> · {q.scans} lượt quét
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        insertHtmlSnippet(
                          `<div data-qr-block="${q.slug}" style="border:2px dashed #15803d;background:#f0fdf4;border-radius:12px;padding:12px;margin:14px 0;font-size:13px;color:#14532d;">📱 <strong>QR_Block Đồng Bộ:</strong> ${q.name} <code>[[qr:${q.slug}]]</code></div><p></p>`,
                        );
                        setQrModalOpen(false);
                        setStatusMsg(`✓ Đã chèn QR_Block [[qr:${q.slug}]] vào nội dung!`);
                      }}
                      className="rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-dark cursor-pointer"
                    >
                      📱 Chèn Đồng Bộ [[qr:{q.slug}]]
                    </button>
                  </div>
                </div>
              ))}
              {qrBlocks.length === 0 && (
                <p className="p-6 text-center text-xs text-gray-500">
                  Chưa có mã QR nào. Hãy vào mục <strong>QR Code Động</strong> ở menu bên trái để tạo mới.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gemini AI Image Regenerator Modal (Click any image in Post/Product/Block) */}
      <AiImageRegenerateModal
        open={Boolean(aiImgTarget)}
        originalUrl={aiImgTarget?.url ?? ""}
        contextTitle={
          ((visualRef.current?.closest("form")?.querySelector('[name="title"], [name="name"]') as HTMLInputElement | null)?.value) ||
          aiImgTarget?.el.alt ||
          ""
        }
        onClose={() => setAiImgTarget(null)}
        onApply={(newUrl, newName, syncedRows) => {
          if (aiImgTarget?.el) {
            aiImgTarget.el.setAttribute("src", newUrl);
            if (newName) aiImgTarget.el.setAttribute("alt", newName);
            syncFromVisual();
          }
          setStatusMsg(
            `✨ Đã tạo & thay thế ảnh mới bằng Gemini AI Image${syncedRows > 0 ? ` (đã đồng bộ ${syncedRows} vị trí trên trang)` : ""}!`,
          );
        }}
      />
      {/* Floating Voice-to-Text Dictation Button (bottom-right, follows scroll) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 print:hidden">
        {voiceListening && (
          <div className="max-w-xs rounded-2xl border border-red-200 bg-white/95 px-3.5 py-2.5 text-xs text-red-900 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2 font-bold text-red-600">
              <span className="inline-block h-2.5 w-2.5 animate-ping rounded-full bg-red-600" />
              <span>Đang nghe (Tiếng Việt)...</span>
            </div>
            <p className="mt-1 line-clamp-2 italic text-gray-700">
              {voiceInterim ? `"${voiceInterim}"` : "Hãy đọc nội dung, chữ sẽ tự chèn vào vị trí con trỏ..."}
            </p>
          </div>
        )}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleVoiceDictation}
          title="Đặt con trỏ vào vị trí cần nhập rồi bấm để đọc thành văn bản tiếng Việt"
          className={`flex cursor-pointer items-center gap-2.5 rounded-full px-5 py-3.5 text-sm font-extrabold text-white shadow-2xl transition-all duration-200 ${
            voiceListening
              ? "animate-pulse bg-gradient-to-r from-red-600 to-rose-600 ring-4 ring-red-300/80 hover:scale-105"
              : "bg-gradient-to-r from-emerald-600 to-green-600 ring-4 ring-emerald-200/80 hover:scale-105 hover:from-emerald-500 hover:to-green-500"
          }`}
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-base">
            {voiceListening ? "⏹️" : "🎙️"}
          </span>
          <span>{voiceListening ? "Dừng Micro" : "Nhập giọng nói"}</span>
        </button>
      </div>
    </div>
  );
}
