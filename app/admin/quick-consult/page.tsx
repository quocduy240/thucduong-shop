import AdminQuickConsultClient from "@/components/admin/AdminQuickConsultClient";
import { requireAdmin } from "@/lib/auth";
import { getExpertProfileConfig, listQuickConsultations } from "@/lib/quick-consult";

export const metadata = { title: "Hồ sơ Tư vấn nhanh AI | Quản trị" };

export default async function AdminQuickConsultPage() {
  await requireAdmin();
  const [rows, cfg] = await Promise.all([
    listQuickConsultations(50),
    getExpertProfileConfig(),
  ]);

  return (
    <div className="mx-auto max-w-6xl pb-12 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🌿 Hồ Sơ Bệnh Nhân &amp; Tư Vấn Chuyên Gia AI</h1>
          <p className="text-sm text-gray-500">
            Theo dõi chiều cao, cân nặng, BMI, phân tích AI theo cấu hình chuyên gia và xuất hồ sơ PDF / Email / Link cho bệnh nhân.
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

      <AdminQuickConsultClient initialRows={rows} initialConfig={cfg} />
    </div>
  );
}
