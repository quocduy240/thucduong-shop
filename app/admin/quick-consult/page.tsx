import { requireAdmin } from "@/lib/auth";
import { listQuickConsultations } from "@/lib/quick-consult";

export const metadata = { title: "Hồ sơ Tư vấn nhanh AI | Quản trị" };

const FOLLOWUP_LABELS: Record<string, { label: string; cls: string }> = {
  hotline: { label: "📞 Gọi Hotline / Zalo", cls: "bg-blue-100 text-blue-800" },
  advanced_free: { label: "🎁 Nâng cao Miễn phí", cls: "bg-emerald-100 text-emerald-800" },
  advanced_paid: { label: "👑 Chuyên sâu 1-1 (Trả phí)", cls: "bg-amber-100 text-amber-900" },
};

function parseArr(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default async function AdminQuickConsultPage() {
  await requireAdmin();
  const rows = await listQuickConsultations(50);

  return (
    <div className="mx-auto max-w-6xl pb-12 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🌿 Hồ Sơ Tư Vấn Nhanh AI</h1>
          <p className="text-sm text-gray-500">
            Theo dõi nhu cầu, tình trạng sức khoẻ khách hàng đã khai báo và lựa chọn tư vấn tiếp theo (Hotline / Nâng cao).
          </p>
        </div>
        <a
          href="/tu-van-nhanh/"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-brand bg-green-50 px-4 py-2 text-xs font-bold text-brand hover:bg-brand hover:text-white"
        >
          Mở trang Tư vấn nhanh ↗
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm text-gray-400">
          Chưa có khách hàng nào gửi yêu cầu Tư vấn nhanh.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const needs = parseArr(r.needs_json);
            const conditions = parseArr(r.conditions_json);
            const badge = FOLLOWUP_LABELS[r.followup_choice];
            return (
              <details key={r.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-gray-900">
                      #{r.id} · {r.customer_name || "Khách vãng lai"}
                    </span>
                    {r.phone && <span className="ml-2 text-sm font-semibold text-brand">{r.phone}</span>}
                    {r.age_sex && <span className="ml-2 text-xs text-gray-500">({r.age_sex})</span>}
                    <div className="mt-1 text-xs text-gray-500">
                      {r.created_at} · Mô-típ: <code>{r.motif_id}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {badge ? (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                        Chưa chọn bước tiếp
                      </span>
                    )}
                  </div>
                </summary>

                <div className="mt-4 space-y-3 border-t pt-4 text-sm">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-bold text-gray-500">Nhu cầu đã chọn:</div>
                      <p className="text-xs text-gray-800">{needs.join(", ") || "Không có"}</p>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-500">Tình trạng sức khoẻ:</div>
                      <p className="text-xs text-gray-800">{conditions.join(", ") || "Không có"}</p>
                    </div>
                  </div>
                  {r.custom_note && (
                    <div className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-700">
                      <strong>Ghi chú khách hàng:</strong> {r.custom_note}
                    </div>
                  )}
                  {(r.followup_email || r.followup_note) && (
                    <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
                      <strong>Đăng ký nâng cao:</strong>{" "}
                      {r.followup_email ? `Email: ${r.followup_email} · ` : ""}
                      {r.followup_note}
                    </div>
                  )}
                  <div
                    className="prose-content max-w-none rounded-xl border bg-gray-50/50 p-4 text-xs"
                    dangerouslySetInnerHTML={{ __html: r.article_html }}
                  />
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
