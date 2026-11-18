import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { all, one, run } from "./db";

export type YoutubeSyncConfig = {
  enabled: boolean;
  channelHandle: string;
  channelId: string;
  intervalDays: number;
  mode: "auto" | "manual";
  defaultTopic: string;
  lastCheckedAt: string | null;
  lastSummary: string;
};

export type YoutubePendingVideo = {
  video_id: string;
  youtube_url: string;
  title: string;
  topic: string;
  published_at: string;
  status: "pending" | "approved" | "ignored";
  created_at: string;
};

const SETTINGS_KEY = "youtube_sync_config";

export const DEFAULT_YOUTUBE_SYNC_CONFIG: YoutubeSyncConfig = {
  enabled: true,
  channelHandle: "@quocduy2401",
  channelId: "UCcEmchdHUm_ujd-gYwiUgLQ",
  intervalDays: 2,
  mode: "auto",
  defaultTopic: "Video Mới Nhất",
  lastCheckedAt: null,
  lastSummary: "",
};

let pendingTableReady = false;

export async function ensureYoutubePendingTable(): Promise<void> {
  if (pendingTableReady) return;
  await run(`
    CREATE TABLE IF NOT EXISTS youtube_sync_pending (
      video_id TEXT PRIMARY KEY,
      youtube_url TEXT NOT NULL,
      title TEXT NOT NULL,
      topic TEXT NOT NULL DEFAULT 'Video Mới Nhất',
      published_at TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  pendingTableReady = true;
}

export async function getYoutubeSyncConfig(): Promise<YoutubeSyncConfig> {
  try {
    const row = await one<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, SETTINGS_KEY);
    if (!row?.value) return DEFAULT_YOUTUBE_SYNC_CONFIG;
    return { ...DEFAULT_YOUTUBE_SYNC_CONFIG, ...(JSON.parse(row.value) as Partial<YoutubeSyncConfig>) };
  } catch {
    return DEFAULT_YOUTUBE_SYNC_CONFIG;
  }
}

export async function saveYoutubeSyncConfig(patch: Partial<YoutubeSyncConfig>): Promise<YoutubeSyncConfig> {
  const cur = await getYoutubeSyncConfig();
  const next: YoutubeSyncConfig = {
    ...cur,
    ...patch,
    intervalDays: Math.min(90, Math.max(1, Number(patch.intervalDays ?? cur.intervalDays) || 2)),
    mode: patch.mode === "manual" ? "manual" : patch.mode === "auto" ? "auto" : cur.mode,
    channelHandle: (patch.channelHandle ?? cur.channelHandle).trim() || "@quocduy2401",
    defaultTopic: (patch.defaultTopic ?? cur.defaultTopic).trim() || "Video Mới Nhất",
  };
  await run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export async function listPendingYoutubeVideos(): Promise<YoutubePendingVideo[]> {
  await ensureYoutubePendingTable();
  return all<YoutubePendingVideo>(
    `SELECT * FROM youtube_sync_pending WHERE status = 'pending' ORDER BY published_at DESC, created_at DESC LIMIT 100`,
  );
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRssEntries(xml: string): { videoId: string; title: string; publishedAt: string }[] {
  const entries: { videoId: string; title: string; publishedAt: string }[] = [];
  const matches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);
  for (const m of matches) {
    const block = m[1];
    const idM = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleM = block.match(/<title>([^<]+)<\/title>/);
    const pubM = block.match(/<published>([^<]+)<\/published>/);
    if (idM?.[1] && titleM?.[1]) {
      entries.push({
        videoId: idM[1].trim(),
        title: decodeXmlEntities(titleM[1].trim()),
        publishedAt: (pubM?.[1] ?? "").trim(),
      });
    }
  }
  return entries;
}

async function resolveChannelId(handleOrUrl: string, fallbackId: string): Promise<string> {
  const clean = handleOrUrl.trim();
  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(clean)) return clean;
  const targetUrl = clean.startsWith("http")
    ? clean
    : `https://www.youtube.com/${clean.startsWith("@") ? clean : `@${clean}`}/videos`;
  try {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "vi-VN,vi;q=0.9" },
    });
    if (!res.ok) return fallbackId;
    const html = await res.text();
    const m = html.match(/"channelId":"(UC[^"]+)"/) || html.match(/channel_id=(UC[^"&]+)/);
    return m?.[1] || fallbackId;
  } catch {
    return fallbackId;
  }
}

