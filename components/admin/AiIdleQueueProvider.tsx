"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AiTaskKind = "image_edit" | "product_rewrite" | "article_rewrite";

export type AiQueueTaskStatus = "queued" | "running" | "done" | "error";

export type AiQueueTaskView = {
  id: string;
  key: string;
  kind: AiTaskKind;
  title: string;
  status: AiQueueTaskStatus;
  estimatedSeconds: number;
  remainingSeconds: number;
  queuePosition: number;
  error?: string;
  finishedAt?: number;
};

type EnqueueOptions<T> = {
  key: string;
  kind: AiTaskKind;
  title: string;
  run: () => Promise<T>;
};

type InternalTask = AiQueueTaskView & {
  startedAt?: number;
  run: () => Promise<unknown>;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
};

type AiIdleQueueContextValue = {
  tasks: AiQueueTaskView[];
  enqueueAiTask: <T>(opts: EnqueueOptions<T>) => Promise<T>;
  getTaskByKey: (key: string) => AiQueueTaskView | undefined;
  dismissDoneTasks: () => void;
};

const DEFAULT_ETA_BY_KIND: Record<AiTaskKind, number> = {
  image_edit: 16,
  product_rewrite: 10,
  article_rewrite: 12,
};

const STORAGE_ETA_KEY = "td_ai_eta_avg_v1";
const IDLE_COOLDOWN_MS = 900;

function readLearnedEta(kind: AiTaskKind): number {
  try {
    const raw = localStorage.getItem(STORAGE_ETA_KEY);
    if (!raw) return DEFAULT_ETA_BY_KIND[kind];
    const parsed = JSON.parse(raw) as Partial<Record<AiTaskKind, number>>;
    const val = Number(parsed[kind]);
    return Number.isFinite(val) && val >= 3 && val <= 120
      ? Math.round(val)
      : DEFAULT_ETA_BY_KIND[kind];
  } catch {
    return DEFAULT_ETA_BY_KIND[kind];
  }
}

