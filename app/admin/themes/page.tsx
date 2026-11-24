import AdminThemeStudio from "@/components/admin/AdminThemeStudio";
import { requireAdminPath } from "@/lib/auth";
import { getThemeSettings } from "@/lib/theme-settings";

export const metadata = { title: "Giao diện & Cỡ chữ | Quản trị" };

export default async function AdminThemesPage() {
  await requireAdminPath("/admin/themes/");
  const config = await getThemeSettings();

  return (
    <div className="mx-auto max-w-6xl pb-12 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🎨 Tuỳ Biến Giao Diện &amp; Cỡ Chữ Frontend</h1>
        <p className="text-sm text-gray-500">
          Cấu hình đồng bộ cỡ chữ, độ giãn dòng và bảng màu cho từng đối tượng (Chuẩn, Người lớn tuổi, Trẻ trung hiện đại) cùng giao diện mặc định cho lần truy cập đầu tiên.
        </p>
      </div>
      <AdminThemeStudio initialConfig={config} />
    </div>
  );
}
