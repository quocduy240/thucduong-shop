"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { YoutubePendingVideo, YoutubeSyncConfig } from "@/lib/youtube-sync";

export default function YoutubeSyncPanel({
  initialConfig,
  initialPending,
}: {
  initialConfig: YoutubeSyncConfig;
  initialPending: YoutubePendingVideo[];
}) {
  const router = useRouter();
  const [cfg, setCfg] = useState<YoutubeSyncConfig>(initialConfig);
  const [pending, setPending] = useState<YoutubePendingVideo[]>(initialPending);
  const [expanded, setExpanded] = useState(initialPending.length > 0);
  const [busy, setBusy] = useState<"save" | "scan" | "approve" | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function saveConfig() {
    setBusy("save");
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/videos/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          enabled: cfg.enabled,
          channelHandle: cfg.channelHandle,
          intervalDays: cfg.intervalDays,
          mode: cfg.mode,
          defaultTopic: cfg.defaultTopic,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; config?: YoutubeSyncConfig; error?: string };
      if (!res.ok || !data.ok || !data.config) throw new Error(data.error || "Lưu thất bại.");
      setCfg(data.config);
      setMsg(
        `✓ Đã lưu cấu hình: Tự động quét kênh ${data.config.channelHandle} mỗi ${data.config.intervalDays} ngày (${
          data.config.mode === "auto" ? "Tự động thêm vào thư viện" : "Chờ duyệt thủ công"
        }).`,
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function scanNow() {
    setBusy("scan");
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/videos/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan_now" }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        config?: YoutubeSyncConfig;
        pending?: YoutubePendingVideo[];
        result?: { summary?: string };
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "Quét kênh thất bại.");
      if (data.config) setCfg(data.config);
      if (data.pending) setPending(data.pending);
      setMsg(`🔄 ${data.result?.summary || "Đã quét kênh thành công!"}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handlePendingAction(action: "approve" | "approve_all" | "ignore", videoId?: string) {
    setBusy("approve");
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/videos/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, videoId }),
      });
      const data = (await res.json()) as { ok?: boolean; pending?: YoutubePendingVideo[]; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Thao tác thất bại.");
      if (data.pending) setPending(data.pending);
      setMsg(
        action === "approve_all"
          ? "✓ Đã duyệt toàn bộ video mới vào Thư viện!"
          : action === "approve"
            ? "✓ Đã duyệt video vào Thư viện!"
            : "Đã bỏ qua video.",
      );
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm space-y-4">
      <div className={`flex flex-wrap items-center justify-between gap-2 ${expanded ? "border-b pb-3" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900">
            🔄 Đồng bộ YouTube ({cfg.channelHandle})
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              cfg.enabled ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
            }`}
          >
            {cfg.enabled ? `Tự động · mỗi ${cfg.intervalDays} ngày` : "Đang tắt"}
          </span>
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              ⏳ {pending.length} video chờ duyệt
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void scanNow()}
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
          >
            {busy === "scan" ? "Đang quét..." : "🔍 Quét kênh ngay"}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-brand hover:text-brand cursor-pointer"
          >
            {expanded ? "Thu gọn ▴" : "⚙️ Cấu hình ▾"}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              Hệ thống tự động kiểm tra kênh định kỳ theo số ngày cấu hình để phát hiện video mới &amp; danh mục phát mới.
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
              <input
                type="checkbox"
                checked={cfg.enabled}
                onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
                className="accent-brand"
              />
              <span>{cfg.enabled ? "Đang bật tự động quét" : "Đang tắt"}</span>
            </label>
          </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">Kênh YouTube (@handle hoặc URL)</label>
          <input
            value={cfg.channelHandle}
            onChange={(e) => setCfg({ ...cfg, channelHandle: e.target.value })}
            placeholder="@quocduy2401"
            className="w-full rounded-lg border px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">Chu kỳ kiểm tra (ngày / lần)</label>
          <div className="flex gap-1.5">
            <input
              type="number"
              min={1}
              max={90}
              value={cfg.intervalDays}
              onChange={(e) => setCfg({ ...cfg, intervalDays: Math.max(1, Number(e.target.value) || 2) })}
              className="w-20 rounded-lg border px-2.5 py-2 text-xs font-bold"
            />
            <select
              value={[1, 2, 3, 5, 7, 14, 30].includes(cfg.intervalDays) ? String(cfg.intervalDays) : "custom"}
              onChange={(e) => {
                if (e.target.value !== "custom") {
                  setCfg({ ...cfg, intervalDays: Number(e.target.value) });
                }
              }}
              className="flex-1 rounded-lg border px-2 py-2 text-xs"
            >
              <option value="1">Mỗi 1 ngày</option>
              <option value="2">Mỗi 2 ngày (Mặc định)</option>
              <option value="3">Mỗi 3 ngày</option>
              <option value="5">Mỗi 5 ngày</option>
              <option value="7">Mỗi 7 ngày (1 tuần)</option>
              <option value="14">Mỗi 14 ngày</option>
              <option value="30">Mỗi 30 ngày</option>
              <option value="custom">Tuỳ chỉnh</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">Chế độ cập nhật video mới</label>
          <select
            value={cfg.mode}
            onChange={(e) => setCfg({ ...cfg, mode: e.target.value as "auto" | "manual" })}
            className="w-full rounded-lg border px-3 py-2 text-xs font-semibold"
          >
            <option value="auto">🤖 Tự động thêm ngay vào Thư viện</option>
            <option value="manual">✋ Chờ duyệt thủ công (Manual)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">Danh mục mặc định (nếu chưa có playlist)</label>
          <input
            value={cfg.defaultTopic}
            onChange={(e) => setCfg({ ...cfg, defaultTopic: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="text-[11px] text-gray-500">
          {cfg.lastCheckedAt ? (
            <>
              Lần quét gần nhất: <strong>{cfg.lastCheckedAt.slice(0, 16).replace("T", " ")}</strong>
              {cfg.lastSummary ? ` · ${cfg.lastSummary}` : ""}
            </>
          ) : (
            "Chưa chạy lần quét tự động nào."
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={saveConfig}
            className="rounded-xl border border-brand bg-green-50 px-4 py-2 text-xs font-bold text-brand hover:bg-brand hover:text-white disabled:opacity-50 cursor-pointer"
          >
            {busy === "save" ? "Đang lưu..." : "💾 Lưu cấu hình quét"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={scanNow}
            className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
          >
            {busy === "scan" ? "⏳ Đang quét kênh YouTube..." : "🔄 Quét kênh ngay bây giờ"}
          </button>
        </div>
      </div>

      {(msg || err) && (
        <div
          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
            err ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || msg}
        </div>
      )}

      {/* Pending Manual Approval Queue */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-amber-950">
              📥 Video mới phát hiện đang chờ duyệt ({pending.length})
            </h3>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => handlePendingAction("approve_all")}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
            >
              ✓ Chấp nhận tất cả ({pending.length})
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {pending.map((p) => (
              <div
                key={p.video_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-2.5 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${p.video_id}/mqdefault.jpg`}
                    alt={p.title}
                    className="h-12 w-20 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-bold text-gray-900">{p.title}</div>
                    <div className="text-[11px] text-emerald-700">
                      Danh mục: <strong>{p.topic}</strong>
                      {p.published_at ? ` · ${p.published_at.slice(0, 10)}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => handlePendingAction("approve", p.video_id)}
                    className="rounded-lg bg-brand px-2.5 py-1 font-bold text-white hover:bg-brand-dark cursor-pointer"
                  >
                    ✓ Chấp nhận
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => handlePendingAction("ignore", p.video_id)}
                    className="rounded-lg border px-2.5 py-1 text-gray-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  >
                    ✕ Bỏ qua
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
