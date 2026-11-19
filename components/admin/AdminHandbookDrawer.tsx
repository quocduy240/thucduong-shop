"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_HANDBOOK_SECTIONS,
  findMatchingSectionId,
  type HandbookTopic,
} from "@/lib/admin-handbook";

export default function AdminHandbookDrawer() {
  const pathname = usePathname() || "/admin/";
  const currentSectionId = useMemo(() => findMatchingSectionId(pathname), [pathname]);

  const [panelState, setPanelState] = useState<"closed" | "open" | "minimized">("closed");
  const [scope, setScope] = useState<"current" | "all">("current");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base =
      q || scope === "all"
        ? ADMIN_HANDBOOK_SECTIONS
        : ADMIN_HANDBOOK_SECTIONS.filter((s) => s.id === currentSectionId);

    // Put current section first when viewing all
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

  return (
    <>
      {/* Trigger button fixed at top-right of admin viewport */}
      {panelState === "closed" && (
        <button
          type="button"
          onClick={() => setPanelState("open")}
          className="fixed right-4 top-3 z-[90] inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-brand/30 bg-white/95 px-3 py-1.5 text-xs font-extrabold text-brand shadow-md backdrop-blur transition hover:bg-brand hover:text-white"
          title="Mở Cẩm nang hướng dẫn sử dụng toàn Backend"
        >
          <span>📖</span>
          <span>Cẩm nang Backend</span>
        </button>
      )}

      {/* Minimized floating tab on the right edge */}
      {panelState === "minimized" && (
        <button
          type="button"
          onClick={() => setPanelState("open")}
          className="fixed right-0 top-1/2 z-[100] -translate-y-1/2 cursor-pointer rounded-l-2xl border border-r-0 border-brand/30 bg-brand px-3 py-4 text-xs font-extrabold text-white shadow-xl transition hover:bg-brand-dark"
          title="Mở rộng Cẩm nang Backend"
        >
          <div className="flex flex-col items-center gap-1">
            <span>«</span>
            <span className="[writing-mode:vertical-rl] tracking-wide">Cẩm nang Backend</span>
          </div>
        </button>
      )}

      {/* Right Slide-Over Panel */}
      {panelState === "open" && (
        <div
          onClick={() => setPanelState("closed")}
          className="fixed inset-0 z-[100] flex justify-end bg-black/30 backdrop-blur-[1px]"
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-brand-dark to-brand px-4 py-3.5 text-white">
              <div>
                <h2 className="text-sm font-extrabold">📖 Cẩm nang Hướng dẫn Toàn Backend</h2>
                <p className="text-[11px] text-emerald-100">
                  Bấm + / − ở từng chủ đề để mở rộng hoặc thu gọn
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPanelState("minimized")}
                  title="Thu nhỏ cột sang mép phải"
                  className="cursor-pointer rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/25"
                >
                  Thu nhỏ »
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

            {/* Scope switch + Search */}
            <div className="space-y-2 border-b bg-gray-50 px-4 py-2.5">
              <div className="flex gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setScope("current")}
                  className={`flex-1 cursor-pointer rounded-lg px-2.5 py-1.5 font-bold transition ${
                    scope === "current"
                      ? "bg-brand text-white shadow-2xs"
                      : "border bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  📍 Trang đang mở
                </button>
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`flex-1 cursor-pointer rounded-lg px-2.5 py-1.5 font-bold transition ${
                    scope === "all"
                      ? "bg-brand text-white shadow-2xs"
                      : "border bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  📚 Toàn bộ Backend ({ADMIN_HANDBOOK_SECTIONS.length})
                </button>
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="🔍 Tìm nhanh: Shopee, SĐT, Passwork, Zalo, Tích điểm..."
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
            </div>

            {/* Sections & Accordion Topics with + / - */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
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
                          Đang xem
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
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
