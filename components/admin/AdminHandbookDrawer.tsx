"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_HANDBOOK_SECTIONS,
  findMatchingSectionId,
  ROLE_SOP_CHECKLISTS,
  type HandbookTopic,
} from "@/lib/admin-handbook";

export default function AdminHandbookDrawer() {
  const pathname = usePathname() || "/admin/";
  const currentSectionId = useMemo(() => findMatchingSectionId(pathname), [pathname]);

  const [panelState, setPanelState] = useState<"closed" | "open" | "minimized">("closed");
  const [widthLevel, setWidthLevel] = useState<1 | 2>(1);
  const [scope, setScope] = useState<"current" | "role_sop" | "all">("current");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  // Custom Shop SOP Notes (persisted in D1 per section_id)
  const [customNotes, setCustomNotes] = useState<
    Record<string, { note_text: string; updated_by: string; updated_at: string }>
  >({});
  const [userRole, setUserRole] = useState<string>("admin");
  const [editingNote, setEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Auto-expand topics of the active route whenever route changes
  useEffect(() => {
    const sec = ADMIN_HANDBOOK_SECTIONS.find((s) => s.id === currentSectionId);
    if (!sec) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const t of sec.topics) next[t.id] = true;
      return next;
    });
  }, [currentSectionId]);

  // Load Custom Shop SOP Notes when drawer opens
  useEffect(() => {
    if (panelState !== "open") return;
    fetch("/api/admin/handbook-notes/", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (d.notes) setCustomNotes(d.notes);
        if (d.role) setUserRole(d.role);
      })
      .catch(() => {});
  }, [panelState]);

  const currentCustomNote = customNotes[currentSectionId]?.note_text || "";

  async function handleSaveCustomNote() {
    setSavingNote(true);
    try {
      const res = await fetch("/api/admin/handbook-notes/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: currentSectionId,
          noteText: draftNote,
        }),
      });
      const data = await res.json();
      if (res.ok && data.notes) {
        setCustomNotes(data.notes);
        setEditingNote(false);
      }
    } finally {
      setSavingNote(false);
    }
  }

  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base =
      q || scope === "all"
        ? ADMIN_HANDBOOK_SECTIONS
        : ADMIN_HANDBOOK_SECTIONS.filter((s) => s.id === currentSectionId);

    const ordered = [...base].sort((a, b) => {
      if (a.id === currentSectionId) return -1;
      if (b.id === currentSectionId) return 1;
      return 0;
    });

    if (!q) return ordered;

    return ordered
      .map((sec) => {
        const secMatch = sec.label.toLowerCase().includes(q);
        const filteredTopics = sec.topics.filter(
          (t) =>
            secMatch ||
            t.title.toLowerCase().includes(q) ||
            t.items.some(
              (it) =>
                it.heading.toLowerCase().includes(q) ||
                it.body.toLowerCase().includes(q),
            ),
        );
        return { ...sec, topics: filteredTopics };
      })
      .filter((sec) => sec.topics.length > 0);
  }, [scope, query, currentSectionId]);

  const allTopics: HandbookTopic[] = useMemo(
    () => visibleSections.flatMap((s) => s.topics),
    [visibleSections],
  );

  function toggleTopic(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function expandAll(val: boolean) {
    const next: Record<string, boolean> = { ...expanded };
    for (const t of allTopics) next[t.id] = val;
    setExpanded(next);
  }

  const currentSectionMeta = ADMIN_HANDBOOK_SECTIONS.find((s) => s.id === currentSectionId);

  return (
    <>
      {/* Trigger button fixed at top-right of admin viewport */}
      {panelState === "closed" && (
        <button
          type="button"
          onClick={() => setPanelState("open")}
          className="fixed right-4 top-3 z-[90] inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-brand/30 bg-white/95 px-3 py-1.5 text-xs font-extrabold text-brand shadow-md backdrop-blur transition hover:bg-brand hover:text-white print:hidden"
          title="Mở Cẩm nang hướng dẫn & Quy trình SOP cá nhân hóa theo trang"
        >
          <span>📖</span>
          <span>Cẩm nang &amp; SOP</span>
        </button>
      )}

      {/* Minimized floating tab on the right edge */}
      {panelState === "minimized" && (
        <button
          type="button"
          onClick={() => setPanelState("open")}
          className="fixed right-0 top-1/2 z-[100] -translate-y-1/2 cursor-pointer rounded-l-2xl border border-r-0 border-brand/30 bg-brand px-3 py-4 text-xs font-extrabold text-white shadow-xl transition hover:bg-brand-dark print:hidden"
          title="Mở rộng Cẩm nang Backend"
        >
          <div className="flex flex-col items-center gap-1">
            <span>«</span>
            <span className="[writing-mode:vertical-rl] tracking-wide">📖 Cẩm nang &amp; SOP</span>
          </div>
        </button>
      )}

      {/* Right Slide-Over Panel (Supports 2 Width Expansion Levels + Minimize to right) */}
      {panelState === "open" && (
        <div
          onClick={() => setPanelState("closed")}
          className="fixed inset-0 z-[100] flex justify-end bg-black/25 backdrop-blur-[1px] print:hidden"
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className={`flex h-full flex-col border-l border-gray-200 bg-white shadow-2xl transition-all duration-200 ${
              widthLevel === 2 ? "w-full max-w-3xl" : "w-full max-w-md"
            }`}
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gradient-to-r from-brand-dark to-brand px-4 py-3 text-white">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-extrabold">
                  📖 Cẩm nang Quản trị &amp; Quy trình SOP Cá nhân hóa
                </h2>
                <p className="truncate text-[11px] text-emerald-100">
                  Tự động nhận diện trang đang mở · Checklist theo vai trò &amp; Ghi chú nội bộ
                </p>
              </div>
              <div className="flex items-center gap-1">
                <div className="inline-flex rounded-lg bg-black/25 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setWidthLevel(1)}
                    className={`cursor-pointer rounded px-2 py-0.5 font-bold ${
                      widthLevel === 1 ? "bg-white text-brand-dark" : "text-white/80 hover:text-white"
                    }`}
                    title="Khung gọn 450px"
                  >
                    ‹ Mức 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setWidthLevel(2)}
                    className={`cursor-pointer rounded px-2 py-0.5 font-bold ${
                      widthLevel === 2 ? "bg-amber-400 text-slate-950" : "text-white/80 hover:text-white"
                    }`}
                    title="Kéo giãn rộng sang trái (768px) để đọc chi tiết"
                  >
                    « Mức 2 (Rộng)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPanelState("minimized")}
                  title="Thu nhỏ cột sang mép phải"
                  className="cursor-pointer rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/25"
                >
                  Ẩn »
                </button>
                <button
                  type="button"
                  onClick={() => setPanelState("closed")}
                  title="Đóng"
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg bg-white/15 text-xs font-bold text-white hover:bg-white/25"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 3-Mode Scope Switcher + Search */}
            <div className="space-y-2 border-b bg-gray-50 px-4 py-2.5">
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setScope("current")}
                  className={`cursor-pointer rounded-lg px-2 py-1.5 font-bold transition ${
                    scope === "current"
                      ? "bg-brand text-white shadow-2xs"
                      : "border bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  📍 Trang đang mở
                </button>
                <button
                  type="button"
                  onClick={() => setScope("role_sop")}
                  className={`cursor-pointer rounded-lg px-2 py-1.5 font-bold transition ${
                    scope === "role_sop"
                      ? "bg-brand text-white shadow-2xs"
                      : "border bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  👤 Quy trình Vai trò
                </button>
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`cursor-pointer rounded-lg px-2 py-1.5 font-bold transition ${
                    scope === "all"
                      ? "bg-brand text-white shadow-2xs"
                      : "border bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  📚 Toàn bộ ({ADMIN_HANDBOOK_SECTIONS.length})
                </button>
              </div>

              {scope !== "role_sop" && (
                <>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="🔍 Tìm nhanh: POS, Hóa đơn A5, Lô FEFO, Công nợ, Log Audit, Hoàn tác..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand"
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-gray-500">
                      {allTopics.length} chủ đề hướng dẫn
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => expandAll(true)}
                        className="cursor-pointer font-bold text-brand hover:underline"
                      >
                        + Mở tất cả
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => expandAll(false)}
                        className="cursor-pointer font-bold text-gray-600 hover:underline"
                      >
                        − Thu gọn tất cả
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {/* TIER 3: Custom Shop SOP Note Box for Current Page */}
              {scope === "current" && (
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50/70 p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-amber-950">
                      📌 Quy định &amp; Ghi chú Nội bộ Phúc Thọ ({currentSectionMeta?.label || "Trang này"})
                    </span>
                    {(userRole === "super_admin" || userRole === "admin") && !editingNote && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraftNote(currentCustomNote);
                          setEditingNote(true);
                        }}
                        className="cursor-pointer rounded-md border border-amber-400 bg-white px-2 py-0.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                      >
                        ✏️ {currentCustomNote ? "Sửa ghi chú" : "+ Thêm quy định riêng"}
                      </button>
                    )}
                  </div>

                  {editingNote ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        placeholder="Nhập quy định, lưu ý ca trực hoặc hướng dẫn riêng của cửa hàng cho chuyên mục này..."
                        className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-xs outline-none focus:border-brand"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingNote(false)}
                          className="cursor-pointer rounded-lg border bg-white px-3 py-1 text-[11px] font-semibold text-gray-600"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={savingNote}
                          onClick={handleSaveCustomNote}
                          className="cursor-pointer rounded-lg bg-brand px-3 py-1 text-[11px] font-bold text-white hover:bg-brand-dark"
                        >
                          {savingNote ? "Đang lưu..." : "💾 Lưu quy định cho trang này"}
                        </button>
                      </div>
                    </div>
                  ) : currentCustomNote ? (
                    <div className="whitespace-pre-line rounded-lg bg-white/90 p-2.5 text-xs font-medium text-gray-800 shadow-2xs">
                      {currentCustomNote}
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-900/80">
                      Chưa có ghi chú riêng cho trang này. Chủ shop / Quản lý có thể bấm <strong>&ldquo;+ Thêm quy định riêng&rdquo;</strong> để dặn dò nhân viên ngay tại đây.
                    </p>
                  )}
                </div>
              )}

              {/* TIER 2: Role-Personalized Daily SOP Checklists */}
              {scope === "role_sop" ? (
                <div className="space-y-4">
                  {ROLE_SOP_CHECKLISTS.map((sop) => {
                    const isMyRole = sop.role === userRole;
                    return (
                      <div
                        key={sop.role}
                        className={`rounded-2xl border p-4 space-y-3 ${
                          isMyRole ? "border-2 border-brand bg-emerald-50/30 shadow-xs" : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                          <div>
                            <div className="text-xs font-extrabold text-gray-900">{sop.title}</div>
                            <div className="text-[11px] text-gray-500">{sop.subtitle}</div>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                              isMyRole ? "bg-brand text-white" : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {isMyRole ? `★ Vai trò của bạn (${sop.badge})` : sop.badge}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {sop.steps.map((st, idx) => {
                            const key = `${sop.role}-${idx}`;
                            const done = Boolean(checkedSteps[key]);
                            return (
                              <div
                                key={key}
                                className={`rounded-xl border p-2.5 text-xs transition ${
                                  done ? "border-emerald-200 bg-emerald-50/60 opacity-80" : "bg-white"
                                }`}
                              >
                                <label className="flex items-start gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={done}
                                    onChange={(e) =>
                                      setCheckedSteps((prev) => ({ ...prev, [key]: e.target.checked }))
                                    }
                                    className="mt-0.5 accent-brand"
                                  />
                                  <div className="flex-1">
                                    <div className={`font-bold ${done ? "line-through text-gray-500" : "text-gray-900"}`}>
                                      {st.step}
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-gray-600">{st.detail}</p>
                                    <Link
                                      href={st.href}
                                      onClick={() => setPanelState("minimized")}
                                      className="mt-1 inline-block text-[11px] font-bold text-brand hover:underline"
                                    >
                                      Đi tới màn hình thực hiện →
                                    </Link>
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* TIER 1: Contextual Page / All Sections Accordion Topics */
                <>
                  {visibleSections.length === 0 ? (
                    <p className="py-8 text-center text-xs text-gray-500">
                      Không tìm thấy mục hướng dẫn khớp với &ldquo;{query}&rdquo;.
                    </p>
                  ) : (
                    visibleSections.map((sec) => (
                      <div key={sec.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-1">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-800">
                            <span>{sec.icon}</span>
                            <span>{sec.label}</span>
                          </div>
                          {sec.id === currentSectionId && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              Đang mở trang này
                            </span>
                          )}
                        </div>

                        {sec.topics.map((topic) => {
                          const isOpen = query.trim() ? true : Boolean(expanded[topic.id]);
                          return (
                            <div
                              key={topic.id}
                              className={`overflow-hidden rounded-xl border transition ${
                                isOpen ? "border-brand/40 bg-emerald-50/20" : "border-gray-200 bg-white"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleTopic(topic.id)}
                                className="flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-gray-50/80"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-brand/30 bg-emerald-50 font-mono text-sm font-extrabold text-brand">
                                    {isOpen ? "−" : "+"}
                                  </span>
                                  <span className="text-xs font-extrabold text-gray-900">
                                    {topic.title}
                                  </span>
                                </div>
                                {topic.badge && (
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      topic.badge === "Mới"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}
                                  >
                                    {topic.badge}
                                  </span>
                                )}
                              </button>

                              {isOpen && (
                                <div className="space-y-2.5 border-t border-gray-100 bg-white px-3.5 py-3 text-xs leading-relaxed text-gray-700">
                                  {topic.items.map((item) => (
                                    <div key={item.heading}>
                                      <div className="font-bold text-gray-900">{item.heading}</div>
                                      <p className="mt-0.5 text-gray-600">{item.body}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