function recordLearnedEta(kind: AiTaskKind, actualSeconds: number) {
  if (!Number.isFinite(actualSeconds) || actualSeconds < 1 || actualSeconds > 180) return;
  try {
    const raw = localStorage.getItem(STORAGE_ETA_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Record<AiTaskKind, number>>) : {};
    const prev = Number(parsed[kind]) || DEFAULT_ETA_BY_KIND[kind];
    parsed[kind] = Math.round(prev * 0.65 + actualSeconds * 0.35);
    localStorage.setItem(STORAGE_ETA_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

export function formatEtaText(seconds: number): string {
  const s = Math.max(1, Math.round(seconds));
  if (s < 60) return `~${s} giây`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `~${m}p ${rem}s` : `~${m} phút`;
}

const AiIdleQueueContext = createContext<AiIdleQueueContextValue>({
  tasks: [],
  enqueueAiTask: ({ run }) => run(),
  getTaskByKey: () => undefined,
  dismissDoneTasks: () => {},
});

export function useAiIdleQueue() {
  return useContext(AiIdleQueueContext);
}

function scheduleOnBrowserIdle(cb: () => void) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as unknown as { requestIdleCallback: (fn: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(
      cb,
      { timeout: IDLE_COOLDOWN_MS + 400 },
    );
  } else {
    setTimeout(cb, IDLE_COOLDOWN_MS);
  }
}

export default function AiIdleQueueProvider({ children }: { children: ReactNode }) {
  const queueRef = useRef<InternalTask[]>([]);
  const processingRef = useRef(false);
  const [tasks, setTasks] = useState<AiQueueTaskView[]>([]);
  const [expanded, setExpanded] = useState(false);

  const syncView = useCallback(() => {
    const now = Date.now();
    // Prune completed tasks older than 25 seconds
    queueRef.current = queueRef.current.filter(
      (t) => t.status === "queued" || t.status === "running" || (t.finishedAt && now - t.finishedAt < 25000),
    );

    let queuedCounter = 0;
    let cumulativeEta = 0;

    const nextView: AiQueueTaskView[] = queueRef.current.map((t) => {
      if (t.status === "running") {
        const elapsed = t.startedAt ? Math.floor((now - t.startedAt) / 1000) : 0;
        const rem = Math.max(2, t.estimatedSeconds - elapsed);
        cumulativeEta += rem;
        return {
          id: t.id,
          key: t.key,
          kind: t.kind,
          title: t.title,
          status: t.status,
          estimatedSeconds: t.estimatedSeconds,
          remainingSeconds: rem,
          queuePosition: 1,
        };
      }
      if (t.status === "queued") {
        queuedCounter++;
        cumulativeEta += t.estimatedSeconds;
        return {
          id: t.id,
          key: t.key,
          kind: t.kind,
          title: t.title,
          status: t.status,
          estimatedSeconds: t.estimatedSeconds,
          remainingSeconds: cumulativeEta,
          queuePosition: queuedCounter + (processingRef.current ? 1 : 0),
        };
      }
      return {
        id: t.id,
        key: t.key,
        kind: t.kind,
        title: t.title,
        status: t.status,
        estimatedSeconds: t.estimatedSeconds,
        remainingSeconds: 0,
        queuePosition: 0,
        error: t.error,
        finishedAt: t.finishedAt,
      };
    });

    setTasks(nextView);
  }, []);

  const pumpQueue = useCallback(() => {
    if (processingRef.current) return;
    const next = queueRef.current.find((t) => t.status === "queued");
    if (!next) {
      syncView();
      return;
    }

    processingRef.current = true;
    next.status = "running";
    next.startedAt = Date.now();
    syncView();

    next
      .run()
      .then((res) => {
        const elapsedSec = next.startedAt ? (Date.now() - next.startedAt) / 1000 : next.estimatedSeconds;
        recordLearnedEta(next.kind, elapsedSec);
        next.status = "done";
        next.finishedAt = Date.now();
        next.resolve(res);
      })
      .catch((err) => {
        next.status = "error";
        next.error = (err as Error)?.message || "Lỗi xử lý AI";
        next.finishedAt = Date.now();
        next.reject(err);
      })
      .finally(() => {
        processingRef.current = false;
        syncView();
        // Idle pacing between sequential tasks to keep server/API load gentle
        setTimeout(() => {
          scheduleOnBrowserIdle(() => {
            pumpQueue();
          });
        }, IDLE_COOLDOWN_MS);
      });
  }, [syncView]);

  // Countdown tick only when there is at least one active/recent task (0 background work when idle)
  useEffect(() => {
    const hasActive = tasks.some((t) => t.status === "queued" || t.status === "running");
    if (!hasActive) return;
    const id = setInterval(syncView, 1000);
    return () => clearInterval(id);
  }, [tasks, syncView]);

  const enqueueAiTask = useCallback(
    <T,>({ key, kind, title, run }: EnqueueOptions<T>): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const est = readLearnedEta(kind);
        const task: InternalTask = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          key,
          kind,
          title,
          status: "queued",
          estimatedSeconds: est,
          remainingSeconds: est,
          queuePosition: queueRef.current.filter((t) => t.status === "queued" || t.status === "running").length + 1,
          run: run as () => Promise<unknown>,
          resolve: resolve as (v: unknown) => void,
          reject,
        };
        queueRef.current.push(task);
        syncView();
        pumpQueue();
      });
    },
    [pumpQueue, syncView],
  );

  const getTaskByKey = useCallback(
    (key: string) => {
      // Return latest matching task for key
      for (let i = tasks.length - 1; i >= 0; i--) {
        if (tasks[i].key === key) return tasks[i];
      }
      return undefined;
    },
    [tasks],
  );

  const dismissDoneTasks = useCallback(() => {
    queueRef.current = queueRef.current.filter(
      (t) => t.status === "queued" || t.status === "running",
    );
    syncView();
  }, [syncView]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status === "running" || t.status === "queued"),
    [tasks],
  );
  const runningTask = tasks.find((t) => t.status === "running");
  const totalEta = activeTasks.reduce((max, t) => Math.max(max, t.remainingSeconds), 0);
  const recentDone = tasks.filter((t) => t.status === "done" || t.status === "error");

  return (
    <AiIdleQueueContext.Provider value={{ tasks, enqueueAiTask, getTaskByKey, dismissDoneTasks }}>
      {children}

      {/* Global High-Contrast Floating Pill for Background AI Idle Worker */}
      {tasks.length > 0 && (
        <div className="fixed bottom-4 left-4 z-[66] max-w-xs space-y-2 print:hidden">
          {expanded && (
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 text-xs shadow-2xl backdrop-blur space-y-2">
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="font-extrabold text-slate-900">
                  🤖 Hàng đợi AI Idle Worker (Tuần tự)
                </span>
                <div className="flex items-center gap-2">
                  {recentDone.length > 0 && (
                    <button
                      type="button"
                      onClick={dismissDoneTasks}
                      className="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Xoá đã xong
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="cursor-pointer text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className={`rounded-xl border px-2.5 py-2 ${
                      t.status === "running"
                        ? "border-amber-300 bg-amber-50 text-amber-950"
                        : t.status === "queued"
                          ? "border-indigo-200 bg-indigo-50/70 text-indigo-950"
                          : t.status === "error"
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-emerald-200 bg-emerald-50 text-emerald-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-bold">
                      <span className="truncate">{t.title}</span>
                      <span className="shrink-0 text-[10px]">
                        {t.status === "running"
                          ? `⚡ Còn ${formatEtaText(t.remainingSeconds)}`
                          : t.status === "queued"
                            ? `⏳ Chờ #${t.queuePosition} (${formatEtaText(t.remainingSeconds)})`
                            : t.status === "error"
                              ? "⚠️ Lỗi"
                              : "✅ Xong"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`flex cursor-pointer items-center gap-2.5 rounded-full px-4 py-2 text-xs font-extrabold text-white shadow-xl ring-2 transition hover:scale-[1.02] ${
              activeTasks.length > 0
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 ring-amber-200"
                : recentDone.some((t) => t.status === "error")
                  ? "bg-gradient-to-r from-red-600 to-rose-600 ring-red-200"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 ring-emerald-200"
            }`}
          >
            {activeTasks.length > 0 ? (
              <>
                <span className="inline-block h-2.5 w-2.5 animate-ping rounded-full bg-white" />
                <span>
                  {runningTask ? runningTask.title : "AI đang chạy ngầm"} ·{" "}
                  {activeTasks.length > 1 ? `(${activeTasks.length} việc) · ` : ""}
                  Còn {formatEtaText(totalEta)}
                </span>
              </>
            ) : (
              <span>
                {recentDone.some((t) => t.status === "error")
                  ? "⚠️ Tác vụ AI gặp lỗi (Bấm xem)"
                  : "✅ AI chạy ngầm đã xong (Bấm xem)"}
              </span>
            )}
          </button>
        </div>
      )}
    </AiIdleQueueContext.Provider>
  );
}
