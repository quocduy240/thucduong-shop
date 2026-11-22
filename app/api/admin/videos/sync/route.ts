import { currentAdminForPath } from "@/lib/auth";
import {
  approveAllPendingYoutubeVideos,
  approvePendingYoutubeVideo,
  getYoutubeSyncConfig,
  ignorePendingYoutubeVideo,
  listPendingYoutubeVideos,
  saveYoutubeSyncConfig,
  scanYoutubeChannelAndSync,
} from "@/lib/youtube-sync";

export async function GET() {
  const admin = await currentAdminForPath("/admin/videos/");
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [config, pending] = await Promise.all([
    getYoutubeSyncConfig(),
    listPendingYoutubeVideos(),
  ]);
  return Response.json({ ok: true, config, pending });
}

export async function POST(req: Request) {
  const admin = await currentAdminForPath("/admin/videos/");
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as {
      action?: "save_config" | "scan_now" | "approve" | "approve_all" | "ignore";
      enabled?: boolean;
      channelHandle?: string;
      intervalDays?: number;
      mode?: "auto" | "manual";
      defaultTopic?: string;
      videoId?: string;
    };

    if (body.action === "save_config") {
      const config = await saveYoutubeSyncConfig({
        enabled: body.enabled,
        channelHandle: body.channelHandle,
        intervalDays: body.intervalDays,
        mode: body.mode,
        defaultTopic: body.defaultTopic,
      });
      return Response.json({ ok: true, config });
    }

    if (body.action === "scan_now") {
      const result = await scanYoutubeChannelAndSync(true);
      const [config, pending] = await Promise.all([
        getYoutubeSyncConfig(),
        listPendingYoutubeVideos(),
      ]);
      return Response.json({ ok: true, result, config, pending });
    }

    if (body.action === "approve" && body.videoId) {
      await approvePendingYoutubeVideo(body.videoId);
      const pending = await listPendingYoutubeVideos();
      return Response.json({ ok: true, pending });
    }

    if (body.action === "approve_all") {
      const count = await approveAllPendingYoutubeVideos();
      const pending = await listPendingYoutubeVideos();
      return Response.json({ ok: true, approvedCount: count, pending });
    }

    if (body.action === "ignore" && body.videoId) {
      await ignorePendingYoutubeVideo(body.videoId);
      const pending = await listPendingYoutubeVideos();
      return Response.json({ ok: true, pending });
    }

    return Response.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (e) {
    return Response.json({ error: (e as Error).message || "Lỗi đồng bộ YouTube." }, { status: 500 });
  }
}
