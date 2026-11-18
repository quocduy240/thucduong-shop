"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { vnd } from "@/lib/site";

export type DocumentEntry = {
  id: number;
  slug: string;
  title: string;
  folder_path: string;
  doc_type: "pdf" | "doc" | "ppt" | "book";
  access_mode: "free" | "survey" | "bundle" | "paid" | "affiliate";
  price: number;
  drive_url: string;
  drive_folder_url: string;
  affiliate_url: string;
  bundle_product_id: number | null;
  bundle_product_name: string | null;
  bundle_product_slug: string | null;
  bundle_category_slug: string | null;
  bundle_product_price: number | null;
  bundle_product_image: string | null;
  cover: string;
  author: string;
  pages: number;
  file_size: string;
  summary: string;
  highlights: string;
  review_html: string;
  task_prompt: string;
  downloads: number;
  sort: number;
  created_at: string;
};

type FolderNode = {
  root: string;
  count: number;
  children: { fullPath: string; subName: string; count: number }[];
};

const DOC_TYPE_META: Record<
  string,
  { label: string; short: string; icon: string; badge: string; coverBg: string }
> = {
  pdf: {
    label: "Tài liệu PDF",
    short: "PDF",
    icon: "📕",
    badge: "bg-red-100 text-red-700 border-red-200",
    coverBg: "from-red-700 to-rose-600",
  },
  doc: {
    label: "Văn bản Word / Docs",
    short: "DOCX",
    icon: "📘",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    coverBg: "from-blue-700 to-sky-600",
  },
  ppt: {
    label: "Bài trình chiếu Slide",
    short: "PPTX",
    icon: "📙",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    coverBg: "from-amber-600 to-orange-600",
  },
  book: {
    label: "Sách & Ấn phẩm",
    short: "SÁCH",
    icon: "📗",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    coverBg: "from-brand-dark to-brand",
  },
};

const ACCESS_META: Record<string, { label: string; icon: string; badge: string; btnText: string }> = {
  free: {
    label: "Tải miễn phí",
    icon: "🔓",
    badge: "bg-green-100 text-green-800",
    btnText: "⬇️ Tải miễn phí",
  },
  survey: {
    label: "Khảo sát / Nhiệm vụ",
    icon: "📝",
    badge: "bg-purple-100 text-purple-800",
    btnText: "📝 Hoàn thành khảo sát để tải",
  },
  bundle: {
    label: "Tặng phẩm kèm Sản phẩm",
    icon: "🎁",
    badge: "bg-teal-100 text-teal-800",
    btnText: "🎁 Nhận tặng phẩm",
  },
  paid: {
    label: "Ủng hộ / Trả phí",
    icon: "💎",
    badge: "bg-orange-100 text-orange-800",
    btnText: "💎 Mở khóa tải",
  },
  affiliate: {
    label: "Sách & Affiliate",
    icon: "🛒",
    badge: "bg-indigo-100 text-indigo-800",
    btnText: "🛒 Mua sách / Đọc thử",
  },
};

const UNLOCK_STORAGE_KEY = "td_unlocked_docs_v1";

function toDrivePreviewUrl(url: string): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return url;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  return null;
}