async function fetchChannelPlaylists(handleOrUrl: string): Promise<{ playlistId: string; title: string }[]> {
  const clean = handleOrUrl.trim();
  const baseUrl = clean.startsWith("http")
    ? clean.replace(/\/$/, "")
    : `https://www.youtube.com/${clean.startsWith("@") ? clean : `@${clean}`}`;
  try {
    const res = await fetch(`${baseUrl}/playlists`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "vi-VN,vi;q=0.9" },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const out = new Map<string, string>();
    // Match playlistId + title pairs from ytInitialData
    const regex = /"playlistId":"(PL[^"]+)","title":\{"runs":\[\{"text":"([^"]+)"\}/g;
    for (const m of html.matchAll(regex)) {
      if (m[1] && m[2]) out.set(m[1], decodeXmlEntities(m[2]));
    }
    const regex2 = /"playlistId":"(PL[^"]+)"[\s\S]{0,200}?"title":\{"simpleText":"([^"]+)"\}/g;
    for (const m of html.matchAll(regex2)) {
      if (m[1] && m[2] && !out.has(m[1])) out.set(m[1], decodeXmlEntities(m[2]));
    }
    return [...out.entries()].slice(0, 12).map(([playlistId, title]) => ({ playlistId, title }));
  } catch {
    return [];
  }
}

