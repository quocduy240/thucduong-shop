import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import YoutubeSyncPanel from "@/components/admin/YoutubeSyncPanel";
import { Flash, PageHeader, Pagination, pageParam, strParam, ui } from "@/components/admin/ui";
import { listVideos } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import {
  getYoutubeSyncConfig,
  listPendingYoutubeVideos,
  triggerDueYoutubeSyncInBackground,
} from "@/lib/youtube-sync";
import { addVideoAction, deleteVideoAction, updateVideoAction } from "../actions";

export const metadata = { title: "Video bài giảng | Quản trị" };

const DEFAULT_TOPICS = [
  "Dinh Dưỡng và Sức Khoẻ",
  "Video Mới Nhất",
  "Bệnh Mãn Tính - Đông Tây Y",
  "Tai biến & Đột Quỵ",
  "Bệnh Tiêu Hoá - Ruột",
  "Sức Khoẻ Đường Ruột",
  "Bệnh Táo Bón",
  "Sỏi Thận và Sỏi Mật",
  "Sức Khoẻ Của Thận",
  "Trầm Cảm - Mất Ngủ",
  "Da khoẻ đẹp tự nhiên",
  "Máy sữa hạt Mini Gia Đình",
  "Rút gọn Livestream 2026",
  "Livestream 2026 Duy Vo",
  "Rút gọn Livestream 2025",
  "Livestream 2025 Duy Vo",
  "Livestream Duy Vo",
  "TalkShow Duy Vo",
  "Câu hỏi Livestream hay",
  "Sức Khoẻ Tinh Thần",
  "Thiền sư Viên Thức",
  "Lời Dạy Của Đức Phật",
  "Du Lịch Đó Đây",
];

