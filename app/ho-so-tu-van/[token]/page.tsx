import { notFound } from "next/navigation";
import MedicalDisclaimerBlock from "@/components/MedicalDisclaimerBlock";
import PrintPdfButton from "@/components/PrintPdfButton";
import { computeBmi, getExpertProfileConfig, getQuickConsultByToken, type ExpertProfileConfig } from "@/lib/quick-consult";
import { resolveDisclaimerContent } from "@/lib/medical-disclaimer";
import { getSite } from "@/lib/settings";

export const metadata = {
  title: "Hồ Sơ Tư Vấn Sức Khoẻ Cá Nhân | Thực Dưỡng Phúc Thọ",
};

function parseArr(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseExpertCfg(raw: string): Partial<ExpertProfileConfig> {
  try {
    return JSON.parse(raw) as Partial<ExpertProfileConfig>;
  } catch {
    return {};
  }
}

export default async function PatientConsultReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const autoPrint = sp.print === "1";

  const [row, site, defaultExpertCfg] = await Promise.all([
    getQuickConsultByToken(token),
    getSite(),
    getExpertProfileConfig(),
  ]);
  if (!row) notFound();

  const { bmi, label: bmiLabel } = computeBmi(row.height_cm, row.weight_kg);
  const needs = parseArr(row.needs_json);
  const conditions = parseArr(row.conditions_json);
  const cfg = { ...defaultExpertCfg, ...parseExpertCfg(row.expert_config_json) };
  const disclaimer = resolveDisclaimerContent(cfg);
  const reportHtml = row.expert_report_html || row.article_html;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:p-0">
      <style>{`
        @media print {
          header, footer, nav, .print\\:hidden { display: none !important; }
          body { background: #ffffff !important; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl space-y-4">
        {/* Top Action Bar (hidden when printing to PDF) */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-3 shadow-sm print:hidden">
          <div className="text-xs text-gray-600">
            Hồ sơ tư vấn trực tuyến · <strong>#{row.id}</strong> ({row.share_token})
          </div>
          <PrintPdfButton autoPrint={autoPrint} />
        </div>

        {/* Printable A4 Sheet */}
        <article className="rounded-2xl border bg-white p-6 shadow-sm md:p-10 print:border-0 print:shadow-none print:p-4 space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-brand pb-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                {site.name} · Hồ Sơ Tư Vấn Sức Khoẻ Cá Nhân Hoá
              </div>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                Báo Cáo Chuyên Gia Thực Dưỡng &amp; Lộ Trình Phục Hồi
              </h1>
              <p className="mt-1 text-xs text-gray-500">
                {cfg.expertName ? `Phụ trách chuyên môn: ${cfg.expertName}` : "Cố vấn Thực dưỡng"}
                {cfg.expertTitle ? ` — ${cfg.expertTitle}` : ""}
              </p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div>Mã hồ sơ: <strong>#{row.id}</strong></div>
              <div>Ngày lập: {row.expert_analyzed_at || row.created_at}</div>
              <div>Hotline: <strong>{site.hotline}</strong></div>
            </div>
          </header>

          {/* Patient Vitals & Anthropometrics Card */}
          <section className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="text-[11px] font-semibold uppercase text-gray-500">Bệnh nhân / Khách hàng</div>
              <div className="font-bold text-gray-900">{row.customer_name || "Quý khách"}</div>
              {row.age_sex && <div className="text-xs text-gray-600">{row.age_sex}</div>}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-gray-500">Liên hệ</div>
              <div className="font-semibold text-gray-900">{row.phone || "—"}</div>
              {row.followup_email && <div className="text-xs text-gray-600">{row.followup_email}</div>}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-gray-500">Chiều cao / Cân nặng</div>
              <div className="font-bold text-gray-900">
                {row.height_cm ? `${row.height_cm} cm` : "—"} / {row.weight_kg ? `${row.weight_kg} kg` : "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-gray-500">Chỉ số BMI</div>
              <div className="font-bold text-brand">
                {bmi ? `${bmi} (${bmiLabel})` : "Chưa tính"}
              </div>
            </div>
          </section>

          {(needs.length > 0 || conditions.length > 0) && (
            <section className="rounded-xl border bg-gray-50 p-4 text-xs space-y-1.5">
              {needs.length > 0 && (
                <div>
                  <strong className="text-gray-700">Nhu cầu:</strong> {needs.join(" · ")}
                </div>
              )}
              {conditions.length > 0 && (
                <div>
                  <strong className="text-gray-700">Tình trạng sức khoẻ:</strong> {conditions.join(" · ")}
                </div>
              )}
            </section>
          )}

          {(disclaimer.position === "top" || disclaimer.position === "both") && (
            <MedicalDisclaimerBlock config={cfg} />
          )}

          {/* Report Body */}
          <div
            className="prose-content max-w-none text-sm leading-relaxed md:text-base"
            dangerouslySetInnerHTML={{ __html: reportHtml }}
          />

          {(disclaimer.position === "bottom" || disclaimer.position === "both") && (
            <MedicalDisclaimerBlock config={cfg} />
          )}
        </article>
      </div>
    </div>
  );
}