export default function DocumentLibrary({ documents }: { documents: DocumentEntry[] }) {
  const router = useRouter();
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [expandedRoots, setExpandedRoots] = useState<Record<string, boolean>>({});
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accessFilter, setAccessFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Active modals
  const [reviewDoc, setReviewDoc] = useState<DocumentEntry | null>(null);
  const [reviewTab, setReviewTab] = useState<"review" | "preview">("review");
  const [gateDoc, setGateDoc] = useState<DocumentEntry | null>(null);

  // Unlocked state & download counts
  const [unlockedIds, setUnlockedIds] = useState<number[]>([]);
  const [downloadCounts, setDownloadCounts] = useState<Record<number, number>>({});
  const [memberName, setMemberName] = useState<string>("");

  // Gate form states
  const [leadName, setLeadName] = useState("");
  const [leadContact, setLeadContact] = useState("");
  const [leadAnswer, setLeadAnswer] = useState("");
  const [taskChecked, setTaskChecked] = useState(false);
  const [orderCode, setOrderCode] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [gateError, setGateError] = useState("");
  const [gateSuccessUrl, setGateSuccessUrl] = useState("");
  const [cartMsg, setCartMsg] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(UNLOCK_STORAGE_KEY);
      if (raw) setUnlockedIds(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    fetch("/api/member/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.member) {
          setMemberName(d.member.name);
          setLeadName(d.member.name);
          setLeadContact(d.member.phone || d.member.email);
          // Automatically unlock all survey/paid documents for registered members
          setUnlockedIds((prev) =>
            Array.from(
              new Set([
                ...prev,
                ...documents
                  .filter((doc) => doc.access_mode === "survey" || doc.access_mode === "paid")
                  .map((doc) => doc.id),
              ]),
            ),
          );
        }
      })
      .catch(() => {});
  }, [documents]);

  // Build Google Drive Folder Tree
  const folderTree = useMemo<FolderNode[]>(() => {
    const map = new Map<string, Map<string, number>>();
    for (const d of documents) {
      const parts = (d.folder_path || "Thư mục chung").split("/").map((s) => s.trim()).filter(Boolean);
      const root = parts[0] || "Thư mục chung";
      const sub = parts.slice(1).join(" / ");
      if (!map.has(root)) map.set(root, new Map());
      const subMap = map.get(root)!;
      subMap.set(sub, (subMap.get(sub) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([root, subMap]) => {
      let count = 0;
      const children: { fullPath: string; subName: string; count: number }[] = [];
      for (const [sub, c] of subMap.entries()) {
        count += c;
        if (sub) {
          children.push({ fullPath: `${root} / ${sub}`, subName: sub, count: c });
        }
      }
      return { root, count, children };
    });
  }, [documents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((d) => {
      if (selectedFolder !== "all") {
        if (d.folder_path !== selectedFolder && !d.folder_path.startsWith(`${selectedFolder} /`)) {
          return false;
        }
      }
      if (typeFilter !== "all" && d.doc_type !== typeFilter) return false;
      if (accessFilter !== "all" && d.access_mode !== accessFilter) return false;
      if (
        q &&
        !d.title.toLowerCase().includes(q) &&
        !d.summary.toLowerCase().includes(q) &&
        !d.folder_path.toLowerCase().includes(q) &&
        !d.author.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [documents, selectedFolder, typeFilter, accessFilter, query]);

  function markUnlocked(docId: number) {
    setUnlockedIds((prev) => {
      const next = Array.from(new Set([...prev, docId]));
      try {
        localStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    setDownloadCounts((prev) => ({
      ...prev,
      [docId]: (prev[docId] ?? documents.find((x) => x.id === docId)?.downloads ?? 0) + 1,
    }));
  }

  function openGate(d: DocumentEntry) {
    setGateDoc(d);
    setGateError("");
    setCartMsg("");
    const already = d.access_mode === "free" || unlockedIds.includes(d.id);
    setGateSuccessUrl(already ? d.drive_url : "");
  }

  async function handleUnlockSubmit(mode: string) {
    if (!gateDoc) return;
    setGateBusy(true);
    setGateError("");
    try {
      const res = await fetch("/api/documents/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: gateDoc.id,
          mode,
          name: leadName,
          contact: leadContact,
          answer: leadAnswer,
          orderCode,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; downloadUrl?: string; error?: string };
      if (!res.ok || !data.ok) {
        setGateError(data.error ?? "Chưa thể mở khóa tài liệu.");
      } else {
        markUnlocked(gateDoc.id);
        setGateSuccessUrl(data.downloadUrl || gateDoc.drive_url);
      }
    } finally {
      setGateBusy(false);
    }
  }

  async function addBundleProductToCart(productId: number) {
    setGateBusy(true);
    try {
      const res = await fetch(`/api/v2/add-to-cart/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: 1 }),
      });
      if (res.ok) {
        setCartMsg("✓ Đã thêm sản phẩm kèm tặng phẩm vào giỏ hàng! Sau khi đặt hàng, bạn dùng Mã đơn hàng để tải tài liệu ngay.");
        router.refresh();
      }
    } finally {
      setGateBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-emerald-700 p-6 text-white shadow-md md:flex-row md:items-center">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-3xl backdrop-blur-sm shadow">
            📚
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
                Google Drive Cloud Library
              </span>
              <span className="text-xs text-green-100">
                PDF · Word/Docs · Slide Bài Giảng · Tủ Sách Thực Dưỡng
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              Thư viện Tài liệu, Bài trình chiếu &amp; Sách Thực dưỡng
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-green-50/90 md:text-sm">
              Khám phá kho tài liệu thực dưỡng được tổ chức theo <strong>cây thư mục Google Drive</strong>. Bạn có thể <strong>đọc bản Review &amp; Xem trước nội dung</strong> trước khi tải miễn phí, hoàn thành khảo sát mở khóa, hoặc nhận tặng phẩm khi mua sản phẩm tại Thực Dưỡng Phúc Thọ.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/thanh-vien/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-gray-900 shadow transition hover:bg-amber-300"
          >
            👑 {memberName ? `Thành viên: ${memberName}` : "Đăng ký Thành viên (Tải miễn phí & Nhận Voucher)"}
          </Link>
          <Link
            href="/thu-vien/bai-giang-thuc-duong/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            🎬 Xem Thư viện 318 Video
          </Link>
        </div>
      </div>

      {/* Main Layout: Left Google Drive Folder Tree + Right Document Explorer */}
      <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
        {/* Left Sidebar: Google Drive Folder Tree */}
        <aside className="space-y-4 h-fit">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between border-b pb-2.5">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                <span>🗂️</span>
                <span>Cây Thư Mục Google Drive</span>
              </div>
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-brand">
                {documents.length} file
              </span>
            </div>

            <ul className="space-y-1 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedFolder("all")}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                    selectedFolder === "all"
                      ? "bg-brand text-white shadow-sm"
                      : "text-gray-700 hover:bg-green-50 hover:text-brand"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>☁️</span>
                    <span>Toàn bộ Kho Tài Liệu Drive</span>
                  </span>
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px]">
                    {documents.length}
                  </span>
                </button>
              </li>

              {folderTree.map((node) => {
                const isRootActive = selectedFolder === node.root;
                const isOpen = expandedRoots[node.root] ?? true;
                return (
                  <li key={node.root} className="pt-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRoots((prev) => ({ ...prev, [node.root]: !isOpen }))
                        }
                        className="grid h-6 w-6 shrink-0 place-items-center rounded text-xs text-gray-400 hover:bg-gray-100"
                        title="Đóng/Mở thư mục"
                      >
                        {isOpen ? "▾" : "▸"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFolder(node.root)}
                        className={`flex flex-1 items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                          isRootActive
                            ? "bg-brand text-white shadow-sm"
                            : "text-gray-800 hover:bg-green-50 hover:text-brand"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{isOpen ? "📂" : "📁"}</span>
                          <span className="truncate">{node.root}</span>
                        </span>
                        <span className="ml-1 shrink-0 text-[11px] opacity-75">({node.count})</span>
                      </button>
                    </div>

                    {isOpen && node.children.length > 0 && (
                      <ul className="ml-5 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-2.5">
                        {node.children.map((sub) => {
                          const isSubActive = selectedFolder === sub.fullPath;
                          return (
                            <li key={sub.fullPath}>
                              <button
                                type="button"
                                onClick={() => setSelectedFolder(sub.fullPath)}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                                  isSubActive
                                    ? "bg-green-100 font-bold text-brand"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-brand"
                                }`}
                              >
                                <span className="truncate">📄 {sub.subName}</span>
                                <span className="ml-1 text-[10px] text-gray-400">{sub.count}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Guide Box on 4 Unlock Modes */}
          <div className="rounded-2xl border border-green-200 bg-green-50/50 p-4 text-xs text-gray-700 space-y-2">
            <div className="font-bold text-brand text-sm">💡 Hướng dẫn tải &amp; nhận tài liệu</div>
            <ul className="space-y-1.5">
              <li>
                <strong>🔓 Tải miễn phí:</strong> Bấm tải trực tiếp file PDF, Word, Slide từ Google Drive.
              </li>
              <li>
                <strong>📝 Khảo sát / Nhiệm vụ:</strong> Hoàn thành khảo sát sức khỏe 30 giây để mở khóa tài liệu chuyên sâu.
              </li>
              <li>
                <strong>🎁 Tặng phẩm kèm Sản phẩm:</strong> Đặt mua sản phẩm thực dưỡng liên kết hoặc nhập <strong>Mã đơn hàng</strong> đã mua để nhận miễn phí.
              </li>
              <li>
                <strong>🛒 Tủ sách &amp; Affiliate:</strong> Đọc bản Review + Xem trước chương mẫu trước khi đặt mua sách in hoặc qua link Affiliate.
              </li>
            </ul>
          </div>
        </aside>

        {/* Right Column: Filter Bar + Document Grid/List */}
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm tài liệu, sách, slide, công thức nấu ăn, bệnh lý..."
                  className="w-full rounded-xl border border-gray-300 py-2 pl-3.5 pr-9 text-sm outline-none focus:border-brand"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2.5 top-2 text-sm text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400">🔍</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={accessFilter}
                  onChange={(e) => setAccessFilter(e.target.value)}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:border-brand"
                >
                  <option value="all">🔐 Mọi hình thức tải</option>
                  <option value="free">🔓 Miễn phí tải ngay</option>
                  <option value="survey">📝 Khảo sát / Nhiệm vụ</option>
                  <option value="bundle">🎁 Tặng phẩm kèm Sản phẩm</option>
                  <option value="affiliate">🛒 Sách &amp; Link Affiliate</option>
                  <option value="paid">💎 Ấn phẩm đặc biệt (Trả phí)</option>
                </select>

                <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      viewMode === "grid" ? "bg-brand text-white shadow-sm" : "text-gray-700 hover:text-brand"
                    }`}
                  >
                    ⊞ Thư viện
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      viewMode === "list" ? "bg-brand text-white shadow-sm" : "text-gray-700 hover:text-brand"
                    }`}
                  >
                    ☰ Danh sách
                  </button>
                </div>
              </div>
            </div>

            {/* File Type Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "all", label: "Tất cả định dạng", icon: "🗂️" },
                  { id: "pdf", label: "PDF", icon: "📕" },
                  { id: "doc", label: "Word / Docs", icon: "📘" },
                  { id: "ppt", label: "Bài trình chiếu Slide", icon: "📙" },
                  { id: "book", label: "Sách & Affiliate", icon: "📗" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTypeFilter(t.id)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      typeFilter === t.id
                        ? "bg-brand text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-brand"
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-500">
                Đang hiển thị <strong className="text-gray-800">{filtered.length}</strong> tài liệu
              </span>
            </div>
          </div>

          {/* Active Folder Breadcrumb */}
          {selectedFolder !== "all" && (
            <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50/60 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2 font-medium text-gray-700">
                <span>📂 Thư mục đang mở:</span>
                <strong className="text-brand">{selectedFolder}</strong>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFolder("all")}
                className="font-semibold text-red-600 hover:underline"
              >
                ✕ Xem tất cả thư mục
              </button>
            </div>
          )}

          {/* Document Cards */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-sm text-gray-500">
              Không tìm thấy tài liệu nào trong thư mục / bộ lọc này.
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((d) => {
                const tMeta = DOC_TYPE_META[d.doc_type] ?? DOC_TYPE_META.pdf;
                const aMeta = ACCESS_META[d.access_mode] ?? ACCESS_META.free;
                const isUnlocked = d.access_mode === "free" || unlockedIds.includes(d.id);
                const dlCount = downloadCounts[d.id] ?? d.downloads;
                const highlightLines = (d.highlights || "")
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 3);

                return (
                  <article
                    key={d.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
                  >
                    {/* Top Header / Cover Strip */}
                    <div className="flex gap-4 border-b border-gray-100 bg-gray-50/60 p-4">
                      {d.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.cover}
                          alt={d.title}
                          className="h-28 w-20 shrink-0 rounded-lg border object-cover shadow-sm"
                        />
                      ) : (
                        <div
                          className={`flex h-28 w-20 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br ${tMeta.coverBg} p-2 text-center text-white shadow-sm`}
                        >
                          <span className="text-2xl">{tMeta.icon}</span>
                          <span className="mt-1 rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-bold tracking-wider">
                            {tMeta.short}
                          </span>
                          {d.pages > 0 && (
                            <span className="mt-1 text-[9px] opacity-90">{d.pages} trang</span>
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${tMeta.badge}`}>
                            {tMeta.icon} {tMeta.short}
                          </span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${aMeta.badge}`}>
                            {isUnlocked && d.access_mode !== "free" ? "✓ Đã mở khóa" : `${aMeta.icon} ${aMeta.label}`}
                          </span>
                          {d.price > 0 && (
                            <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
                              {vnd(d.price)}
                            </span>
                          )}
                        </div>

                        <h2
                          onClick={() => {
                            setReviewDoc(d);
                            setReviewTab("review");
                          }}
                          className="cursor-pointer line-clamp-2 text-base font-bold text-gray-900 hover:text-brand"
                        >
                          {d.title}
                        </h2>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                          <span>📂 {d.folder_path.split("/").pop()?.trim()}</span>
                          {d.file_size && <span>· {d.file_size}</span>}
                          <span>· ⬇️ {dlCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Body: Summary + Key Review Highlights */}
                    <div className="flex flex-1 flex-col p-4">
                      <p className="line-clamp-2 text-xs leading-relaxed text-gray-600">{d.summary}</p>

                      {highlightLines.length > 0 && (
                        <div className="mt-3 rounded-xl border border-green-100 bg-green-50/40 p-2.5">
                          <div className="mb-1 text-[11px] font-bold text-brand">
                            📌 Điểm nổi bật trong tài liệu:
                          </div>
                          <ul className="space-y-1 text-[11px] text-gray-700">
                            {highlightLines.map((line, i) => (
                              <li key={i} className="line-clamp-1">
                                <span className="mr-1 text-brand font-bold">✓</span>
                                {line}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {d.bundle_product_name && (
                        <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/50 px-2.5 py-1.5 text-[11px] text-teal-900">
                          <span>🎁</span>
                          <span className="truncate">
                            Tặng kèm khi mua: <strong>{d.bundle_product_name}</strong>
                          </span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewDoc(d);
                            setReviewTab("review");
                          }}
                          className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
                        >
                          👁️ Đọc Review &amp; Xem trước
                        </button>
                        <button
                          type="button"
                          onClick={() => openGate(d)}
                          className="flex-1 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-dark"
                        >
                          {isUnlocked && d.access_mode !== "affiliate" ? "⬇️ Tải tài liệu ngay" : aMeta.btnText}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="divide-y overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {filtered.map((d) => {
                const tMeta = DOC_TYPE_META[d.doc_type] ?? DOC_TYPE_META.pdf;
                const aMeta = ACCESS_META[d.access_mode] ?? ACCESS_META.free;
                const isUnlocked = d.access_mode === "free" || unlockedIds.includes(d.id);
                const dlCount = downloadCounts[d.id] ?? d.downloads;
                return (
                  <div key={d.id} className="flex flex-col gap-4 p-4 transition hover:bg-gray-50 sm:flex-row sm:items-center">
                    <div
                      className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br ${tMeta.coverBg} text-white shadow-sm`}
                    >
                      <span className="text-xl">{tMeta.icon}</span>
                      <span className="text-[9px] font-bold">{tMeta.short}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className={`rounded px-2 py-0.5 font-semibold ${aMeta.badge}`}>
                          {aMeta.icon} {aMeta.label}
                        </span>
                        <span className="text-gray-500">📁 {d.folder_path}</span>
                        {d.pages > 0 && <span className="text-gray-400">· {d.pages} trang</span>}
                        {d.file_size && <span className="text-gray-400">· {d.file_size}</span>}
                        <span className="text-gray-400">· ⬇️ {dlCount} lượt tải</span>
                      </div>
                      <h3
                        onClick={() => {
                          setReviewDoc(d);
                          setReviewTab("review");
                        }}
                        className="cursor-pointer text-sm font-bold text-gray-900 hover:text-brand sm:text-base"
                      >
                        {d.title}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-600">{d.summary}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewDoc(d);
                          setReviewTab("review");
                        }}
                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-brand hover:text-brand"
                      >
                        👁️ Xem Review
                      </button>
                      <button
                        type="button"
                        onClick={() => openGate(d)}
                        className="rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-dark"
                      >
                        {isUnlocked ? "⬇️ Tải ngay" : aMeta.btnText}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: DOCUMENT REVIEW & LIVE PREVIEW MODAL */}
      {reviewDoc && (
        <div
          onClick={() => setReviewDoc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b bg-gray-50 px-5 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 font-semibold text-brand">
                    📁 {reviewDoc.folder_path}
                  </span>
                  <span className="text-gray-500">
                    Tác giả: <strong>{reviewDoc.author}</strong>
                  </span>
                  {reviewDoc.pages > 0 && <span className="text-gray-500">· {reviewDoc.pages} trang/slide</span>}
                  {reviewDoc.file_size && <span className="text-gray-500">· {reviewDoc.file_size}</span>}
                </div>
                <h2 className="mt-1 text-lg font-bold text-gray-900 md:text-xl">{reviewDoc.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setReviewDoc(null)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs: Review vs Live Preview */}
            <div className="flex items-center justify-between border-b bg-white px-5 py-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReviewTab("review")}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    reviewTab === "review" ? "bg-brand text-white" : "bg-gray-100 text-gray-700 hover:text-brand"
                  }`}
                >
                  📖 Bài Review &amp; Tóm tắt nội dung
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab("preview")}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    reviewTab === "preview" ? "bg-brand text-white" : "bg-gray-100 text-gray-700 hover:text-brand"
                  }`}
                >
                  👁️ Đọc thử / Xem trước trực tuyến
                </button>
              </div>
              {reviewDoc.drive_folder_url && (
                <a
                  href={reviewDoc.drive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden text-xs font-semibold text-brand hover:underline sm:inline"
                >
                  📂 Mở thư mục Google Drive gốc ↗
                </a>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {reviewTab === "review" ? (
                <div className="grid gap-6 md:grid-cols-[1fr_260px]">
                  <div className="space-y-4">
                    {reviewDoc.highlights && (
                      <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
                        <h3 className="mb-2 text-sm font-bold text-brand">
                          📌 Tóm tắt các điểm giá trị nhất của tài liệu
                        </h3>
                        <ul className="space-y-1.5 text-sm text-gray-800">
                          {reviewDoc.highlights
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .map((line, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="font-bold text-brand">✓</span>
                                <span>{line}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    <div
                      className="prose-content rounded-xl border bg-white p-5"
                      dangerouslySetInnerHTML={{
                        __html: reviewDoc.review_html || `<p>${reviewDoc.summary}</p>`,
                      }}
                    />
                  </div>

                  {/* Right Sidebar inside Review Modal */}
                  <aside className="space-y-4 h-fit">
                    <div className="rounded-xl border bg-gray-50 p-4 text-xs space-y-2">
                      <div className="font-bold text-gray-900 text-sm border-b pb-2">Thông số tài liệu</div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Định dạng:</span>
                        <span className="font-semibold uppercase text-gray-800">{reviewDoc.doc_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Số trang / Slide:</span>
                        <span className="font-semibold text-gray-800">{reviewDoc.pages} trang</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Dung lượng:</span>
                        <span className="font-semibold text-gray-800">{reviewDoc.file_size || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Lượt tải về:</span>
                        <span className="font-semibold text-brand">
                          {downloadCounts[reviewDoc.id] ?? reviewDoc.downloads} lượt
                        </span>
                      </div>
                    </div>

                    {reviewDoc.bundle_product_name && reviewDoc.bundle_product_slug && reviewDoc.bundle_category_slug && (
                      <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-xs space-y-2">
                        <div className="font-bold text-teal-900">🎁 Sản phẩm Thực dưỡng đi kèm</div>
                        <p className="text-gray-700">{reviewDoc.bundle_product_name}</p>
                        {reviewDoc.bundle_product_price ? (
                          <div className="text-sm font-bold text-accent">
                            {vnd(reviewDoc.bundle_product_price)}
                          </div>
                        ) : null}
                        <Link
                          href={`/san-pham/${reviewDoc.bundle_category_slug}/${reviewDoc.bundle_product_slug}.html`}
                          className="mt-2 block rounded-lg bg-teal-700 px-3 py-2 text-center font-semibold text-white hover:bg-teal-800"
                        >
                          Xem sản phẩm này →
                        </Link>
                      </div>
                    )}
                  </aside>
                </div>
              ) : (
                /* Preview Tab */
                <div className="space-y-4">
                  {reviewDoc.drive_url.startsWith("/uploads/") ? (
                    <iframe
                      src={reviewDoc.drive_url}
                      title={reviewDoc.title}
                      className="h-[60vh] w-full rounded-xl border"
                    />
                  ) : (
                    <div className="rounded-xl border bg-gray-50 p-6">
                      <div className="mx-auto max-w-2xl rounded-xl border bg-white p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b pb-3 text-xs text-gray-500">
                          <span>📄 Bản đọc thử trích lược — {reviewDoc.title}</span>
                          <span>Trang 1 / {reviewDoc.pages || 45}</span>
                        </div>
                        <div
                          className="prose-content"
                          dangerouslySetInnerHTML={{
                            __html: reviewDoc.review_html || `<p>${reviewDoc.summary}</p>`,
                          }}
                        />
                        {toDrivePreviewUrl(reviewDoc.drive_url) && (
                          <div className="pt-3 border-t flex items-center justify-between text-xs text-gray-500">
                            <span>Tài liệu lưu trữ trên Google Drive Cloud</span>
                            <button
                              type="button"
                              onClick={() => {
                                const doc = reviewDoc;
                                setReviewDoc(null);
                                openGate(doc);
                              }}
                              className="font-bold text-brand hover:underline"
                            >
                              Mở khóa để xem &amp; tải toàn văn ({reviewDoc.pages} trang) →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-gray-50 px-5 py-3.5">
              <span className="text-xs text-gray-500">
                Bạn đã xem phần Review sơ bộ. Bấm nút bên phải để tải tài liệu hoặc đặt mua sách.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewDoc(null)}
                  className="rounded-xl border px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const doc = reviewDoc;
                    setReviewDoc(null);
                    openGate(doc);
                  }}
                  className="rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white shadow hover:bg-brand-dark"
                >
                  ⬇️ Tiếp tục Tải / Nhận tài liệu này →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SMART DOWNLOAD / UNLOCK GATE MODAL */}
      {gateDoc && (
        <div
          onClick={() => setGateDoc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b bg-brand px-5 py-4 text-white">
              <div>
                <div className="text-xs uppercase tracking-wider opacity-85">
                  {ACCESS_META[gateDoc.access_mode]?.label ?? "Tải tài liệu"}
                </div>
                <h3 className="mt-0.5 text-base font-bold">{gateDoc.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setGateDoc(null)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold text-white hover:bg-white/30"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Unlocked / Free state */}
              {gateSuccessUrl ? (
                <div className="space-y-4 text-center py-2">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-green-100 text-2xl text-brand">
                    ✓
                  </div>
                  <div>
                    <div className="text-base font-bold text-gray-900">Tài liệu đã sẵn sàng để tải xuống!</div>
                    <p className="mt-1 text-xs text-gray-500">
                      Định dạng: <strong className="uppercase">{gateDoc.doc_type}</strong> · {gateDoc.pages} trang · {gateDoc.file_size}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                    <a
                      href={gateSuccessUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleUnlockSubmit("free")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow hover:bg-brand-dark"
                    >
                      ⬇️ Mở / Tải File từ Google Drive ↗
                    </a>
                    {gateDoc.drive_folder_url && (
                      <a
                        href={gateDoc.drive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-4 py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        📂 Mở cả thư mục Drive
                      </a>
                    )}
                  </div>
                </div>
              ) : gateDoc.access_mode === "survey" ? (
                /* SURVEY / TASK GATE */
                <div className="space-y-3">
                  <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3.5 text-xs text-purple-950">
                    <div className="font-bold">📝 Hoàn thành khảo sát / nhiệm vụ nhỏ (30 giây) để mở khóa tải miễn phí:</div>
                    <p className="mt-1">
                      {gateDoc.task_prompt ||
                        "Hãy chia sẻ vấn đề sức khỏe hoặc mục tiêu thực dưỡng bạn đang quan tâm để chúng tôi gửi thêm tài liệu phù hợp nhé!"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-gray-50 p-3 text-xs space-y-2">
                    <div className="font-semibold text-gray-700">Nhiệm vụ cộng đồng (Tuỳ chọn khuyến khích):</div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={taskChecked}
                          onChange={(e) => setTaskChecked(e.target.checked)}
                        />
                        <span>Tôi đã theo dõi kênh YouTube <strong>Duy Vo (@quocduy2401)</strong></span>
                      </label>
                      <a
                        href="https://www.youtube.com/@quocduy2401?sub_confirmation=1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700"
                      >
                        ▶ Đăng ký kênh ↗
                      </a>
                    </div>
                  </div>

                  <input
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Họ và tên của bạn *"
                    className="w-full rounded-xl border px-3.5 py-2 text-sm outline-none focus:border-brand"
                  />
                  <input
                    value={leadContact}
                    onChange={(e) => setLeadContact(e.target.value)}
                    placeholder="Số điện thoại Zalo hoặc Email *"
                    className="w-full rounded-xl border px-3.5 py-2 text-sm outline-none focus:border-brand"
                  />
                  <textarea
                    rows={2}
                    value={leadAnswer}
                    onChange={(e) => setLeadAnswer(e.target.value)}
                    placeholder="Câu trả lời khảo sát / Vấn đề sức khỏe bạn đang quan tâm... *"
                    className="w-full rounded-xl border px-3.5 py-2 text-sm outline-none focus:border-brand"
                  />

                  {gateError && <p className="text-xs font-medium text-red-600">{gateError}</p>}

                  <button
                    type="button"
                    disabled={gateBusy}
                    onClick={() => handleUnlockSubmit("survey")}
                    className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white shadow hover:bg-brand-dark disabled:opacity-50"
                  >
                    {gateBusy ? "Đang xử lý..." : "🔓 Hoàn thành & Mở khóa tải tài liệu ngay"}
                  </button>
                </div>
              ) : gateDoc.access_mode === "bundle" ? (
                /* PRODUCT BUNDLE GATE */
                <div className="space-y-4">
                  <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3.5 text-xs text-teal-950">
                    <div className="font-bold">🎁 Tài liệu Tặng phẩm dành cho Khách hàng Thực Dưỡng Phúc Thọ</div>
                    <p className="mt-1">
                      Tài liệu này được tặng miễn phí khi bạn đặt mua sản phẩm thực dưỡng tại cửa hàng hoặc đã có mã đơn hàng.
                    </p>
                  </div>

                  {gateDoc.bundle_product_id && gateDoc.bundle_product_name && (
                    <div className="rounded-xl border p-3.5 space-y-2.5">
                      <div className="text-xs font-bold text-gray-800">
                        Cách 1: Đặt mua sản phẩm kèm tặng phẩm này
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs">
                          <div className="font-semibold text-brand">{gateDoc.bundle_product_name}</div>
                          {gateDoc.bundle_product_price ? (
                            <div className="font-bold text-accent">{vnd(gateDoc.bundle_product_price)}</div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={gateBusy}
                          onClick={() => addBundleProductToCart(gateDoc.bundle_product_id!)}
                          className="shrink-0 rounded-xl bg-accent px-3.5 py-2 text-xs font-bold text-white hover:opacity-90"
                        >
                          🛒 Thêm vào giỏ hàng
                        </button>
                      </div>
                      {cartMsg && <p className="text-xs font-medium text-brand">{cartMsg}</p>}
                    </div>
                  )}

                  <div className="rounded-xl border bg-gray-50 p-3.5 space-y-2.5">
                    <div className="text-xs font-bold text-gray-800">
                      Cách 2: Nhập Mã đơn hàng hoặc SĐT đã mua hàng để tải ngay
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={orderCode}
                        onChange={(e) => setOrderCode(e.target.value)}
                        placeholder="Nhập Mã đơn (VD: TD12345) hoặc SĐT đặt hàng..."
                        className="flex-1 rounded-xl border bg-white px-3 py-2 text-xs outline-none focus:border-brand"
                      />
                      <button
                        type="button"
                        disabled={gateBusy}
                        onClick={() => handleUnlockSubmit("bundle_verify")}
                        className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark"
                      >
                        Xác nhận &amp; Tải
                      </button>
                    </div>
                    {gateError && <p className="text-xs font-medium text-red-600">{gateError}</p>}
                  </div>
                </div>
              ) : gateDoc.access_mode === "affiliate" ? (
                /* BOOK SHOWCASE & AFFILIATE / ON-SITE PURCHASE */
                <div className="space-y-4">
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 text-xs text-indigo-950">
                    <div className="font-bold">📗 Đặt mua Sách in chính hãng hoặc Đọc bản tóm tắt</div>
                    <p className="mt-1">
                      Bạn có thể đặt mua sách qua link đối tác Affiliate, đặt kèm đơn hàng trên website hoặc tải bản đọc thử PDF.
                    </p>
                  </div>

                  <div className="grid gap-2.5">
                    {gateDoc.affiliate_url && (
                      <a
                        href={gateDoc.affiliate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-xl bg-orange-600 px-4 py-3 text-xs font-bold text-white shadow hover:bg-orange-700"
                      >
                        <span>🛒 Mua sách chính hãng qua Link Affiliate (Shopee / Nhà sách)</span>
                        <span>↗</span>
                      </a>
                    )}

                    {gateDoc.bundle_product_id && gateDoc.bundle_product_name && (
                      <button
                        type="button"
                        onClick={() => addBundleProductToCart(gateDoc.bundle_product_id!)}
                        className="flex items-center justify-between rounded-xl border-2 border-brand bg-green-50/50 px-4 py-3 text-xs font-bold text-brand hover:bg-brand hover:text-white transition"
                      >
                        <span>🛍️ Đặt mua trực tiếp tại Thực Dưỡng Phúc Thọ</span>
                        <span>{gateDoc.price > 0 ? vnd(gateDoc.price) : "Liên hệ"}</span>
                      </button>
                    )}

                    {cartMsg && <p className="text-xs font-medium text-brand">{cartMsg}</p>}

                    {gateDoc.drive_url && (
                      <a
                        href={gateDoc.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleUnlockSubmit("free")}
                        className="flex items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <span>📄 Tải bản Đọc thử / Tóm tắt nội dung (PDF Google Drive)</span>
                        <span>⬇️ Miễn phí</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                /* PAID / DONATION DIGITAL DOCUMENT */
                <div className="space-y-3">
                  <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3.5 text-xs text-gray-800 space-y-1">
                    <div className="font-bold text-accent text-sm">
                      💎 Ấn phẩm đặc biệt — Phí ủng hộ biên soạn: {vnd(gateDoc.price)}
                    </div>
                    <div>• <strong>Ngân hàng:</strong> BIDV</div>
                    <div>• <strong>Số tài khoản (STK):</strong> <span className="font-mono font-bold text-accent">8610312888</span></div>
                    <div>• <strong>Chủ tài khoản:</strong> HO KINH DOANH CUA HANG PHUC THO</div>
                    <div>• <strong>Nội dung CK:</strong> TAI LIEU - SĐT của bạn</div>
                    <p className="pt-1 text-[11px] text-gray-600">
                      * Miễn phí 100% nếu bạn đã có đơn hàng tại Thực Dưỡng Phúc Thọ!
                    </p>
                  </div>

                  <input
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Họ và tên của bạn *"
                    className="w-full rounded-xl border px-3.5 py-2 text-xs outline-none focus:border-brand"
                  />
                  <input
                    value={leadContact}
                    onChange={(e) => setLeadContact(e.target.value)}
                    placeholder="Số điện thoại chuyển khoản (hoặc Mã đơn hàng đã mua) *"
                    className="w-full rounded-xl border px-3.5 py-2 text-xs outline-none focus:border-brand"
                  />
                  <input
                    value={leadAnswer}
                    onChange={(e) => setLeadAnswer(e.target.value)}
                    placeholder="Ghi chú xác nhận chuyển khoản hoặc Mã đơn hàng..."
                    className="w-full rounded-xl border px-3.5 py-2 text-xs outline-none focus:border-brand"
                  />

                  {gateError && <p className="text-xs font-medium text-red-600">{gateError}</p>}

                  <button
                    type="button"
                    disabled={gateBusy}
                    onClick={() => handleUnlockSubmit("paid_verify")}
                    className="w-full rounded-xl bg-brand py-2.5 text-xs font-bold text-white shadow hover:bg-brand-dark"
                  >
                    {gateBusy ? "Đang xác nhận..." : "✓ Xác nhận & Mở khóa tải trọn bộ PDF"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
