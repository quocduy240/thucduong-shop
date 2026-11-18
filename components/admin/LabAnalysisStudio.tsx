"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LabAnalysisRow } from "@/lib/lab-analysis";

const STATUS_BADGE: Record<LabAnalysisRow["status"], { label: string; cls: string }> = {
  pending: { label: "⏳ Chờ server rỗi", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  processing: { label: "⚙️ AI đang phân tích...", cls: "bg-blue-100 text-blue-800 border-blue-300 animate-pulse" },
  done: { label: "✅ Hoàn tất", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  error: { label: "❌ Lỗi phân tích", cls: "bg-red-100 text-red-700 border-red-300" },
};

export default function LabAnalysisStudio({ initialItems }: { initialItems: LabAnalysisRow[] }) {
  const [items, setItems] = useState<LabAnalysisRow[]>(initialItems);
  const [selectedId, setSelectedId] = useState<number | null>(initialItems[0]?.id ?? null);

  const [patientName, setPatientName] = useState("");
  const [patientAgeSex, setPatientAgeSex] = useState("");
  const [symptomsNote, setSymptomsNote] = useState("");
  const [rawText, setRawText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busyMode, setBusyMode] = useState<"idle" | "now" | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [listeningField, setListeningField] = useState<"symptoms" | "raw" | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  const selectedItem = items.find((it) => it.id === selectedId) ?? items[0] ?? null;

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/lab-analysis", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items?: LabAnalysisRow[] };
      if (Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch {
      /* ignore polling error */
    }
  }, []);

  // Poll every 4s while there are pending/processing jobs, and trigger idle worker when browser is idle
  useEffect(() => {
    const hasPending = items.some((it) => it.status === "pending");
    const hasActive = items.some((it) => it.status === "pending" || it.status === "processing");
    if (!hasActive) return;

    const timer = setInterval(() => {
      void refreshList();
    }, 4000);

    let idleHandle: number | undefined;
    if (hasPending) {
      const runIdleKick = () => {
        void fetch("/api/admin/lab-analysis/idle-worker", { method: "POST" }).then(() => refreshList());
      };
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(runIdleKick, { timeout: 2500 });
      } else {
        idleHandle = setTimeout(runIdleKick, 2000) as unknown as number;
      }
    }

    return () => {
      clearInterval(timer);
      if (idleHandle !== undefined) {
        if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleHandle);
        } else {
          clearTimeout(idleHandle);
        }
      }
    };
  }, [items, refreshList]);

  function toggleVoiceForField(field: "symptoms" | "raw") {
    if (listeningField) {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
      setListeningField(null);
      return;
    }

    setErr("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setErr("Trình duyệt chưa hỗ trợ nhập giọng nói. Vui lòng dùng Chrome hoặc Edge.");
      return;
    }

    const rec = new SpeechRec();
    rec.lang = "vi-VN";
    rec.continuous = true;
    rec.interimResults = false;

    rec.onstart = () => setListeningField(field);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) chunk += `${event.results[i][0]?.transcript ?? ""} `;
      }
      const clean = chunk.trim();
      if (!clean) return;
      if (field === "symptoms") {
        setSymptomsNote((prev) => (prev ? `${prev.trim()} ${clean}` : clean));
      } else {
        setRawText((prev) => (prev ? `${prev.trim()}\n${clean}` : clean));
      }
    };
    rec.onerror = () => setListeningField(null);
    rec.onend = () => setListeningField(null);

    recRef.current = rec;
    rec.start();
  }

  async function submitLab(mode: "idle" | "now") {
    setErr("");
    setMsg("");
    if (!selectedFile && !rawText.trim()) {
      setErr("Vui lòng chọn tệp kết quả xét nghiệm (Ảnh/PDF) hoặc nhập các chỉ số xét nghiệm.");
      return;
    }

    setBusyMode(mode);
    try {
      const fd = new FormData();
      fd.append("patient_name", patientName);
      fd.append("patient_age_sex", patientAgeSex);
      fd.append("symptoms_note", symptomsNote);
      fd.append("raw_text", rawText);
      fd.append("mode", mode);
      if (selectedFile) fd.append("file", selectedFile);

      const res = await fetch("/api/admin/lab-analysis", { method: "POST", body: fd });
      const data = (await res.json()) as {
        ok?: boolean;
        id?: number;
        error?: string;
        message?: string;
        status?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Không thể gửi kết quả xét nghiệm.");
      }

      setPatientName("");
      setPatientAgeSex("");
      setSymptomsNote("");
      setRawText("");
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";

      if (data.id) setSelectedId(data.id);
      setMsg(
        mode === "now"
          ? `✅ Đã hoàn tất phân tích hồ sơ #${data.id} bằng AI Gemini!`
          : `⏳ ${data.message ?? "Đã đưa vào hàng đợi chạy khi server rỗi."}`,
      );
      await refreshList();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyMode(null);
    }
  }

  async function retryJob(id: number) {
    setErr("");
    setMsg(`⚙️ Đang chạy phân tích AI Gemini cho hồ sơ #${id}...`);
    await fetch(`/api/admin/lab-analysis/idle-worker?id=${id}`, { method: "POST" });
    await refreshList();
    setMsg(`✅ Đã xử lý xong hồ sơ #${id}.`);
  }

  async function handleDelete(id: number) {
    if (!confirm(`Xoá hồ sơ phân tích #${id}?`)) return;
    await fetch(`/api/admin/lab-analysis?id=${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((x) => x.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function copyReportHtml(html: string) {
    try {
      await navigator.clipboard.writeText(html);
      setMsg("📋 Đã sao chép mã HTML báo cáo! Bạn có thể dán trực tiếp vào Bài viết hoặc Block tư vấn.");
    } catch {
      setErr("Không thể tự sao chép vào clipboard.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Upload & Queue Form */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              🧪 Tải lên Kết quả Xét nghiệm &amp; Phân tích AI Gemini (Y học Hiện đại)
            </h2>
            <p className="text-xs text-gray-500">
              Hỗ trợ ảnh chụp phiếu xét nghiệm (JPG, PNG, WEBP), file PDF hoặc nhập/đọc chỉ số. Cơ chế hàng đợi tự động chạy nền khi server rỗi.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
            Evidence-Based Medicine · Gemini 2.5 Flash
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Họ tên / Mã hồ sơ (tuỳ chọn)</label>
                <input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="VD: Cô Lan — HS012"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Tuổi / Giới tính</label>
                <input
                  value={patientAgeSex}
                  onChange={(e) => setPatientAgeSex(e.target.value)}
                  placeholder="VD: 54 tuổi, Nữ"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">Triệu chứng / Câu hỏi lâm sàng</label>
                <button
                  type="button"
                  onClick={() => toggleVoiceForField("symptoms")}
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold cursor-pointer ${
                    listeningField === "symptoms"
                      ? "animate-pulse bg-red-600 text-white"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  {listeningField === "symptoms" ? "🔴 Đang nghe..." : "🎤 Đọc giọng nói"}
                </button>
              </div>
              <textarea
                rows={2}
                value={symptomsNote}
                onChange={(e) => setSymptomsNote(e.target.value)}
                placeholder="VD: Mệt mỏi buổi sáng, hay khát nước, tiền sử đường huyết cao..."
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                📎 Tệp kết quả xét nghiệm (Ảnh JPG, PNG, WEBP, PDF hoặc TXT — tối đa 6MB)
              </label>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 p-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-dark"
                />
                {selectedFile && (
                  <span className="text-xs font-semibold text-emerald-800">
                    ✓ {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">
                Hoặc dán / đọc trực tiếp chỉ số xét nghiệm (Text)
              </label>
              <button
                type="button"
                onClick={() => toggleVoiceForField("raw")}
                className={`rounded px-2 py-0.5 text-[11px] font-semibold cursor-pointer ${
                  listeningField === "raw"
                    ? "animate-pulse bg-red-600 text-white"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                {listeningField === "raw" ? "🔴 Đang nghe..." : "🎤 Đọc chỉ số"}
              </button>
            </div>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`VD:\nGlucose đói: 6.9 mmol/L\nHbA1c: 6.7%\nAST: 42 U/L, ALT: 56 U/L\nLDL-C: 4.1 mmol/L, Triglyceride: 2.6 mmol/L`}
              className="flex-1 rounded-lg border px-3 py-2 font-mono text-xs leading-relaxed"
            />
          </div>
        </div>

        {(msg || err) && (
          <div
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              err ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}
          >
            {err || msg}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            disabled={busyMode !== null}
            onClick={() => submitLab("idle")}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
          >
            <span>⏳</span>
            <span>{busyMode === "idle" ? "Đang đưa vào hàng đợi..." : "Đưa vào hàng đợi (Chạy khi server rỗi)"}</span>
          </button>
          <button
            type="button"
            disabled={busyMode !== null}
            onClick={() => submitLab("now")}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-brand bg-white px-4 py-2 text-sm font-bold text-brand hover:bg-green-50 disabled:opacity-50 cursor-pointer"
          >
            <span>⚡</span>
            <span>{busyMode === "now" ? "AI Gemini đang phân tích..." : "Phân tích ngay lập tức"}</span>
          </button>
        </div>
      </div>

      {/* Bottom Split: Queue List & Medical Report Viewer */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-bold text-gray-900">📋 Hàng đợi &amp; Hồ sơ ({items.length})</h3>
            <button
              type="button"
              onClick={() => refreshList()}
              className="rounded border px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              🔄 Làm mới
            </button>
          </div>

          {items.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">
              Chưa có kết quả xét nghiệm nào. Hãy tải lên phiếu xét nghiệm ở trên.
            </p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {items.map((it) => {
                const badge = STATUS_BADGE[it.status];
                const active = selectedItem?.id === it.id;
                return (
                  <div
                    key={it.id}
                    onClick={() => setSelectedId(it.id)}
                    className={`cursor-pointer rounded-xl border p-3 transition ${
                      active ? "border-brand bg-green-50/60 ring-1 ring-brand/30" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-gray-900">
                          #{it.id} · {it.patient_name || it.file_name || "Hồ sơ xét nghiệm"}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {it.patient_age_sex ? `${it.patient_age_sex} · ` : ""}
                          {it.created_at}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    {it.summary && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-gray-700">{it.summary}</p>
                    )}
                    {it.error_message && (
                      <p className="mt-1.5 text-xs text-red-600">{it.error_message}</p>
                    )}

                    <div className="mt-2 flex items-center justify-end gap-2">
                      {(it.status === "pending" || it.status === "error") && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void retryJob(it.id);
                          }}
                          className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          ⚡ Chạy ngay
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(it.id);
                        }}
                        className="rounded px-2 py-0.5 text-[11px] text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 rounded-2xl border bg-white p-5 shadow-sm">
          {!selectedItem ? (
            <div className="grid min-h-[320px] place-items-center text-center text-sm text-gray-400">
              Chọn một hồ sơ ở danh sách bên trái để xem báo cáo phân tích y khoa.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    🩺 Báo cáo Phân tích Y học Hiện đại — #{selectedItem.id}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedItem.patient_name || "Khách hàng"}
                    {selectedItem.patient_age_sex ? ` (${selectedItem.patient_age_sex})` : ""}
                    {selectedItem.file_name ? ` · Tệp: ${selectedItem.file_name}` : ""}
                  </p>
                </div>
                {selectedItem.analysis_html && (
                  <button
                    type="button"
                    onClick={() => copyReportHtml(selectedItem.analysis_html)}
                    className="rounded-lg border border-brand bg-green-50 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-white cursor-pointer"
                  >
                    📋 Sao chép HTML báo cáo
                  </button>
                )}
              </div>

              {selectedItem.status === "pending" || selectedItem.status === "processing" ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center space-y-2">
                  <div className="text-2xl">⏳</div>
                  <div className="text-sm font-bold text-amber-900">
                    {selectedItem.status === "processing"
                      ? "AI Gemini đang đọc chỉ số & lập báo cáo y khoa..."
                      : "Hồ sơ đang chờ server rỗi để tự động phân tích..."}
                  </div>
                  <p className="text-xs text-amber-700">
                    Trang sẽ tự động cập nhật khi có kết quả (hoặc bạn có thể bấm ⚡ Chạy ngay).
                  </p>
                </div>
              ) : selectedItem.status === "error" ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <strong>Không thể phân tích:</strong> {selectedItem.error_message}
                </div>
              ) : (
                <div
                  className="prose-content max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedItem.analysis_html }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
