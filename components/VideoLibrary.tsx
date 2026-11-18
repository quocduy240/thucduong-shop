"use client";

import { useMemo, useRef, useState } from "react";

export type VideoEntry = {
  id: number;
  youtube_url: string;
  video_id: string;
  title: string;
  topic: string;
  description: string;
  sort: number;
  created_at: string;
};

type CategoryGroup = {
  id: string;
  label: string;
  icon: string;
  topics: string[];
};

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: "dinh-duong",
    label: "Dinh Dưỡng & Thực Dưỡng",
    icon: "🥗",
    topics: [
      "Dinh Dưỡng và Sức Khoẻ",
      "Video Mới Nhất",
      "Da khoẻ đẹp tự nhiên",
      "Máy sữa hạt Mini Gia Đình",
    ],
  },
  {
    id: "benh-ly",
    label: "Bệnh Lý & Chữa Lành",
    icon: "🩺",
    topics: [
      "Bệnh Mãn Tính - Đông Tây Y",
      "Tai biến & Đột Quỵ",
      "Bệnh Tiêu Hoá - Ruột",
      "Sức Khoẻ Đường Ruột",
      "Bệnh Táo Bón",
      "Sỏi Thận và Sỏi Mật",
      "Sức Khoẻ Của Thận",
      "Trầm Cảm - Mất Ngủ",
    ],
  },
  {
    id: "livestream",
    label: "Livestream & TalkShow",
    icon: "🎙️",
    topics: [
      "Rút gọn Livestream 2026",
      "Livestream 2026 Duy Vo",
      "Rút gọn Livestream 2025",
      "Livestream 2025 Duy Vo",
      "Livestream Duy Vo",
      "TalkShow Duy Vo",
      "Câu hỏi Livestream hay",
    ],
  },
  {
    id: "tam-an",
    label: "Tâm An, Thiền & Trí Tuệ",
    icon: "🧘",
    topics: [
      "Sức Khoẻ Tinh Thần",
      "Thiền sư Viên Thức",
      "Lời Dạy Của Đức Phật",
    ],
  },
  {
    id: "doi-song",
    label: "Trải Nghiệm & Đời Sống",
    icon: "🌿",
    topics: ["Du Lịch Đó Đây"],
  },
];

function extractDuration(desc: string): string {
  const m = desc.match(/Thời lượng:\s*(\d+:\d+(?::\d+)?)/);
  return m ? m[1] : "";
}

function durationMinutes(dur: string): number | null {
  if (!dur) return null;
  const parts = dur.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return null;
}

