import { requireAdminPath } from "@/lib/auth";
import { listLabAnalyses } from "@/lib/lab-analysis";
import LabAnalysisStudio from "@/components/admin/LabAnalysisStudio";

export const metadata = { title: "Phân tích Xét nghiệm AI | Quản trị" };

export default async function AdminLabAnalysisPage() {
  await requireAdminPath("/admin/lab-analysis/");
  const items = await listLabAnalyses(30);

  return (
    <div className="mx-auto max-w-6xl pb-12 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🧪 Phân tích Kết quả Xét nghiệm AI</h1>
        <p className="text-sm text-gray-500">
          Tải lên kết quả xét nghiệm (Ảnh/PDF/Chỉ số), xử lý nền khi server rỗi bằng Gemini AI theo kiến thức Y học Hiện đại.
        </p>
      </div>
      <LabAnalysisStudio initialItems={items} />
    </div>
  );
}