export default async function VideosAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = strParam(sp.q);
  const topic = strParam(sp.topic);
  const page = pageParam(sp.page);
  await triggerDueYoutubeSyncInBackground();
  const [{ rows, total, topics }, syncConfig, pendingVideos] = await Promise.all([
    listVideos({ q, topic, page }),
    getYoutubeSyncConfig(),
    listPendingYoutubeVideos(),
  ]);

  const allTopicNames = Array.from(new Set([...DEFAULT_TOPICS, ...topics.map((t) => t.topic)]));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Thư viện Video Bài giảng (YouTube @quocduy2401)">
        <Link href="/thu-vien/bai-giang-thuc-duong/" target="_blank" className={ui.secondary}>
          Xem trang Thư viện Video ↗
        </Link>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />

      <YoutubeSyncPanel initialConfig={syncConfig} initialPending={pendingVideos} />

      {/* Quick Add Video Box — only requires pasting YouTube URL */}
      <form action={addVideoAction} className={`${ui.card} mb-6 p-5 border-green-200 bg-green-50/30`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-brand">🎬 Thêm nhanh Video từ YouTube</h2>
            <p className="text-xs text-gray-600">
              Chỉ cần dán link video YouTube (hoặc dán nhiều link, mỗi dòng 1 link) — hệ thống sẽ tự động lấy ảnh thu nhỏ và tiêu đề từ YouTube!
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <a
              href="https://www.youtube.com/@quocduy2401/videos"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-brand/30 bg-white px-2.5 py-1 font-medium text-brand hover:bg-green-50"
            >
              Mở kênh Duy Vo (@quocduy2401) ↗
            </a>
            <a
              href="https://www.youtube.com/@quocduy2401/playlists"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-brand/30 bg-white px-2.5 py-1 font-medium text-brand hover:bg-green-50"
            >
              Mở Danh sách phát ↗
            </a>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className={ui.label}>Link Video YouTube * (có thể dán nhiều link, mỗi dòng 1 link)</label>
            <textarea
              name="youtube_url"
              required
              rows={2}
              placeholder="VD: https://www.youtube.com/watch?v=UQdCQHr4cAg"
              className={ui.input}
            />
          </div>
          <div>
            <label className={ui.label}>Chuyên đề (Danh sách phát)</label>
            <select name="topic" defaultValue={topic || DEFAULT_TOPICS[0]} className={ui.input}>
              {allTopicNames.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              name="custom_topic"
              placeholder="Hoặc nhập tên chuyên đề mới..."
              className={`${ui.input} mt-1.5 text-xs`}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className={ui.label}>Tiêu đề (để trống sẽ tự lấy từ YouTube)</label>
            <input name="title" placeholder="Tự động lấy tiêu đề gốc trên YouTube nếu để trống" className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Mô tả ngắn (tuỳ chọn)</label>
            <input name="description" placeholder="Tóm tắt nội dung bài giảng..." className={ui.input} />
          </div>
          <div className="flex items-end">
            <button className={`${ui.primary} whitespace-nowrap py-2.5`}>+ Thêm vào thư viện</button>
          </div>
        </div>
      </form>

      {/* Filter Bar */}
      <form className="mb-4 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Tìm theo tiêu đề, chuyên đề, mã video..."
          className={`${ui.input} max-w-xs`}
        />
        <select name="topic" defaultValue={topic} className={`${ui.input} max-w-xs`}>
          <option value="">Tất cả chuyên đề ({total})</option>
          {topics.map((t) => (
            <option key={t.topic} value={t.topic}>
              {t.topic} ({t.n})
            </option>
          ))}
        </select>
        <button className={ui.secondary}>Lọc</button>
        {(q || topic) && (
          <Link href="/admin/videos/" className={ui.secondary}>
            Bỏ lọc
          </Link>
        )}
      </form>

      {/* Video List */}
      <div className="space-y-3">
        {rows.map((v) => (
          <div key={v.id} className={`${ui.card} p-4`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <a
                href={v.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block w-full shrink-0 overflow-hidden rounded-lg border md:w-48"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`}
                  alt={v.title}
                  className="aspect-video w-full object-cover"
                />
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-white">
                  {v.video_id}
                </span>
              </a>

              <form action={updateVideoAction} className="grid flex-1 gap-2.5 sm:grid-cols-12">
                <input type="hidden" name="id" value={v.id} />
                <div className="sm:col-span-6">
                  <label className="mb-0.5 block text-xs font-medium text-gray-500">Tiêu đề video</label>
                  <input name="title" defaultValue={v.title} className={ui.input} />
                </div>
                <div className="sm:col-span-4">
                  <label className="mb-0.5 block text-xs font-medium text-gray-500">Chuyên đề (Playlist)</label>
                  <input name="topic" list="video-topics-list" defaultValue={v.topic} className={ui.input} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-0.5 block text-xs font-medium text-gray-500">Thứ tự</label>
                  <input name="sort" type="number" defaultValue={v.sort} className={ui.input} />
                </div>
                <div className="sm:col-span-5">
                  <label className="mb-0.5 block text-xs font-medium text-gray-500">Link YouTube</label>
                  <input name="youtube_url" defaultValue={v.youtube_url} className={`${ui.input} font-mono text-xs`} />
                </div>
                <div className="sm:col-span-5">
                  <label className="mb-0.5 block text-xs font-medium text-gray-500">Mô tả ngắn</label>
                  <input name="description" defaultValue={v.description} className={ui.input} />
                </div>
                <div className="flex items-end justify-end gap-2 sm:col-span-2">
                  <button className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-dark">
                    Lưu
                  </button>
                </div>
              </form>

              <form action={deleteVideoAction} className="self-end md:self-center">
                <input type="hidden" name="id" value={v.id} />
                <ConfirmButton message="Xoá video này khỏi thư viện?" className={ui.danger}>
                  Xoá
                </ConfirmButton>
              </form>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className={`${ui.card} p-8 text-center text-sm text-gray-500`}>
            Chưa có video nào trong chuyên đề này.
          </div>
        )}
      </div>

      <datalist id="video-topics-list">
        {allTopicNames.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <Pagination
        basePath="/admin/videos/"
        page={page}
        total={total}
        params={{ q: q || undefined, topic: topic || undefined }}
      />
    </div>
  );
}
