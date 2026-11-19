import FrontendEditButton from "@/components/FrontendEditButton";
import QuickConsultClient from "@/components/QuickConsultClient";
import { getExpertProfileConfig } from "@/lib/quick-consult";
import { getSite, getWidgetSettings } from "@/lib/settings";

export const metadata = {
  title: "Tư Vấn Nhanh Thực Dưỡng AI | Thực Dưỡng Phúc Thọ",
  description:
    "Khai báo nhu cầu và tình trạng sức khoẻ để nhận bài tư vấn chuyên gia thực dưỡng AI, bộ sản phẩm, video và tài liệu phù hợp.",
};

export default async function QuickConsultPage() {
  const [site, widget, expertCfg] = await Promise.all([
    getSite(),
    getWidgetSettings(),
    getExpertProfileConfig(),
  ]);
  const hotline = [widget.widget_hotline, widget.widget_hotline_2].filter(Boolean).join(" - ") || site.hotline || "0767.518.592 - 0858.816.070";
  const zaloUrl = widget.widget_zalo || "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-brand to-emerald-700 p-6 text-white shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            🌿 Trợ Lý Chuyên Gia Thực Dưỡng AI
          </span>
          <FrontendEditButton
            resource="quick_consult"
            href="/admin/quick-consult/"
            label="Quản lý Tư vấn AI"
            variant="pill"
          />
        </div>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">
          Tư Vấn Nhanh Thực Dưỡng Cá Nhân Hoá
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-emerald-50">
          Chỉ cần chọn nhu cầu, tình trạng sức khoẻ và mô hình chuyên gia phù hợp — hệ thống sẽ phân tích toàn diện và gợi ý bài viết tư vấn, video, tài liệu cùng bộ sản phẩm (Thức ăn, Trợ phương, Dược thảo) dành riêng cho bạn.
        </p>
      </div>

      <QuickConsultClient
        hotline={hotline}
        zaloUrl={zaloUrl}
        disclaimerConfig={{
          disclaimerStyle: expertCfg.disclaimerStyle,
          disclaimerPosition: expertCfg.disclaimerPosition,
          disclaimerCustomText: expertCfg.disclaimerCustomText,
        }}
      />
    </div>
  );
}