export async function scanYoutubeChannelAndSync(force = false): Promise<{
  skipped?: boolean;
  discovered: number;
  addedAuto: number;
  queuedManual: number;
  newTopics: string[];
  summary: string;
}> {
  await ensureYoutubePendingTable();
  const cfg = await getYoutubeSyncConfig();

  if (!force) {
    if (!cfg.enabled) {
      return { skipped: true, discovered: 0, addedAuto: 0, queuedManual: 0, newTopics: [], summary: "Tự động quét đang tắt." };
    }
    if (cfg.lastCheckedAt) {
      const elapsedMs = Date.now() - new Date(cfg.lastCheckedAt).getTime();
      if (elapsedMs < cfg.intervalDays * 86400_000) {
        return { skipped: true, discovered: 0, addedAuto: 0, queuedManual: 0, newTopics: [], summary: "Chưa đến chu kỳ quét." };
      }
    }
  }

  const channelId = await resolveChannelId(cfg.channelHandle, cfg.channelId);

  // 1. Fetch channel RSS + discover playlist RSS for category/topic mapping
  const videoTopicMap = new Map<string, string>();
  const discoveredVideos = new Map<string, { videoId: string; title: string; publishedAt: string; topic: string }>();

  const playlists = await fetchChannelPlaylists(cfg.channelHandle);
  const existingTopicsRows = await all<{ topic: string }>(`SELECT DISTINCT topic FROM videos WHERE topic <> ''`);
  const existingTopics = new Set(existingTopicsRows.map((r) => r.topic));
  const newTopics: string[] = [];

  for (const pl of playlists) {
    if (!existingTopics.has(pl.title)) {
      newTopics.push(pl.title);
    }
    try {
      const plRes = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(pl.playlistId)}`);
      if (plRes.ok) {
        const xml = await plRes.text();
        for (const e of parseRssEntries(xml)) {
          if (!videoTopicMap.has(e.videoId)) videoTopicMap.set(e.videoId, pl.title);
          if (!discoveredVideos.has(e.videoId)) {
            discoveredVideos.set(e.videoId, { ...e, topic: pl.title });
          }
        }
      }
    } catch {
      /* ignore individual playlist fetch failure */
    }
  }

  // 2. Fetch main channel RSS feed (latest 15 uploads)
  const chRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`);
  if (chRes.ok) {
    const xml = await chRes.text();
    for (const e of parseRssEntries(xml)) {
      const topic = videoTopicMap.get(e.videoId) || cfg.defaultTopic;
      if (!discoveredVideos.has(e.videoId)) {
        discoveredVideos.set(e.videoId, { ...e, topic });
      }
    }
  }

  // 3. Compare with existing videos & pending queue
  const [existingRows, pendingRows] = await Promise.all([
    all<{ video_id: string }>(`SELECT video_id FROM videos`),
    all<{ video_id: string }>(`SELECT video_id FROM youtube_sync_pending`),
  ]);
  const existingSet = new Set(existingRows.map((r) => r.video_id));
  const pendingSet = new Set(pendingRows.map((r) => r.video_id));

  let addedAuto = 0;
  let queuedManual = 0;

  for (const item of discoveredVideos.values()) {
    if (existingSet.has(item.videoId)) continue;
    const ytUrl = `https://www.youtube.com/watch?v=${item.videoId}`;

    if (cfg.mode === "auto") {
      await run(
        `INSERT INTO videos (youtube_url, video_id, title, topic, description, sort) VALUES (?, ?, ?, ?, ?, 0)`,
        ytUrl,
        item.videoId,
        item.title,
        item.topic,
        `Chuyên đề: ${item.topic} · Tự động cập nhật từ kênh ${cfg.channelHandle}`,
      );
      addedAuto++;
    } else if (!pendingSet.has(item.videoId)) {
      await run(
        `INSERT OR IGNORE INTO youtube_sync_pending (video_id, youtube_url, title, topic, published_at, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
        item.videoId,
        ytUrl,
        item.title,
        item.topic,
        item.publishedAt,
      );
      queuedManual++;
    }
  }

  const summary =
    cfg.mode === "auto"
      ? `Đã quét ${discoveredVideos.size} video: thêm mới ${addedAuto} video${newTopics.length ? `, phát hiện ${newTopics.length} danh mục mới` : ""}.`
      : `Đã quét ${discoveredVideos.size} video: đưa ${queuedManual} video mới vào hàng chờ duyệt.`;

  await saveYoutubeSyncConfig({
    channelId,
    lastCheckedAt: new Date().toISOString(),
    lastSummary: summary,
  });

  return {
    discovered: discoveredVideos.size,
    addedAuto,
    queuedManual,
    newTopics,
    summary,
  };
}

export async function approvePendingYoutubeVideo(videoId: string): Promise<void> {
  await ensureYoutubePendingTable();
  const row = await one<YoutubePendingVideo>(
    `SELECT * FROM youtube_sync_pending WHERE video_id = ?`,
    videoId,
  );
  if (!row) return;
  const exists = await one(`SELECT id FROM videos WHERE video_id = ?`, row.video_id);
  if (!exists) {
    await run(
      `INSERT INTO videos (youtube_url, video_id, title, topic, description, sort) VALUES (?, ?, ?, ?, ?, 0)`,
      row.youtube_url,
      row.video_id,
      row.title,
      row.topic,
      `Chuyên đề: ${row.topic} · Duyệt từ kênh YouTube`,
    );
  }
  await run(`UPDATE youtube_sync_pending SET status = 'approved' WHERE video_id = ?`, videoId);
}

export async function approveAllPendingYoutubeVideos(): Promise<number> {
  const list = await listPendingYoutubeVideos();
  for (const item of list) {
    await approvePendingYoutubeVideo(item.video_id);
  }
  return list.length;
}

export async function ignorePendingYoutubeVideo(videoId: string): Promise<void> {
  await ensureYoutubePendingTable();
  await run(`UPDATE youtube_sync_pending SET status = 'ignored' WHERE video_id = ?`, videoId);
}

/**
 * Non-blocking check triggered on library/admin visits when the configured interval has elapsed.
 */
export async function triggerDueYoutubeSyncInBackground(): Promise<void> {
  try {
    const cfg = await getYoutubeSyncConfig();
    if (!cfg.enabled) return;
    if (cfg.lastCheckedAt) {
      const elapsed = Date.now() - new Date(cfg.lastCheckedAt).getTime();
      if (elapsed < cfg.intervalDays * 86400_000) return;
    }
    const work = scanYoutubeChannelAndSync(false).catch(() => undefined);
    try {
      const ctx = await getCloudflareContext({ async: true });
      if (ctx?.ctx && typeof ctx.ctx.waitUntil === "function") {
        ctx.ctx.waitUntil(work);
        return;
      }
    } catch {
      /* fallback below */
    }
    void work;
  } catch {
    /* never block page render */
  }
}