export default function VideoLibrary({ videos }: { videos: VideoEntry[] }) {
  const [selectedId, setSelectedId] = useState<number>(videos[0]?.id ?? 0);
  const [activeGroup, setActiveGroup] = useState<string>("all");
  const [activeTopic, setActiveTopic] = useState<string>("all");
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState<number>(24);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const playerRef = useRef<HTMLDivElement>(null);

  const topicCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of videos) {
      const t = v.topic || "Chuyên đề khác";
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return map;
  }, [videos]);

  const groupsWithCounts = useMemo(() => {
    const knownTopics = new Set(CATEGORY_GROUPS.flatMap((g) => g.topics));
    const customTopics = Array.from(topicCountMap.keys()).filter((t) => !knownTopics.has(t));
    const base = CATEGORY_GROUPS.map((g) => ({
      ...g,
      count: g.topics.reduce((sum, t) => sum + (topicCountMap.get(t) ?? 0), 0),
    })).filter((g) => g.count > 0);
    if (customTopics.length > 0) {
      base.push({
        id: "khac",
        label: "Chuyên đề khác",
        icon: "📂",
        topics: customTopics,
        count: customTopics.reduce((sum, t) => sum + (topicCountMap.get(t) ?? 0), 0),
      });
    }
    return base;
  }, [topicCountMap]);

  const availableTopics = useMemo(() => {
    if (activeGroup === "all") {
      return Array.from(topicCountMap.entries()).map(([name, count]) => ({ name, count }));
    }
    const grp = groupsWithCounts.find((g) => g.id === activeGroup);
    if (!grp) return [];
    return grp.topics
      .filter((t) => (topicCountMap.get(t) ?? 0) > 0)
      .map((name) => ({ name, count: topicCountMap.get(name) ?? 0 }));
  }, [activeGroup, groupsWithCounts, topicCountMap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const grpTopics =
      activeGroup === "all"
        ? null
        : new Set(groupsWithCounts.find((g) => g.id === activeGroup)?.topics ?? []);

    return videos.filter((v) => {
      if (activeTopic !== "all" && v.topic !== activeTopic) return false;
      if (grpTopics && !grpTopics.has(v.topic)) return false;
      if (durationFilter !== "all") {
        const mins = durationMinutes(extractDuration(v.description));
        if (mins === null) return false;
        if (durationFilter === "short" && mins >= 15) return false;
        if (durationFilter === "medium" && (mins < 15 || mins > 45)) return false;
        if (durationFilter === "long" && mins <= 45) return false;
      }
      if (
        q &&
        !v.title.toLowerCase().includes(q) &&
        !v.description.toLowerCase().includes(q) &&
        !v.topic.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [videos, activeGroup, activeTopic, durationFilter, query, groupsWithCounts]);

  const activeVideo = useMemo(
    () => videos.find((v) => v.id === selectedId) ?? filtered[0] ?? videos[0],
    [videos, filtered, selectedId],
  );

  const sameTopicVideos = useMemo(
    () => (activeVideo ? videos.filter((v) => v.topic === activeVideo.topic) : []),
    [videos, activeVideo],
  );

  const groupedByTopic = useMemo(() => {
    const groups = new Map<string, VideoEntry[]>();
    for (const v of filtered) {
      const t = v.topic || "Chuyên đề khác";
      const list = groups.get(t) ?? [];
      list.push(v);
      groups.set(t, list);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  function playVideo(v: VideoEntry) {
    setSelectedId(v.id);
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function stepVideo(delta: number) {
    const list = filtered.length > 0 ? filtered : videos;
    if (!activeVideo || list.length === 0) return;
    const idx = list.findIndex((v) => v.id === activeVideo.id);
    const nextIdx = (idx + delta + list.length) % list.length;
    setSelectedId(list[nextIdx].id);
  }

  function selectGroup(gid: string) {
    setActiveGroup(gid);
    setActiveTopic("all");
    setVisibleCount(24);
  }

  function selectTopic(topicName: string) {
    setActiveTopic(topicName);
    setVisibleCount(24);
  }

  const isMultiTopicGrid = viewMode === "grid" && activeTopic === "all" && !query.trim() && durationFilter === "all";

  return (
    <div className="space-y-6">
      {/* YouTube Channel Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-green-700 p-6 text-white shadow-md md:flex-row md:items-center">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-red-600 text-2xl font-bold text-white shadow-lg">
            ▶
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
                {videos.length} Video · {topicCountMap.size} Danh sách phát
              </span>
              <span className="text-xs text-green-100">Kênh chính thức: Duy Vo (@quocduy2401)</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">Thư viện Video Bài giảng Thực dưỡng &amp; Chữa lành</h1>
            <p className="mt-1 max-w-2xl text-xs text-green-50/90 md:text-sm">
              Hệ thống hóa toàn bộ <strong>{videos.length} bài giảng video</strong> và <strong>{topicCountMap.size} chuyên đề</strong> từ kênh YouTube <strong>Duy Vo</strong>: Dinh dưỡng &amp; Sức khỏe, Bệnh mãn tính, Livestream giải đáp, Sức khỏe tinh thần và Thiền dưỡng sinh.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <a
            href="https://www.youtube.com/@quocduy2401/videos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-red-700"
          >
            <span>▶</span> Kênh YouTube Duy Vo
          </a>
          <a
            href="https://www.youtube.com/@quocduy2401/playlists"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <span>📂</span> {topicCountMap.size} Danh sách phát
          </a>
        </div>
      </div>

      {/* Main Theater Player + Topic Playlist Queue */}
      {activeVideo && (
        <div
          ref={playerRef}
          className="scroll-mt-20 grid gap-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_350px] lg:p-5"
        >
          <div>
            <div className="overflow-hidden rounded-xl bg-black shadow">
              <iframe
                key={activeVideo.video_id}
                src={`https://www.youtube.com/embed/${activeVideo.video_id}?rel=0`}
                title={activeVideo.title}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectTopic(activeVideo.topic)}
                    className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-brand hover:bg-green-100"
                  >
                    📂 Chuyên đề: {activeVideo.topic}
                  </button>
                  {extractDuration(activeVideo.description) && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      ⏱ {extractDuration(activeVideo.description)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => stepVideo(-1)}
                    className="rounded-lg border px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    ⏮ Video trước
                  </button>
                  <button
                    type="button"
                    onClick={() => stepVideo(1)}
                    className="rounded-lg border px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Video tiếp ⏭
                  </button>
                  <a
                    href={activeVideo.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-red-50 px-3 py-1 font-semibold text-red-600 hover:bg-red-100"
                  >
                    Mở YouTube ↗
                  </a>
                </div>
              </div>
              <h2 className="mt-2.5 text-lg font-bold text-gray-900 md:text-xl">{activeVideo.title}</h2>
              {activeVideo.description && (
                <p className="mt-1 text-xs text-gray-500">{activeVideo.description}</p>
              )}
            </div>
          </div>

          {/* Right: Active Topic Playlist Queue */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-gray-50/70">
            <div className="rounded-t-xl border-b bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-brand">
                  Danh sách phát đang chọn
                </span>
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-brand">
                  {sameTopicVideos.length} video
                </span>
              </div>
              <div className="mt-0.5 font-bold text-gray-900">{activeVideo.topic}</div>
            </div>
            <div className="max-h-[400px] divide-y overflow-y-auto p-2">
              {sameTopicVideos.map((v, idx) => {
                const isPlaying = v.id === activeVideo.id;
                const dur = extractDuration(v.description);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => playVideo(v)}
                    className={`flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition ${
                      isPlaying ? "bg-green-100/90 ring-1 ring-brand/30" : "hover:bg-white"
                    }`}
                  >
                    <span className="mt-1 w-5 shrink-0 text-center text-xs font-bold text-gray-400">
                      {isPlaying ? <span className="text-brand">▶</span> : idx + 1}
                    </span>
                    <div className="relative w-24 shrink-0 overflow-hidden rounded border bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`}
                        alt={v.title}
                        loading="lazy"
                        className="aspect-video w-full object-cover"
                      />
                      {dur && (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 py-0.2 text-[9px] font-mono text-white">
                          {dur}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`line-clamp-2 text-xs font-semibold ${isPlaying ? "text-brand" : "text-gray-800"}`}>
                        {v.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-400">Duy Vo</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Systematic 2-Level Navigation & Filter Bar */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        {/* Level 1: 5 Main Category Group Tabs */}
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            1. Chọn Nhóm Chủ Đề Lớn
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => selectGroup("all")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeGroup === "all"
                  ? "bg-brand text-white shadow-sm"
                  : "border border-gray-200 bg-gray-50 text-gray-700 hover:border-brand/40 hover:bg-green-50/50 hover:text-brand"
              }`}
            >
              <span>🌟</span>
              <span>Tất cả ({videos.length})</span>
            </button>
            {groupsWithCounts.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => selectGroup(g.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  activeGroup === g.id
                    ? "bg-brand text-white shadow-sm"
                    : "border border-gray-200 bg-gray-50 text-gray-700 hover:border-brand/40 hover:bg-green-50/50 hover:text-brand"
                }`}
              >
                <span>{g.icon}</span>
                <span>{g.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    activeGroup === g.id ? "bg-white/20 text-white" : "bg-gray-200/80 text-gray-600"
                  }`}
                >
                  {g.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Level 2: Playlist / Topic Pills within Selected Group */}
        <div className="border-t border-gray-100 pt-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            2. Chọn Danh Sách Phát (Chuyên Đề Chi Tiết)
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => selectTopic("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                activeTopic === "all"
                  ? "bg-brand-dark text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-brand"
              }`}
            >
              Tất cả trong nhóm ({availableTopics.reduce((s, t) => s + t.count, 0)})
            </button>
            {availableTopics.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => selectTopic(t.name)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeTopic === t.name
                    ? "bg-brand text-white shadow-sm font-semibold"
                    : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-brand"
                }`}
              >
                {t.name} <span className="opacity-75">({t.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Search + Duration Filter + 2 View Modes Toggle (Thư viện video vs Danh sách) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[240px]">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisibleCount(24);
                }}
                placeholder="Tìm kiếm trong 318 video (VD: tiểu đường, gạo lứt, mất ngủ, thận...)"
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

            <select
              value={durationFilter}
              onChange={(e) => {
                setDurationFilter(e.target.value);
                setVisibleCount(24);
              }}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:border-brand"
            >
              <option value="all">⏱ Tất cả thời lượng</option>
              <option value="short">Video ngắn (&lt; 15 phút)</option>
              <option value="medium">Bài giảng (15 – 45 phút)</option>
              <option value="long">Livestream / Chuyên sâu (&gt; 45 phút)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Hiển thị <strong className="text-gray-800">{filtered.length}</strong> video
            </span>
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "grid" ? "bg-brand text-white shadow-sm" : "text-gray-700 hover:text-brand"
                }`}
              >
                <span>⊞</span> Thư viện video
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "list" ? "bg-brand text-white shadow-sm" : "text-gray-700 hover:text-brand"
                }`}
              >
                <span>☰</span> Danh sách
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Videos Content Area */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-sm text-gray-500">
          Không tìm thấy video bài giảng nào khớp với bộ lọc hiện tại.
        </div>
      ) : isMultiTopicGrid ? (
        /* MODE 1A: THƯ VIỆN VIDEO GROUPED BY PLAYLIST SECTIONS */
        <div className="space-y-8">
          {groupedByTopic.map(([topicName, items]) => {
            const isExpanded = !!expandedTopics[topicName];
            const shownItems = isExpanded ? items : items.slice(0, 6);
            return (
              <section key={topicName} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-sm text-brand">
                      📂
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">{topicName}</h2>
                      <p className="text-xs text-gray-500">{items.length} video trong danh sách phát này</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {items.length > 6 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTopics((prev) => ({ ...prev, [topicName]: !prev[topicName] }))
                        }
                        className="rounded-lg border border-brand/30 bg-green-50/60 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition"
                      >
                        {isExpanded ? "Thu gọn ↑" : `Xem trọn bộ ${items.length} video ↓`}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => selectTopic(topicName)}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Lọc riêng »
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {shownItems.map((v) => {
                    const isPlaying = activeVideo?.id === v.id;
                    const dur = extractDuration(v.description);
                    return (
                      <div
                        key={v.id}
                        onClick={() => playVideo(v)}
                        className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md ${
                          isPlaying ? "border-brand ring-2 ring-brand/20" : "border-gray-200 hover:border-brand/40"
                        }`}
                      >
                        <div className="relative overflow-hidden bg-black">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`}
                            alt={v.title}
                            loading="lazy"
                            className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105 group-hover:opacity-90"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                            <span className="grid h-12 w-12 place-items-center rounded-full bg-red-600 text-lg text-white shadow-lg">
                              ▶
                            </span>
                          </div>
                          {isPlaying && (
                            <span className="absolute left-2.5 top-2.5 rounded-md bg-brand px-2.5 py-0.5 text-[11px] font-bold text-white shadow">
                              ▶ Đang phát
                            </span>
                          )}
                          {dur && (
                            <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white">
                              {dur}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-3.5">
                          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                            <span className="font-semibold text-brand">{v.topic}</span>
                            <span>Duy Vo</span>
                          </div>
                          <h3 className="line-clamp-2 text-sm font-bold text-gray-900 group-hover:text-brand">
                            {v.title}
                          </h3>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : viewMode === "grid" ? (
        /* MODE 1B: THƯ VIỆN VIDEO FOR SINGLE SELECTED TOPIC OR SEARCH */
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, visibleCount).map((v) => {
              const isPlaying = activeVideo?.id === v.id;
              const dur = extractDuration(v.description);
              return (
                <div
                  key={v.id}
                  onClick={() => playVideo(v)}
                  className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md ${
                    isPlaying ? "border-brand ring-2 ring-brand/20" : "border-gray-200 hover:border-brand/40"
                  }`}
                >
                  <div className="relative overflow-hidden bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`}
                      alt={v.title}
                      loading="lazy"
                      className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105 group-hover:opacity-90"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-red-600 text-lg text-white shadow-lg">
                        ▶
                      </span>
                    </div>
                    {isPlaying && (
                      <span className="absolute left-2.5 top-2.5 rounded-md bg-brand px-2.5 py-0.5 text-[11px] font-bold text-white shadow">
                        ▶ Đang phát
                      </span>
                    )}
                    {dur && (
                      <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white">
                        {dur}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3.5">
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                      <span className="font-semibold text-brand">{v.topic}</span>
                      <span>Duy Vo</span>
                    </div>
                    <h3 className="line-clamp-2 text-sm font-bold text-gray-900 group-hover:text-brand">
                      {v.title}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
          {visibleCount < filtered.length && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + 24)}
                className="rounded-xl border border-brand bg-white px-6 py-2.5 text-sm font-bold text-brand shadow-sm transition hover:bg-brand hover:text-white"
              >
                Xem thêm video ({filtered.length - visibleCount} video còn lại) ↓
              </button>
            </div>
          )}
        </div>
      ) : (
        /* MODE 2: DANH SÁCH (LIST VIEW) */
        <div className="space-y-4">
          <div className="divide-y overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {filtered.slice(0, visibleCount).map((v, idx) => {
              const isPlaying = activeVideo?.id === v.id;
              const dur = extractDuration(v.description);
              return (
                <div
                  key={v.id}
                  onClick={() => playVideo(v)}
                  className={`flex cursor-pointer flex-col gap-4 p-4 transition sm:flex-row sm:items-center ${
                    isPlaying ? "bg-green-50/70" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex shrink-0 items-center gap-3 sm:w-56">
                    <span className="w-7 text-center text-xs font-bold text-gray-400">
                      {isPlaying ? <span className="text-brand">▶</span> : String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="relative flex-1 overflow-hidden rounded-lg border bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`}
                        alt={v.title}
                        loading="lazy"
                        className="aspect-video w-full object-cover"
                      />
                      {dur && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white">
                          {dur}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                        {v.topic}
                      </span>
                      {dur && <span className="text-xs text-gray-500">⏱ {dur}</span>}
                      <span className="text-xs text-gray-400">· Kênh: Duy Vo (@quocduy2401)</span>
                    </div>
                    <h3 className={`text-sm font-bold sm:text-base ${isPlaying ? "text-brand" : "text-gray-900"}`}>
                      {v.title}
                    </h3>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playVideo(v);
                      }}
                      className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                        isPlaying
                          ? "bg-brand text-white"
                          : "bg-brand/10 text-brand hover:bg-brand hover:text-white"
                      }`}
                    >
                      {isPlaying ? "▶ Đang phát" : "▶ Phát ngay"}
                    </button>
                    <a
                      href={v.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:border-red-500 hover:text-red-600"
                      title="Mở trên YouTube"
                    >
                      YouTube ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
          {visibleCount < filtered.length && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + 30)}
                className="rounded-xl border border-brand bg-white px-6 py-2.5 text-sm font-bold text-brand shadow-sm transition hover:bg-brand hover:text-white"
              >
                Xem thêm danh sách ({filtered.length - visibleCount} video còn lại) ↓
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
